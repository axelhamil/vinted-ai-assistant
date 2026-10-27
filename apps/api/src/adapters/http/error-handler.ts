import {
  AppErrorException,
  type ErrorCode,
  httpStatusFromCode,
} from "@packages/ddd-kit";
import type { ErrorHandler, MiddlewareHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Logger } from "pino";
import type { ErrorReporter } from "../../ports/error-reporter.port";

export interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

interface Rejection {
  code: ErrorCode;
  hint: string;
}

const INVALID_REQUEST: Rejection = {
  code: "REQUEST_INVALID",
  hint: "Fix the request body, headers or url and retry.",
};

const REJECTIONS: Partial<Record<number, Rejection>> = {
  400: INVALID_REQUEST,
  401: {
    code: "REQUEST_UNAUTHORIZED",
    hint: "Send valid credentials and retry.",
  },
  403: {
    code: "REQUEST_FORBIDDEN",
    hint: "These credentials do not allow this request.",
  },
  404: { code: "ROUTE_NOT_FOUND", hint: "Check the url and method." },
  413: {
    code: "REQUEST_TOO_LARGE",
    hint: "Send a smaller request body and retry.",
  },
  429: {
    code: "REQUEST_RATE_LIMITED",
    hint: "Wait for the Retry-After delay, then retry.",
  },
};

const HEADERS_SET_BY_JSON = new Set(["content-type", "content-length"]);

export function errorBody(
  code: ErrorCode,
  message: string,
  requestId: string,
): ErrorBody {
  return { error: { code, message, requestId } };
}

export const rethrowNonErrors: MiddlewareHandler = async (_c, next) => {
  try {
    await next();
  } catch (thrown) {
    if (thrown instanceof Error) throw thrown;

    throw new Error(String(thrown), { cause: thrown });
  }
};

export function createErrorHandler(
  logger: Logger,
  report: ErrorReporter,
): ErrorHandler {
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
      const { code, hint } = REJECTIONS[error.status] ?? INVALID_REQUEST;
      const reason = error.message || "The request was rejected";
      logger.warn({ requestId, status: error.status, code }, reason);

      error.getResponse().headers.forEach((value, name) => {
        if (HEADERS_SET_BY_JSON.has(name)) return;

        c.header(name, value, { append: true });
      });

      return c.json(
        errorBody(code, `${reason}. ${hint}`, requestId),
        error.status,
      );
    }

    logger.error({ requestId, err: error }, "unexpected error");
    report(error, requestId);

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
