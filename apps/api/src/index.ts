import { serve } from "bun";
import { env } from "../common/load-env";
import { flushLogger } from "../common/logger";
import { flushSentry, initSentry } from "../common/sentry";
import { installProcessHandlers } from "./adapters/lifecycle/process-handlers";
import {
  API_SHUTDOWN_DEADLINE_MS,
  apiShutdownSteps,
  createShutdown,
} from "./adapters/lifecycle/shutdown";
import { createApi } from "./composition/app";
import { buildContainer } from "./composition/container";

initSentry(env);

const IDLE_TIMEOUT_SECONDS = 255;
const SENTRY_FLUSH_TIMEOUT_MS = 2_000;

const container = buildContainer(env);
const { logger, report } = container;
const app = createApi(container);

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: "0.0.0.0",
  idleTimeout: IDLE_TIMEOUT_SECONDS,
});

logger.info({ port: server.port, env: env.NODE_ENV }, "[Api] listening");

const stop = createShutdown(
  apiShutdownSteps({
    http: () => server.stop(),
    outbox: () => container.OutboxRelayRunner.stop(),
    database: () => container.dispose(),
    sentry: () => flushSentry(SENTRY_FLUSH_TIMEOUT_MS),
    logger: () => flushLogger(logger),
  }),
  logger,
  API_SHUTDOWN_DEADLINE_MS,
);

installProcessHandlers({
  stop,
  logger,
  report,
  exit: (code) => process.exit(code),
  events: process,
});

container.OutboxRelayRunner.start();
