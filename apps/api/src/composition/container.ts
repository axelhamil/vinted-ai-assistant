import { createDb } from "@packages/drizzle/config";
import { DrizzleUnitOfWork } from "@packages/drizzle/unit-of-work";
import { container } from "inwire";
import type { Env } from "../../common/env";
import { createLogger } from "../../common/logger";
import { PostgresDatabaseProbe } from "../adapters/http/database-probe";

const DISPOSE_TIMEOUT_MS = 5_000;

export function buildContainer(env: Env) {
  return container({ disposeTimeout: DISPOSE_TIMEOUT_MS })
    .add("env", () => env)
    .add("logger", (c) => createLogger(c.env))
    .add("db", (c) => createDb(c.env.DATABASE_URL), {
      dispose: (db) => db.$client.end(),
    })
    .add("pool", (c) => c.db.$client)
    .add("unitOfWork", (c) => new DrizzleUnitOfWork(c.db))
    .add("databaseProbe", (c) => new PostgresDatabaseProbe(c.db, c.logger))
    .build();
}

export type ApiContainer = ReturnType<typeof buildContainer>;
