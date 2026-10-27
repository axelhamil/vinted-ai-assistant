import type { Logger } from "pino";

export interface ShutdownStep {
  name: string;
  timeoutMs: number;
  run(): Promise<void>;
}

type StepOutcome =
  | { kind: "done" }
  | { kind: "failed"; error: unknown }
  | { kind: "timeout" };

function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  onTimeout: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout), timeoutMs);
  });

  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

function runStep(step: ShutdownStep): Promise<StepOutcome> {
  const settled = Promise.resolve()
    .then(() => step.run())
    .then(
      (): StepOutcome => ({ kind: "done" }),
      (error: unknown): StepOutcome => ({ kind: "failed", error }),
    );

  return withTimeout<StepOutcome>(settled, step.timeoutMs, { kind: "timeout" });
}

async function runAll(steps: ShutdownStep[], logger: Logger): Promise<"done"> {
  for (const step of steps) {
    const outcome = await runStep(step);

    if (outcome.kind === "done") {
      logger.info({ step: step.name }, "[Shutdown] step done");
      continue;
    }

    if (outcome.kind === "failed") {
      logger.error(
        { err: outcome.error, step: step.name },
        "[Shutdown] step failed, going on",
      );
      continue;
    }

    logger.error({ step: step.name }, "[Shutdown] step timed out, going on");
  }

  return "done";
}

export function createShutdown(
  steps: ShutdownStep[],
  logger: Logger,
  deadlineMs: number,
): () => Promise<void> {
  let stopping: Promise<void> | undefined;

  const stop = async () => {
    const outcome = await withTimeout<"done" | "deadline">(
      runAll(steps, logger),
      deadlineMs,
      "deadline",
    );

    if (outcome === "deadline")
      logger.error({ deadlineMs }, "[Shutdown] deadline reached, giving up");
  };

  return () => {
    stopping ??= stop();

    return stopping;
  };
}
