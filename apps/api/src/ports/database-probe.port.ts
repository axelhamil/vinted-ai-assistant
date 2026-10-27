import type { Result } from "@packages/ddd-kit";

export type DatabaseProbeError = "DATABASE_UNAVAILABLE";

export interface IDatabaseProbe {
  check(): Promise<Result<void, DatabaseProbeError>>;
}
