import * as Sentry from "@sentry/bun";
import type { Env } from "./env";

export function initSentry(env: Env): void {
  if (env.SENTRY_DSN.isNone()) return;

  Sentry.init({
    dsn: env.SENTRY_DSN.unwrap(),
    environment: env.NODE_ENV,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      genAI: { inputs: false, outputs: false },
      graphQL: { document: false, variables: false },
    },
  });
}

export async function flushSentry(timeoutMs: number): Promise<void> {
  await Sentry.flush(timeoutMs);
}

export function captureError(error: unknown, requestId: string): void {
  if (!Sentry.isEnabled()) return;

  Sentry.captureException(error, { tags: { requestId } });
}
