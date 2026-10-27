import { Result } from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import type { Logger } from "pino";

export type DatabaseProbeError = "DATABASE_UNAVAILABLE";

export interface IDatabaseProbe {
  check(): Promise<Result<void, DatabaseProbeError>>;
}

interface ProbeOptions {
  timeoutMs: number;
  statement: string;
}

const DEFAULT_PROBE: ProbeOptions = { timeoutMs: 2_000, statement: "select 1" };

export class PostgresDatabaseProbe implements IDatabaseProbe {
  constructor(
    private readonly database: Db,
    private readonly logger: Logger,
    private readonly options: ProbeOptions = DEFAULT_PROBE,
  ) {}

  async check(): Promise<Result<void, DatabaseProbeError>> {
    const { timeoutMs, statement } = this.options;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<string>((resolve) => {
      timer = setTimeout(
        () => resolve(`no answer within ${timeoutMs} ms`),
        timeoutMs,
      );
    });
    const boundedQuery = { text: statement, query_timeout: timeoutMs };
    const answered = this.database.$client.query(boundedQuery).then(
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
