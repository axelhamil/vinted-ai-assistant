import pino, { type Logger } from "pino";
import type { Env } from "./env";

export function createLogger(env: Env): Logger {
  if (env.NODE_ENV === "test") return pino({ level: "silent" });

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
