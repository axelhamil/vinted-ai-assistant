import { describe, expect, it } from "bun:test";
import type { IInstrumentation, ILogger } from "@packages/ddd-kit";
import { Option } from "@packages/ddd-kit";
import type { DrainOutcome } from "@packages/outbox/outbox-relay";
import type {
  DrainingRelay,
  startRelayLoop,
} from "@packages/outbox/relay-loop";
import { mockPort } from "@packages/testing/port-mock";
import { OutboxRelayRunner, type RelayListener } from "./outbox-relay-runner";

const EMPTY_DRAIN: DrainOutcome = { dispatched: 0, ignored: 0, failed: 0 };

function given(
  drains: (() => Promise<DrainOutcome>)[],
  startLoop?: typeof startRelayLoop,
) {
  const events: string[] = [];
  let drainCount = 0;
  const relay: DrainingRelay = {
    outbox: "analysis",
    drainOnce: () => {
      const drain = drains[drainCount] ?? (() => Promise.resolve(EMPTY_DRAIN));
      drainCount++;

      return drain();
    },
    pendingState: async () => ({
      dueInMs: Option.none(),
      oldestPendingSeconds: 0,
    }),
  };
  const listener: RelayListener = {
    start: () => {},
    subscribe: () => () => {},
    close: async () => {
      events.push("listener closed");
    },
  };
  const logger = mockPort<ILogger>();
  const instrumentation = mockPort<IInstrumentation>();
  const runner = new OutboxRelayRunner({
    relay,
    listener,
    pollIntervalMs: 1,
    logger,
    instrumentation,
    startLoop,
  });
  const drainsRun = () => drainCount;

  return { events, logger, instrumentation, runner, drainsRun };
}

async function until(condition: () => boolean): Promise<void> {
  for (let tries = 0; !condition() && tries < 200; tries++)
    await new Promise((resolve) => setTimeout(resolve, 1));
}

describe("the outbox relay runner", () => {
  it("awaits the drain in flight before closing the listener", async () => {
    let release: (outcome: DrainOutcome) => void = () => {};
    const { events, runner, drainsRun } = given([
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    ]);
    runner.start();
    await until(() => drainsRun() === 1);

    const stopped = runner.stop().then(() => events.push("stopped"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    events.push("drain released");
    release(EMPTY_DRAIN);
    await stopped;

    expect(events).toEqual(["drain released", "listener closed", "stopped"]);
  });

  it("closes the listener even when stopping the loop fails", async () => {
    const { events, runner } = given(
      [],
      () => () => Promise.reject(new Error("loop stuck")),
    );
    runner.start();

    await expect(runner.stop()).rejects.toThrow("loop stuck");
    expect(events).toEqual(["listener closed"]);
  });

  it("does nothing on a second stop", async () => {
    const { events, runner } = given([]);
    runner.start();

    await runner.stop();
    await runner.stop();

    expect(events).toEqual(["listener closed"]);
  });

  it("logs every failed drain but reports a failure streak once, and again after a success", async () => {
    const fail = () => Promise.reject(new Error("db down"));
    const succeed = () => Promise.resolve(EMPTY_DRAIN);
    const { logger, instrumentation, runner, drainsRun } = given([
      fail,
      fail,
      fail,
      succeed,
      fail,
    ]);
    runner.start();
    await until(() => drainsRun() > 5);
    await runner.stop();

    expect(logger.error).toHaveBeenCalledTimes(4);
    expect(instrumentation.capture).toHaveBeenCalledTimes(2);
  });
});
