import { serve } from "bun";
import { env } from "../common/load-env";
import { flushLogger } from "../common/logger";
import { flushSentry, initSentry } from "../common/sentry";
import { installProcessHandlers } from "./adapters/lifecycle/process-handlers";
import { createShutdown } from "./adapters/lifecycle/shutdown";
import { createApp } from "./composition/app";
import { buildContainer } from "./composition/container";

initSentry(env);

const IDLE_TIMEOUT_SECONDS = 255;
const HTTP_DRAIN_TIMEOUT_MS = 5_000;
const DATABASE_CLOSE_TIMEOUT_MS = 5_500;
const SENTRY_FLUSH_TIMEOUT_MS = 2_000;
const SENTRY_FLUSH_STEP_TIMEOUT_MS = 2_500;
const LOGGER_FLUSH_TIMEOUT_MS = 1_000;
const SHUTDOWN_DEADLINE_MS = 15_000;

const container = buildContainer(env);
const { logger, report } = container;
const app = createApp(container);

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: "0.0.0.0",
  idleTimeout: IDLE_TIMEOUT_SECONDS,
});

logger.info({ port: server.port, env: env.NODE_ENV }, "[Api] listening");

const stop = createShutdown(
  [
    {
      name: "http",
      timeoutMs: HTTP_DRAIN_TIMEOUT_MS,
      run: () => server.stop(),
    },
    {
      name: "database",
      timeoutMs: DATABASE_CLOSE_TIMEOUT_MS,
      run: () => container.dispose(),
    },
    {
      name: "sentry",
      timeoutMs: SENTRY_FLUSH_STEP_TIMEOUT_MS,
      run: () => flushSentry(SENTRY_FLUSH_TIMEOUT_MS),
    },
    {
      name: "logger",
      timeoutMs: LOGGER_FLUSH_TIMEOUT_MS,
      run: () => flushLogger(logger),
    },
  ],
  logger,
  SHUTDOWN_DEADLINE_MS,
);

installProcessHandlers({
  stop,
  logger,
  report,
  exit: (code) => process.exit(code),
  events: process,
});
