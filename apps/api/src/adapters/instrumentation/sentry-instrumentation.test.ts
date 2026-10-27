import { describe, expect, it } from "bun:test";
import type { ILogger } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { createSentryInstrumentation } from "./sentry-instrumentation";

describe("the Sentry instrumentation without a Sentry DSN", () => {
  it("still logs a captured error with its context", () => {
    const logger = mockPort<ILogger>();
    const error = new Error("relation analyses does not exist");

    createSentryInstrumentation(logger).capture(error, { route: "/api" });

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, route: "/api" },
      expect.any(String),
    );
  });
});
