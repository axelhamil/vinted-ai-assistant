import {
  AppErrorException,
  type ErrorCode,
  httpStatusFromCode,
} from "@packages/ddd-kit";
import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Logger } from "pino";
import { captureError } from "../../../common/sentry";

export interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

export function errorBody(
  code: ErrorCode,
  message: string,
  requestId: string,
): ErrorBody {
  return { error: { code, message, requestId } };
}

export function createErrorHandler(logger: Logger): ErrorHandler {
  return (error, c) => {
    const requestId = c.get("requestId");

    if (error instanceof AppErrorException) {
      logger.warn(
        { requestId, code: error.code, metadata: error.metadata },
        error.message,
      );

      return c.json(
        errorBody(error.code, error.message, requestId),
        httpStatusFromCode(error.code),
      );
    }

    if (error instanceof HTTPException && error.status < 500) {
      const reason = error.message || "The request was rejected";
      logger.warn({ requestId, status: error.status }, reason);

      return c.json(
        errorBody(
          "REQUEST_INVALID",
          `${reason}. Fix the request body, headers or url and retry.`,
          requestId,
        ),
        error.status,
      );
    }

    logger.error({ requestId, err: error }, "unexpected error");
    captureError(error, requestId);

    return c.json(
      errorBody(
        "SERVER_UNAVAILABLE",
        `Something went wrong on our side. Retry, and if it keeps failing check the api logs for request ${requestId}.`,
        requestId,
      ),
      500,
    );
  };
}

export const notFoundHandler: NotFoundHandler = (c) =>
  c.json(
    errorBody(
      "ROUTE_NOT_FOUND",
      `No route for ${c.req.method} ${c.req.path}. Check the url and method.`,
      c.get("requestId"),
    ),
    404,
  );
