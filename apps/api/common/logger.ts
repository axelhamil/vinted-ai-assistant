import pino, { type Logger } from "pino";
import type { Env } from "./env";

export const silentLogger: Logger = pino({ level: "silent" });

export function createLogger(env: Env): Logger {
  if (env.NODE_ENV === "test") return silentLogger;

  if (env.NODE_ENV === "development")
    return pino({
      level: env.LOG_LEVEL,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
    });

  return pino({ level: env.LOG_LEVEL });
}

export function flushLogger(logger: Logger): Promise<void> {
  return new Promise<void>((resolve, reject) =>
    logger.flush((error) => (error ? reject(error) : resolve())),
  );
}
