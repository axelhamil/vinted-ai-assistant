import { serve } from "bun";
import { env } from "../common/load-env";
import { captureError, flushSentry, initSentry } from "../common/sentry";
import { createShutdown, flushLogger } from "./adapters/lifecycle/shutdown";
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
const SIGNALS = ["SIGTERM", "SIGINT"] as const;

const container = buildContainer(env);
const { logger } = container;
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

let stopping = false;
let crashed = false;

async function stopAndExit(): Promise<void> {
  stopping = true;
  const ok = await stop();

  process.exit(ok && !crashed ? 0 : 1);
}

function onSignal(signal: NodeJS.Signals): void {
  if (stopping) {
    logger.warn({ signal }, "[Shutdown] second signal, exiting now");
    process.exit(1);
  }

  logger.info({ signal }, "[Shutdown] signal received, stopping");
  void stopAndExit();
}

function onCrash(error: unknown): void {
  crashed = true;
  logger.fatal({ err: error }, "[Api] crashed, stopping");
  captureError(error);
  void stopAndExit();
}

for (const signal of SIGNALS) process.on(signal, onSignal);
process.on("uncaughtException", onCrash);
process.on("unhandledRejection", onCrash);
