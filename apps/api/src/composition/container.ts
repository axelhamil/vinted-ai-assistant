import { createDb } from "@packages/drizzle/config";
import { DrizzleUnitOfWork } from "@packages/drizzle/unit-of-work";
import { container } from "inwire";
import type { Env } from "../../common/env";
import { createLogger } from "../../common/logger";
import { PostgresDatabaseProbe } from "../adapters/http/database-probe";
import { watchPoolErrors } from "../adapters/lifecycle/pool";

const DISPOSE_TIMEOUT_MS = 5_000;

export function buildContainer(env: Env) {
  return container({ disposeTimeout: DISPOSE_TIMEOUT_MS })
    .add("env", () => env)
    .add("logger", (c) => createLogger(c.env))
    .add(
      "db",
      (c) => {
        const db = createDb(c.env.DATABASE_URL);
        watchPoolErrors(db.$client, c.logger);

        return db;
      },
      {
        dispose: (db) => db.$client.end(),
      },
    )
    .add("pool", (c) => c.db.$client)
    .add("unitOfWork", (c) => new DrizzleUnitOfWork(c.db))
    .add("databaseProbe", (c) => new PostgresDatabaseProbe(c.db, c.logger))
    .build();
}

export type ApiContainer = ReturnType<typeof buildContainer>;
