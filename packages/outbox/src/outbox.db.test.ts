import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";
import {
  EventCollector,
  type EventHandlerFn,
  type IDomainEvent,
  InMemoryEventDispatcher,
  Option,
  RequestContext,
  Result,
  UnitOfWorkContext,
  uuidv7,
} from "@packages/ddd-kit";
import { DrizzleUnitOfWork } from "@packages/drizzle/unit-of-work";
import { db } from "@packages/testing/clone-database";
import { sleep } from "bun";
import { eq, sql } from "drizzle-orm";
import { DrizzleOutboxRepository } from "./drizzle-outbox.repository";
import { createOutboxFlushHandler } from "./outbox-flush-handler";
import { OutboxListener } from "./outbox-listener";
import {
  type EventRoutes,
  OutboxRelay,
  type OutboxRelayOptions,
} from "./outbox-relay";
import type { OutboxTable } from "./outbox-table";
import { startRelayLoop } from "./relay-loop";
import { clips, createTestOutboxes, notes } from "./testing/outbox-test-schema";

const ROUTES: EventRoutes = {
  handled: ["clip.rendered"],
  ignored: ["clip.archived"],
};

const ONE_LANE = { concurrency: 1, handlerBudgetSeconds: 25 };

const quietLog = { info: () => {}, warn: () => {} };

function event(
  eventType = "clip.rendered",
): IDomainEvent & { eventId: string } {
  return {
    eventId: uuidv7(),
    eventType,
    aggregateId: uuidv7(),
    dateOccurred: new Date(),
    payload: { clipId: "c1", seconds: 12 },
  };
}

function writer(table: OutboxTable = clips) {
  return new DrizzleUnitOfWork(db, createOutboxFlushHandler(table, "test"));
}

function announce(events: IDomainEvent[], table: OutboxTable = clips) {
  return writer(table).run(async () => {
    EventCollector.add(events);

    return Result.ok();
  });
}

async function rowsOf(table: OutboxTable = clips) {
  return db.select().from(table).orderBy(table.occurredAt);
}

async function dueNow(id: string) {
  await db
    .update(clips)
    .set({ nextAttemptAt: sql`now() - interval '1 second'` })
    .where(eq(clips.id, id));
}

async function rowOf(id: string | undefined) {
  const [row] = await db
    .select()
    .from(clips)
    .where(eq(clips.id, id ?? ""));

  return row;
}

function relayWith(
  handler: (event: IDomainEvent) => Promise<Result<void>>,
  options: Partial<OutboxRelayOptions> = {},
) {
  const dispatcher = new InMemoryEventDispatcher();
  dispatcher.subscribe("clip.rendered", "clip-handler", handler);

  return new OutboxRelay(
    new DrizzleOutboxRepository(db, clips),
    dispatcher,
    ROUTES,
    { lanes: ONE_LANE, ...options },
  );
}

beforeAll(async () => {
  await createTestOutboxes(db);
});

afterEach(async () => {
  await db.delete(clips);
  await db.delete(notes);
});

describe("writing events to the outbox", () => {
  it("writes the events of a run once, with their plain payload, in the transaction of the run", async () => {
    const rendered = event();

    await announce([rendered, rendered]);

    const rows = await rowsOf();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: rendered.eventId,
      eventType: "clip.rendered",
      aggregateId: rendered.aggregateId,
      aggregateType: "clip",
      payload: { clipId: "c1", seconds: 12 },
      attempts: 0,
      dispatchedAt: null,
    });
  });

  it("stamps the request id of the request that wrote the event, and none outside a request", async () => {
    const inRequest = event();
    const outside = event();

    await RequestContext.run({ requestId: "req-42" }, () =>
      announce([inRequest]),
    );
    await announce([outside]);

    expect((await rowOf(inRequest.eventId))?.metadata).toMatchObject({
      requestId: "req-42",
      source: "test",
      subject: inRequest.aggregateId,
    });
    expect((await rowOf(outside.eventId))?.metadata.requestId).toBeUndefined();
  });

  it("writes nothing when the run fails, nor when it throws", async () => {
    await writer().run(async () => {
      EventCollector.add(event());

      return Result.fail("refused");
    });
    await writer()
      .run(async () => {
        EventCollector.add(event());
        throw new Error("boom");
      })
      .catch(() => {});

    expect(await rowsOf()).toEqual([]);
  });

  it("writes the events of a nested run to the outbox of its own unit of work", async () => {
    const outer = event();
    const inner = event("note.taken");

    await writer(clips).run(async () => {
      EventCollector.add(outer);
      await writer(notes).run(async () => {
        EventCollector.add(inner);

        return Result.ok();
      });

      return Result.ok();
    });

    expect((await rowsOf(clips)).map((r) => r.id)).toEqual([outer.eventId]);
    expect((await rowsOf(notes)).map((r) => r.id)).toEqual([inner.eventId]);
  });

  it("rolls back a run whose events have no outbox rather than lose them", async () => {
    const run = new DrizzleUnitOfWork(db).run(async () => {
      EventCollector.add(event());

      return Result.ok();
    });

    await expect(run).rejects.toThrow("has no outbox would be lost");
  });
});

