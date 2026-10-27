import type { Logger } from "pino";
import { flushLogger } from "../../../common/logger";
import { withTimeout } from "../../../common/with-timeout";

export interface ShutdownStep {
  name: string;
  timeoutMs: number;
  run(): Promise<void>;
}

export interface ApiStoppers {
  http(): Promise<void>;
  outbox(): Promise<void>;
  database(): Promise<void>;
  sentry(): Promise<void>;
  logger(): Promise<void>;
}

export const API_SHUTDOWN_DEADLINE_MS = 15_000;

const DEADLINE_FLUSH_TIMEOUT_MS = 1_000;
const HTTP_DRAIN_TIMEOUT_MS = 5_000;
const OUTBOX_STOP_TIMEOUT_MS = 2_000;
const DATABASE_CLOSE_TIMEOUT_MS = 4_000;
const SENTRY_FLUSH_STEP_TIMEOUT_MS = 2_500;
const LOGGER_FLUSH_TIMEOUT_MS = 1_000;

type StepOutcome =
  | { kind: "done" }
  | { kind: "failed"; error: unknown }
  | { kind: "timeout" };

function runStep(step: ShutdownStep): Promise<StepOutcome> {
  const settled = Promise.resolve()
    .then(() => step.run())
    .then(
      (): StepOutcome => ({ kind: "done" }),
      (error: unknown): StepOutcome => ({ kind: "failed", error }),
    );

  return withTimeout<StepOutcome>(settled, step.timeoutMs, { kind: "timeout" });
}

async function runAll(steps: ShutdownStep[], logger: Logger): Promise<boolean> {
  let allDone = true;

  for (const step of steps) {
    const outcome = await runStep(step);

    if (outcome.kind === "done") {
      logger.info({ step: step.name }, "[Shutdown] step done");
      continue;
    }

    allDone = false;

    if (outcome.kind === "failed") {
      logger.error(
        { err: outcome.error, step: step.name },
        "[Shutdown] step failed, going on",
      );
      continue;
    }

    logger.error({ step: step.name }, "[Shutdown] step timed out, going on");
  }

  return allDone;
}

export function createShutdown(
  steps: ShutdownStep[],
  logger: Logger,
  deadlineMs: number,
): () => Promise<boolean> {
  let stopping: Promise<boolean> | undefined;

  const stop = async () => {
    const outcome = await withTimeout<boolean | "deadline">(
      runAll(steps, logger),
      deadlineMs,
      "deadline",
    );

    if (outcome !== "deadline") return outcome;

    logger.error({ deadlineMs }, "[Shutdown] deadline reached, giving up");
    await runStep({
      name: "deadline flush",
      timeoutMs: DEADLINE_FLUSH_TIMEOUT_MS,
      run: () => flushLogger(logger),
    });

    return false;
  };

  return () => {
    stopping ??= stop();

    return stopping;
  };
}

export function apiShutdownSteps(stoppers: ApiStoppers): ShutdownStep[] {
  return [
    { name: "http", timeoutMs: HTTP_DRAIN_TIMEOUT_MS, run: stoppers.http },
    { name: "outbox", timeoutMs: OUTBOX_STOP_TIMEOUT_MS, run: stoppers.outbox },
    {
      name: "database",
      timeoutMs: DATABASE_CLOSE_TIMEOUT_MS,
      run: stoppers.database,
    },
    {
      name: "sentry",
      timeoutMs: SENTRY_FLUSH_STEP_TIMEOUT_MS,
      run: stoppers.sentry,
    },
    {
      name: "logger",
      timeoutMs: LOGGER_FLUSH_TIMEOUT_MS,
      run: stoppers.logger,
    },
  ];
}
