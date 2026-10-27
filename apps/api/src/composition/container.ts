import { createGeminiClient } from "@packages/ai/gemini-client";
import {
  analysisAiModule,
  analysisModule,
} from "@packages/analysis/analysis.module";
import { analysisOutbox } from "@packages/analysis/schemas/analysis";
import {
  type IEventDispatcher,
  type IInstrumentation,
  InMemoryEventDispatcher,
} from "@packages/ddd-kit";
import { createDb } from "@packages/drizzle/config";
import { studioAiModule, studioModule } from "@packages/studio/studio.module";
import { container } from "inwire";
import type { Env } from "../../common/env";
import { createLogger } from "../../common/logger";
import { captureError } from "../../common/sentry";
import { createSentryInstrumentation } from "../adapters/instrumentation/sentry-instrumentation";
import { watchPoolErrors } from "../adapters/lifecycle/pool";
import { OutboxRelayRunner } from "../adapters/outbox/outbox-relay-runner";
import { PostgresDatabaseProbe } from "../adapters/persistence/postgres-database-probe";
import { eventRoutes } from "./event-routes";

const DISPOSE_TIMEOUT_MS = 5_000;

export function createContainer(env: Env) {
  return container({ disposeTimeout: DISPOSE_TIMEOUT_MS })
    .add("env", () => env)
    .add("logger", (c) => createLogger(c.env))
    .add("report", () => captureError)
    .add(
      "db",
      (c) => {
        const db = createDb(c.env.DATABASE_URL);
        watchPoolErrors(db.$client, c.logger, c.report);

        return db;
      },
      {
        dispose: (db) => db.$client.end(),
      },
    )
    .add("pool", (c) => c.db.$client)
    .add("databaseProbe", (c) => new PostgresDatabaseProbe(c.pool, c.logger))
    .add(
      "IInstrumentation",
      (c): IInstrumentation => createSentryInstrumentation(c.logger),
    )
    .add("GeminiClient", (c) =>
      createGeminiClient({ apiKey: c.env.GEMINI_API_KEY }),
    )
    .addModule(analysisAiModule)
    .addModule(analysisModule)
    .addModule(studioAiModule)
    .addModule(studioModule)
    .add(
      "IEventDispatcher",
      (): IEventDispatcher => new InMemoryEventDispatcher(),
    )
    .add(
      "OutboxRelayRunner",
      (c) =>
        new OutboxRelayRunner({
          db: c.db,
          table: analysisOutbox,
          dispatcher: c.IEventDispatcher,
          routes: eventRoutes,
          listenUrl: c.env.DATABASE_URL,
          pollIntervalMs: c.env.OUTBOX_POLL_INTERVAL_MS,
          logger: c.logger,
          instrumentation: c.IInstrumentation,
        }),
    );
}

export function buildContainer(env: Env) {
  return createContainer(env).build();
}

export type ApiContainer = ReturnType<typeof buildContainer>;
