import { Result } from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import type { Logger } from "pino";

export type DatabaseProbeError = "DATABASE_UNAVAILABLE";

export interface IDatabaseProbe {
  check(): Promise<Result<void, DatabaseProbeError>>;
}

const PROBE_TIMEOUT_MS = 2_000;

export class PostgresDatabaseProbe implements IDatabaseProbe {
  constructor(
    private readonly database: Db,
    private readonly logger: Logger,
    private readonly timeoutMs = PROBE_TIMEOUT_MS,
  ) {}

  async check(): Promise<Result<void, DatabaseProbeError>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<string>((resolve) => {
      timer = setTimeout(
        () => resolve(`no answer within ${this.timeoutMs} ms`),
        this.timeoutMs,
      );
    });
    const answered = this.database.$client.query("select 1").then(
      () => undefined,
      (error: unknown) => (error instanceof Error ? error.message : "failed"),
    );

    try {
      const failure = await Promise.race([answered, timedOut]);
      if (failure === undefined) return Result.ok();

      this.logger.warn({ reason: failure }, "database probe failed");

      return Result.fail("DATABASE_UNAVAILABLE");
    } finally {
      clearTimeout(timer);
    }
  }
}
