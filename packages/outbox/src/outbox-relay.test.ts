import { describe, expect, it, mock } from "bun:test";
import {
  type EventHandlerFn,
  type IEventDispatcher,
  InMemoryEventDispatcher,
  Option,
  Result,
} from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import type {
  DrizzleOutboxRepository,
  OutboxRecord,
} from "./drizzle-outbox.repository";
import { OutboxRelay, type OutboxRelayOptions } from "./outbox-relay";

const ROUTES = { handled: ["clip.rendered"], ignored: [] };

async function claimOf(options: OutboxRelayOptions): Promise<unknown> {
  const repository = mockPort<DrizzleOutboxRepository>();
  repository.claim.mockResolvedValue(Result.ok([]));
  const relay = new OutboxRelay(
    repository,
    mockPort<IEventDispatcher>(),
    ROUTES,
    options,
  );

  await relay.drainOnce();

  return repository.claim.mock.calls[0]?.[0];
}

describe("OutboxRelay claim size", () => {
  it.each([
    [{}, 50],
    [{ lanes: { concurrency: 8, handlerBudgetSeconds: 25 } }, 32],
    [{ lanes: { concurrency: 4, handlerBudgetSeconds: 25 } }, 16],
    [{ lanes: { concurrency: 1, handlerBudgetSeconds: 25 } }, 4],
    [
      { lanes: { concurrency: 8, handlerBudgetSeconds: 25 }, batchSize: 20 },
      20,
    ],
    [
      {
        lanes: { concurrency: 8, handlerBudgetSeconds: 25 },
        leaseSeconds: 240,
      },
      50,
    ],
  ])(
    "a relay with %o claims at most %i events, so its lanes settle a batch within the lease",
    async (options, limit) => {
      expect(await claimOf(options)).toMatchObject({ limit });
    },
  );
});

const DELIVERED_AT = "2026-10-26T09:00:00.000Z";

function recordOf(
  deliveries: OutboxRecord["deliveries"],
  state: Partial<Pick<OutboxRecord, "attempts" | "deadAt">> = {},
): OutboxRecord {
  return {
    id: "evt-1",
    eventType: "clip.rendered",
    aggregateId: "clip-1",
    payload: {},
    occurredAt: new Date("2026-10-26T08:00:00Z"),
    attempts: 2,
    deadAt: Option.none(),
    deliveries,
    ...state,
  };
}

function givenRelay(
  record: OutboxRecord,
  handlers: Record<string, EventHandlerFn>,
) {
  const repository = mockPort<DrizzleOutboxRepository>();
  repository.claim.mockResolvedValue(Result.ok([record]));
  repository.markDelivered.mockResolvedValue(Result.ok());
  repository.markFailed.mockResolvedValue(Result.ok());
  const dispatcher = new InMemoryEventDispatcher();
  for (const [name, handler] of Object.entries(handlers))
    dispatcher.subscribe("clip.rendered", name, handler);

  return { repository, relay: new OutboxRelay(repository, dispatcher, ROUTES) };
}

describe("OutboxRelay delivery per handler", () => {
  it("retries only the handler that failed and names it in the last error", async () => {
    const audit = mock<EventHandlerFn>(() => Result.ok());
    const email = mock<EventHandlerFn>(() => Result.fail("mail down"));
    const { repository, relay } = givenRelay(
      recordOf({ "audit-log": DELIVERED_AT }),
      { "audit-log": audit, "clip-email": email },
    );

    const outcome = await relay.drainOnce();

    expect(outcome).toEqual({ dispatched: 0, ignored: 0, failed: 1 });
    expect(audit).not.toHaveBeenCalled();
    expect(email).toHaveBeenCalledTimes(1);
    expect(repository.markFailed.mock.calls[0]?.[1]).toMatchObject({
      lastError: "clip-email: mail down",
      deliveries: {},
    });
  });

  it("records the handlers that succeeded next to the failure, so the next retry skips them", async () => {
    const { repository, relay } = givenRelay(recordOf({}), {
      "audit-log": () => Result.ok(),
      "clip-email": () => Result.fail("mail down"),
    });

    await relay.drainOnce();

    expect(
      Object.keys(repository.markFailed.mock.calls[0]?.[1]?.deliveries ?? {}),
    ).toEqual(["audit-log"]);
  });

  it("marks delivered without running anything an event whose subscribed handlers all delivered, ignoring the entry of a renamed handler", async () => {
    const audit = mock<EventHandlerFn>(() => Result.ok());
    const { repository, relay } = givenRelay(
      recordOf({ "audit-log": DELIVERED_AT, "old-name": DELIVERED_AT }),
      { "audit-log": audit },
    );

    const outcome = await relay.drainOnce();

    expect(outcome).toEqual({ dispatched: 1, ignored: 0, failed: 0 });
    expect(audit).not.toHaveBeenCalled();
    expect(repository.markDelivered.mock.calls).toEqual([
      [expect.objectContaining({ id: "evt-1", attempts: 2 }), {}],
    ]);
  });
});

const HOUR_MS = 3_600_000;
const DIED_AT = new Date("2026-10-20T08:00:00Z");

function retryInHours(retryAt: Date | undefined): number {
  return Math.round(((retryAt?.getTime() ?? 0) - Date.now()) / HOUR_MS);
}

describe("OutboxRelay retry of a dead event", () => {
  it("marks dead an event failing its last attempt, alerts once, and retries it 6 hours later", async () => {
    const died = mock();
    const { repository, relay } = givenRelay(recordOf({}, { attempts: 10 }), {
      "clip-email": () => Result.fail("mail down"),
    });

    await relay.drainOnce({ delivered: () => {}, died });

    const failure = repository.markFailed.mock.calls[0]?.[1];
    expect(failure?.deadSince.isSome()).toBe(true);
    expect(retryInHours(failure?.retryAt)).toBe(6);
    expect(died).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt-1", attempts: 10 }),
    );
  });

  it("runs only the blocked handlers of a dead event, and on a new failure retries it 6 hours later without a new alert", async () => {
    const audit = mock<EventHandlerFn>(() => Result.ok());
    const email = mock<EventHandlerFn>(() => Result.fail("mail down"));
    const died = mock();
    const { repository, relay } = givenRelay(
      recordOf(
        { "audit-log": DELIVERED_AT },
        { attempts: 11, deadAt: Option.some(DIED_AT) },
      ),
      { "audit-log": audit, "clip-email": email },
    );

    await relay.drainOnce({ delivered: () => {}, died });

    const failure = repository.markFailed.mock.calls[0]?.[1];
    expect(audit).not.toHaveBeenCalled();
    expect(email).toHaveBeenCalledTimes(1);
    expect(failure).toMatchObject({ lastError: "clip-email: mail down" });
    expect(failure?.deadSince.toNull()).toEqual(DIED_AT);
    expect(retryInHours(failure?.retryAt)).toBe(6);
    expect(died).not.toHaveBeenCalled();
  });

  it("marks delivered a dead event whose blocked handler finally succeeds", async () => {
    const { repository, relay } = givenRelay(
      recordOf({}, { attempts: 12, deadAt: Option.some(DIED_AT) }),
      { "clip-email": () => Result.ok() },
    );

    const outcome = await relay.drainOnce();

    expect(outcome).toEqual({ dispatched: 1, ignored: 0, failed: 0 });
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(repository.markDelivered.mock.calls[0]?.[0]).toMatchObject({
      id: "evt-1",
      attempts: 12,
    });
  });
});
