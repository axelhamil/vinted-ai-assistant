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
import { DrizzleOutboxRepository } from "@packages/outbox/drizzle-outbox.repository";
import { OutboxListener } from "@packages/outbox/outbox-listener";
import { OutboxRelay } from "@packages/outbox/outbox-relay";
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
const OUTBOX_LANES = { concurrency: 4, handlerBudgetSeconds: 25 };

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
          relay: new OutboxRelay(
            new DrizzleOutboxRepository(c.db, analysisOutbox),
            c.IEventDispatcher,
            eventRoutes,
            { lanes: OUTBOX_LANES },
          ),
          listener: new OutboxListener({
            connectionString: c.env.DATABASE_URL,
            logger: c.logger,
          }),
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
