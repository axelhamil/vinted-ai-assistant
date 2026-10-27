import { Result } from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import type { Logger } from "pino";
import { withTimeout } from "../../../common/with-timeout";
import type {
  DatabaseProbeError,
  IDatabaseProbe,
} from "../../ports/database-probe.port";

type Pool = Db["$client"];

interface ProbeOptions {
  timeoutMs: number;
  statement: string;
}

const DEFAULT_PROBE: ProbeOptions = { timeoutMs: 2_000, statement: "select 1" };

export class PostgresDatabaseProbe implements IDatabaseProbe {
  constructor(
    private readonly pool: Pool,
    private readonly logger: Logger,
    private readonly options: ProbeOptions = DEFAULT_PROBE,
  ) {}

  async check(): Promise<Result<void, DatabaseProbeError>> {
    const { timeoutMs, statement } = this.options;
    const boundedQuery = { text: statement, query_timeout: timeoutMs };
    const answered = this.pool.query(boundedQuery).then(
      () => undefined,
      (error: unknown) => (error instanceof Error ? error.message : "failed"),
    );

    const failure = await withTimeout<string | undefined>(
      answered,
      timeoutMs,
      `no answer within ${timeoutMs} ms`,
    );
    if (failure === undefined) return Result.ok();

    this.logger.warn({ reason: failure }, "database probe failed");

    return Result.fail("DATABASE_UNAVAILABLE");
  }
}
