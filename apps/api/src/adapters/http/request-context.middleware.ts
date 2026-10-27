import { RequestContext } from "@packages/ddd-kit";
import type { MiddlewareHandler } from "hono";

export const requestContext: MiddlewareHandler = (c, next) =>
  RequestContext.run({ requestId: c.get("requestId") }, next);
