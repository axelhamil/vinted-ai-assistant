import type { Logger } from "pino";
import { captureError } from "../../../common/sentry";

interface PoolLike {
  on(event: "error", listener: (error: Error) => void): unknown;
}

export function watchPoolErrors(pool: PoolLike, logger: Logger): void {
  pool.on("error", (error) => {
    logger.error({ err: error }, "[Database] a pooled connection was lost");
    captureError(error);
  });
}
