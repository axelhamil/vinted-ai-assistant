import type { EventEmitter } from "node:events";
import type { Logger } from "pino";
import type { ErrorReporter } from "../../ports/error-reporter.port";

export interface ProcessHandlersDeps {
  stop: () => Promise<boolean>;
  logger: Logger;
  report: ErrorReporter;
  exit: (code: number) => void;
  events: Pick<EventEmitter, "on">;
}

const SIGNALS = ["SIGTERM", "SIGINT"] as const;
const CRASHES = ["uncaughtException", "unhandledRejection"] as const;

export function installProcessHandlers(deps: ProcessHandlersDeps): void {
  const { stop, logger, report, exit, events } = deps;
  let stopping = false;
  let crashed = false;

  async function stopAndExit(): Promise<void> {
    stopping = true;
    const ok = await stop();

    exit(ok && !crashed ? 0 : 1);
  }

  function onSignal(signal: NodeJS.Signals): void {
    if (stopping) {
      logger.warn({ signal }, "[Shutdown] second signal, exiting now");
      exit(1);

      return;
    }

    logger.info({ signal }, "[Shutdown] signal received, stopping");
    void stopAndExit();
  }

  function onCrash(error: unknown): void {
    crashed = true;
    logger.fatal({ err: error }, "[Api] crashed, stopping");
    report(error);
    if (stopping) return;

    void stopAndExit();
  }

  for (const signal of SIGNALS) events.on(signal, onSignal);
  for (const crash of CRASHES) events.on(crash, onCrash);
}
