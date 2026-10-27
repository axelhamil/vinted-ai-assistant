import type { IInstrumentation } from "@packages/ddd-kit";
import * as Sentry from "@sentry/bun";

export const sentryInstrumentation: IInstrumentation = {
  capture(error, context = {}) {
    Sentry.withScope((scope) => {
      scope.setLevel(context.level ?? "error");
      scope.setTags({
        ...context.tags,
        ...(context.requestId && { requestId: context.requestId }),
        ...(context.method && { method: context.method }),
        ...(context.route && { route: context.route }),
      });
      if (context.userId) scope.setUser({ id: context.userId });

      Sentry.captureException(error);
    });
  },

  async flush(timeoutMs) {
    await Sentry.flush(timeoutMs);
  },

  startSpan(options, work) {
    return Sentry.startSpan({ name: options.name, op: options.op }, work);
  },
};
