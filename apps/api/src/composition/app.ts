import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { pinoLogger } from "hono-pino";
import type { Logger } from "pino";
import type { Env } from "../../common/env";
import type { IDatabaseProbe } from "../adapters/http/database-probe";
import {
  createErrorHandler,
  notFoundHandler,
} from "../adapters/http/error-handler";
import { createHealthRoutes } from "../adapters/http/health.routes";

export interface AppDeps {
  env: Pick<Env, "NODE_ENV">;
  logger: Logger;
  databaseProbe: IDatabaseProbe;
}

const EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/;

function allowedOrigin(env: AppDeps["env"]) {
  return (origin: string): string | null => {
    if (EXTENSION_ORIGIN.test(origin)) return origin;

    if (env.NODE_ENV === "development" && LOCALHOST_ORIGIN.test(origin))
      return origin;

    return null;
  };
}

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.use(requestId());
  app.use(
    pinoLogger({
      pino: deps.logger,
      http: {
        referRequestIdKey: "requestId",
        onReqBindings: (c) => ({
          req: { method: c.req.method, path: c.req.path },
        }),
        onResLevel: () => "info",
        onResMessage: () => "request completed",
      },
    }),
  );
  app.use(cors({ origin: allowedOrigin(deps.env) }));
  app.onError(createErrorHandler(deps.logger));
  app.notFound(notFoundHandler);

  return app.route("/health", createHealthRoutes(deps));
}

export type AppType = ReturnType<typeof createApp>;