describe("relaying the outbox", () => {
  it("delivers a pending event outside any transaction, then marks it delivered", async () => {
    const rendered = event();
    await announce([rendered]);
    const seen: { payload: unknown; inTransaction: boolean }[] = [];
    const relay = relayWith(async (delivered) => {
      seen.push({
        payload: delivered.payload,
        inTransaction: UnitOfWorkContext.transaction() !== undefined,
      });

      return Result.ok();
    });

    const outcome = await relay.drainOnce();

    expect(outcome).toEqual({ dispatched: 1, ignored: 0, failed: 0 });
    expect(seen).toEqual([
      { payload: { clipId: "c1", seconds: 12 }, inTransaction: false },
    ]);
    const row = await rowOf(rendered.eventId);
    expect(row?.dispatchedAt).toBeInstanceOf(Date);
    expect(row?.attempts).toBe(1);
    expect((await relay.drainOnce()).dispatched).toBe(0);
  });

  it("retries a failing handler later, then marks the event dead after its last attempt and retries it 6 hours later", async () => {
    const rendered = event();
    await announce([rendered]);
    const died = mock();
    const relay = relayWith(async () => Result.fail("mail provider down"), {
      maxAttempts: 2,
    });

    const first = await relay.drainOnce({ delivered: () => {}, died });

    expect(first.failed).toBe(1);
    const retried = await rowOf(rendered.eventId);
    expect(retried).toMatchObject({
      attempts: 1,
      lastError: "clip-handler: mail provider down",
      deadAt: null,
      dispatchedAt: null,
    });
    expect(retried?.nextAttemptAt?.getTime()).toBeGreaterThan(Date.now());
    expect((await relay.drainOnce()).failed).toBe(0);

    await db
      .update(clips)
      .set({ nextAttemptAt: sql`now() - interval '1 second'` })
      .where(eq(clips.id, rendered.eventId));
    await relay.drainOnce({ delivered: () => {}, died });

    const dead = await rowOf(rendered.eventId);
    expect(dead?.deadAt).toBeInstanceOf(Date);
    expect(dead?.attempts).toBe(2);
    const retryInMs = (dead?.nextAttemptAt?.getTime() ?? 0) - Date.now();
    expect(Math.round(retryInMs / 3_600_000)).toBe(6);
    expect(died).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rendered.eventId,
        eventType: "clip.rendered",
        attempts: 2,
        lastError: "clip-handler: mail provider down",
      }),
    );
    expect((await relay.drainOnce()).failed).toBe(0);
  });

  it("delivers a batch with at most its concurrency of handlers at once, and every event once", async () => {
    const rendered = Array.from({ length: 7 }, () => event());
    await announce(rendered);
    let inFlight = 0;
    let busiest = 0;
    const seen: string[] = [];
    const relay = relayWith(
      async (delivered) => {
        inFlight++;
        busiest = Math.max(busiest, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        seen.push(delivered.eventId ?? "");
        inFlight--;

        return Result.ok();
      },
      { lanes: { concurrency: 3, handlerBudgetSeconds: 25 } },
    );

    const outcome = await relay.drainOnce();

    expect(outcome).toEqual({ dispatched: 7, ignored: 0, failed: 0 });
    expect(busiest).toBe(3);
    expect(seen.toSorted()).toEqual(
      rendered.map(({ eventId }) => eventId).toSorted(),
    );
    expect((await rowsOf()).every(({ dispatchedAt }) => dispatchedAt)).toBe(
      true,
    );
  });

  it("counts a thrown handler as a failed delivery", async () => {
    const rendered = event();
    await announce([rendered]);
    const relay = relayWith(async () => {
      throw new Error("handler crashed");
    });

    expect((await relay.drainOnce()).failed).toBe(1);
    expect((await rowOf(rendered.eventId))?.lastError).toContain(
      "handler crashed",
    );
  });

  it("keeps the handlers that succeeded across a failure and the retry of the dead event, so only the blocked one replays", async () => {
    const rendered = event();
    await announce([rendered]);
    const audit = mock<EventHandlerFn>(() => Result.ok());
    const email = mock<EventHandlerFn>(() => Result.fail("smtp down"));
    const dispatcher = new InMemoryEventDispatcher();
    dispatcher.subscribe("clip.rendered", "audit-log", audit);
    dispatcher.subscribe("clip.rendered", "clip-email", email);
    const relay = new OutboxRelay(
      new DrizzleOutboxRepository(db, clips),
      dispatcher,
      ROUTES,
      { lanes: ONE_LANE, maxAttempts: 1 },
    );

    await relay.drainOnce();
    const dead = await rowOf(rendered.eventId);
    email.mockImplementation(() => Result.ok());
    await dueNow(rendered.eventId);
    await relay.drainOnce();

    expect(dead?.lastError).toBe("clip-email: smtp down");
    expect(Object.keys(dead?.deliveries ?? {})).toEqual(["audit-log"]);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(email).toHaveBeenCalledTimes(2);
    expect(
      Object.keys((await rowOf(rendered.eventId))?.deliveries ?? {}).sort(),
    ).toEqual(["audit-log", "clip-email"]);
  });

  it("claims a dead event once its next retry is due, and not before", async () => {
    const due = event();
    const later = event();
    await announce([due, later]);
    await db
      .update(clips)
      .set({
        deadAt: sql`now() - interval '6 hours'`,
        attempts: 10,
        nextAttemptAt: sql`now() - interval '1 second'`,
      })
      .where(eq(clips.id, due.eventId));
    await db
      .update(clips)
      .set({
        deadAt: sql`now()`,
        attempts: 10,
        nextAttemptAt: sql`now() + interval '6 hours'`,
      })
      .where(eq(clips.id, later.eventId));

    const claimed = await new DrizzleOutboxRepository(db, clips).claim({
      limit: 10,
      eventTypes: ROUTES.handled,
      leaseSeconds: 120,
    });

    expect(
      claimed.getValue().map((r) => [r.id, r.attempts, r.deadAt.isSome()]),
    ).toEqual([[due.eventId, 11, true]]);
  });

  it("keeps a claimed dead event out of the dead rows while its lease runs", async () => {
    const rendered = event();
    await announce([rendered]);
    await db
      .update(clips)
      .set({
        deadAt: sql`now()`,
        attempts: 10,
        nextAttemptAt: sql`now() - interval '1 second'`,
      })
      .where(eq(clips.id, rendered.eventId));
    const repository = new DrizzleOutboxRepository(db, clips);
    const claim = () =>
      repository.claim({
        limit: 10,
        eventTypes: ROUTES.handled,
        leaseSeconds: 120,
      });

    await claim();

    expect((await claim()).getValue()).toEqual([]);
    expect(await rowOf(rendered.eventId)).toMatchObject({
      deadAt: null,
      attempts: 11,
    });
  });

  it("writes nothing for the late marks of an attempt whose lease another claim replaced", async () => {
    const rendered = event();
    await announce([rendered]);
    const repository = new DrizzleOutboxRepository(db, clips);
    const claim = async () =>
      (
        await repository.claim({
          limit: 10,
          eventTypes: ROUTES.handled,
          leaseSeconds: 120,
        })
      ).getValue();
    const [stale] = await claim();
    await dueNow(rendered.eventId);
    const [current] = await claim();
    const lease = { id: rendered.eventId, attempts: stale?.attempts ?? 0 };

    await repository.markFailed(lease, {
      lastError: "clip-handler: smtp down",
      retryAt: new Date(Date.now() + 3_600_000),
      deadSince: Option.none<Date>(),
      deliveries: { "clip-handler": new Date().toISOString() },
    });
    await repository.markDelivered(lease, {});

    expect(current?.attempts).toBe(2);
    expect(await rowOf(rendered.eventId)).toMatchObject({
      attempts: 2,
      lastError: null,
      dispatchedAt: null,
      deliveries: {},
    });
  });

  it("keeps the first death date of a dead event failing again, and clears it once the event is delivered", async () => {
    const rendered = event();
    await announce([rendered]);
    const diedAt = new Date("2026-10-20T08:00:00Z");
    await db
      .update(clips)
      .set({
        deadAt: diedAt,
        attempts: 10,
        nextAttemptAt: sql`now() - interval '1 second'`,
      })
      .where(eq(clips.id, rendered.eventId));
    const handler = mock(
      async (): Promise<Result<void>> => Result.fail("smtp down"),
    );
    const relay = relayWith(handler);

    await relay.drainOnce();
    const failedAgain = await rowOf(rendered.eventId);
    await db
      .update(clips)
      .set({ nextAttemptAt: sql`now() - interval '1 second'` })
      .where(eq(clips.id, rendered.eventId));
    handler.mockImplementation(async () => Result.ok());
    await relay.drainOnce();

    expect(failedAgain).toMatchObject({ deadAt: diedAt, attempts: 11 });
    expect(await rowOf(rendered.eventId)).toMatchObject({
      deadAt: null,
      nextAttemptAt: null,
      attempts: 12,
    });
    expect((await rowOf(rendered.eventId))?.dispatchedAt).toBeInstanceOf(Date);
  });

  it("claims again an event whose lease ended without a mark, as after a crash in its handler", async () => {
    const rendered = event();
    await announce([rendered]);
    const repository = new DrizzleOutboxRepository(db, clips);
    const claim = () =>
      repository.claim({
        limit: 10,
        eventTypes: ROUTES.handled,
        leaseSeconds: 120,
      });

    expect((await claim()).getValue()).toHaveLength(1);
    expect((await claim()).getValue()).toHaveLength(0);

    await db
      .update(clips)
      .set({ nextAttemptAt: sql`now() - interval '1 second'` })
      .where(eq(clips.id, rendered.eventId));

    const reclaimed = (await claim()).getValue();
    expect(reclaimed.map((r) => [r.id, r.attempts])).toEqual([
      [rendered.eventId, 2],
    ]);
  });

  it("skips a row another relay holds instead of waiting for it", async () => {
    const held = event();
    const free = event();
    await announce([held]);
    await announce([free]);
    const repository = new DrizzleOutboxRepository(db, clips);
    const other = await db.$client.connect();

    try {
      await other.query("begin");
      await other.query(
        "select id from outbox_test.outbox_event where id = $1 for update",
        [held.eventId],
      );

      const claimed = await repository.claim({
        limit: 10,
        eventTypes: ROUTES.handled,
        leaseSeconds: 120,
      });

      expect(claimed.getValue().map((r) => r.id)).toEqual([free.eventId]);
    } finally {
      await other.query("rollback");
      other.release();
    }
  });

  it("marks an ignored type without a handler and never claims an unknown type", async () => {
    const archived = event("clip.archived");
    const unknown = event("clip.renamed");
    await announce([archived, unknown]);
    const handler = mock(async () => Result.ok());
    const relay = relayWith(handler);

    const outcome = await relay.drainOnce();

    expect(outcome).toEqual({ dispatched: 0, ignored: 1, failed: 0 });
    expect(handler).not.toHaveBeenCalled();
    expect((await rowOf(archived.eventId))?.dispatchedAt).toBeInstanceOf(Date);
    expect(await rowOf(unknown.eventId)).toMatchObject({
      attempts: 0,
      dispatchedAt: null,
    });
    expect((await relay.pendingState()).dueInMs.isNone()).toBe(true);
  });

  it("reports fresh events due now even while another event waits out its backoff", async () => {
    const backingOff = event();
    await announce([event(), event(), backingOff]);
    await db
      .update(clips)
      .set({ nextAttemptAt: sql`now() + interval '1 hour'`, attempts: 1 })
      .where(eq(clips.id, backingOff.eventId));

    const { dueInMs } = await relayWith(async () => Result.ok()).pendingState();

    expect(dueInMs.toNull()).toBe(0);
  });

  it("wakes the relay on commit through the listening connection, long before its poll", async () => {
    const delivered = Promise.withResolvers<IDomainEvent>();
    const relay = relayWith(async (received) => {
      delivered.resolve(received);

      return Result.ok();
    });
    const listener = new OutboxListener({
      connectionString: process.env.DATABASE_URL ?? "",
      logger: quietLog,
    });
    const connected = Promise.withResolvers<void>();
    listener.subscribe("outbox_test", () => connected.resolve());
    listener.start();
    await connected.promise;
    const stop = startRelayLoop(relay, {
      fallbackIntervalMs: 60_000,
      wakeSource: listener,
      onError: (error) => delivered.reject(error),
    });
    const rendered = event();

    try {
      await sleep(100);
      await announce([rendered]);

      const received = await Promise.race([
        delivered.promise,
        sleep(5_000).then(() => null),
      ]);
      expect(received?.eventId).toBe(rendered.eventId);
    } finally {
      await stop();
      await listener.close();
    }
  });
});
