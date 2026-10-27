import { describe, expect, it } from "bun:test";
import pino from "pino";
import { createShutdown, type ShutdownStep } from "./shutdown";

interface LogLine {
  msg: string;
  step?: string;
}

function isLogLine(value: unknown): value is LogLine {
  return typeof value === "object" && value !== null && "msg" in value;
}

function given() {
  const lines: LogLine[] = [];
  const logger = pino(
    {},
    {
      write: (line: string) => {
        const parsed: unknown = JSON.parse(line);
        if (isLogLine(parsed)) lines.push(parsed);
      },
    },
  );
  const ran: string[] = [];

  const step = (
    name: string,
    behavior: () => Promise<void> = async () => {},
    timeoutMs = 1_000,
  ): ShutdownStep => ({
    name,
    timeoutMs,
    run: async () => {
      ran.push(name);
      await behavior();
    },
  });

  const failedSteps = () =>
    lines
      .filter((line) => line.msg !== "[Shutdown] step done")
      .map((line) => line.step);

  return { lines, ran, step, failedSteps, logger };
}

describe("stopping the API", () => {
  it("runs every step in order and logs each one", async () => {
    const { lines, logger, ran, step } = given();
    const stop = createShutdown(
      [step("http"), step("database")],
      logger,
      1_000,
    );

    await stop();

    expect(ran).toEqual(["http", "database"]);
    expect(lines.map((line) => line.step)).toEqual(["http", "database"]);
  });

  it("keeps going past a step that throws and a step that hangs", async () => {
    const { failedSteps, logger, ran, step } = given();
    const boom = step("http", () => Promise.reject(new Error("boom")));
    const hang = step("database", () => new Promise<void>(() => {}), 10);
    const stop = createShutdown([boom, hang, step("logger")], logger, 1_000);

    await stop();

    expect(ran).toEqual(["http", "database", "logger"]);
    expect(failedSteps()).toEqual(["http", "database"]);
  });

  it("gives up at the deadline without waiting for a step that never ends", async () => {
    const { logger, ran, step } = given();
    const hang = step("http", () => new Promise<void>(() => {}), 200);
    const stop = createShutdown([hang, step("logger")], logger, 20);

    await stop();

    expect(ran).toEqual(["http"]);
  });

  it("runs the steps once when the signal arrives twice", async () => {
    const { logger, ran, step } = given();
    const stop = createShutdown(
      [step("http"), step("database")],
      logger,
      1_000,
    );

    await Promise.all([stop(), stop()]);
    await stop();

    expect(ran).toEqual(["http", "database"]);
  });
});
