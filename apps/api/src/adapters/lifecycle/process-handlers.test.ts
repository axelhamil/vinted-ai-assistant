import { describe, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";
import { silentLogger } from "../../../common/logger";
import { installProcessHandlers } from "./process-handlers";

function given(stopped: Promise<boolean> = Promise.resolve(true)) {
  const events = new EventEmitter();
  const stop = mock(() => stopped);
  const report = mock();
  const exit = mock();

  installProcessHandlers({ stop, logger: silentLogger, report, exit, events });

  return { events, stop, report, exit };
}

function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("the process handlers", () => {
  it.each(["SIGTERM", "SIGINT"])(
    "stops cleanly and exits 0 on %s",
    async (signal) => {
      const { events, exit, stop } = given();

      events.emit(signal, signal);
      await settled();

      expect(stop).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(0);
    },
  );

  it("exits 1 when the stop does not end cleanly", async () => {
    const { events, exit } = given(Promise.resolve(false));

    events.emit("SIGTERM", "SIGTERM");
    await settled();

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits 1 at once on a second signal while stopping", async () => {
    const { events, exit, stop } = given(new Promise<boolean>(() => {}));

    events.emit("SIGTERM", "SIGTERM");
    events.emit("SIGINT", "SIGINT");
    await settled();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(exit.mock.calls).toEqual([[1]]);
  });

  it.each(["uncaughtException", "unhandledRejection"])(
    "reports a crash on %s, stops, then exits 1",
    async (event) => {
      const { events, exit, report, stop } = given();
      const crash = new Error("boom");

      events.emit(event, crash);
      await settled();

      expect(report).toHaveBeenCalledWith(crash);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(exit.mock.calls).toEqual([[1]]);
    },
  );

  it("exits 1 when the process crashes during a clean stop", async () => {
    const { events, exit, stop } = given();

    events.emit("SIGTERM", "SIGTERM");
    events.emit("uncaughtException", new Error("boom"));
    await settled();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(exit.mock.calls).toEqual([[1]]);
  });
});
