import { RequestContext } from "@packages/ddd-kit";
import pino, { type DestinationStream, type Logger } from "pino";
import type { Env } from "./env";

export const silentLogger: Logger = pino({ level: "silent" });

function requestIdMixin(): object {
  return RequestContext.current()
    .map(({ requestId }): object => ({ requestId }))
    .unwrapOr({});
}

export function createJsonLogger(
  level: Env["LOG_LEVEL"],
  destination?: DestinationStream,
): Logger {
  return pino({ level, mixin: requestIdMixin }, destination);
}

export function createLogger(env: Env): Logger {
  if (env.NODE_ENV === "test") return silentLogger;

  if (env.NODE_ENV === "development")
    return pino({
      level: env.LOG_LEVEL,
      mixin: requestIdMixin,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
    });

  return createJsonLogger(env.LOG_LEVEL);
}

export function flushLogger(logger: Logger): Promise<void> {
  return new Promise<void>((resolve, reject) =>
    logger.flush((error) => (error ? reject(error) : resolve())),
  );
}
