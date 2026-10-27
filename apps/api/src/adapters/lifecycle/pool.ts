import type { Logger } from "pino";
import type { ErrorReporter } from "../../ports/error-reporter.port";

interface PoolLike {
  on(event: "error", listener: (error: Error) => void): unknown;
}

export function watchPoolErrors(
  pool: PoolLike,
  logger: Logger,
  report: ErrorReporter,
): void {
  pool.on("error", (error) => {
    logger.error({ err: error }, "[Database] a pooled connection was lost");
    report(error);
  });
}
