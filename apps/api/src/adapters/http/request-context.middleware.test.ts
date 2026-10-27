import { describe, expect, it } from "bun:test";
import { Writable } from "node:stream";
import { type IInstrumentation, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { createJsonLogger } from "../../../common/logger";
import { createApp } from "../../composition/app";
import type { IDatabaseProbe } from "../../ports/database-probe.port";
import { createSentryInstrumentation } from "../instrumentation/sentry-instrumentation";

interface ListingReader {
  read(vintedId: string): Promise<Result<string, string>>;
}

function failingRepository(instrumentation: IInstrumentation): ListingReader {
  return {
    async read() {
      await Promise.resolve();
      instrumentation.capture(new Error("connection terminated"));

      return Result.fail("ANALYSIS_STORE_UNAVAILABLE");
    },
  };
}

function givenApi() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(String(chunk)));
      done();
    },
  });
  const logger = createJsonLogger("info", destination);
  const repository = failingRepository(createSentryInstrumentation(logger));

  const api = createApp({
    env: { NODE_ENV: "test" },
    logger,
    report: () => {},
    databaseProbe: mockPort<IDatabaseProbe>(),
  });
  api.get("/listings/:vintedId", async (c) => {
    logger.info({}, "reading listing");
    const read = await repository.read(c.req.param("vintedId"));

    return c.json({ failed: read.isFailure }, 503);
  });

  return { api, lines };
}

function linesWithMessage(lines: Record<string, unknown>[], msg: string) {
  return lines.filter((line) => line.msg === msg);
}

describe("the request context", () => {
  it("stamps the response's request id on the handler and repository failure logs", async () => {
    const { api, lines } = givenApi();

    const response = await api.request("/listings/4815162342");
    const requestId = response.headers.get("x-request-id");

    expect(requestId).toEqual(expect.any(String));
    expect(linesWithMessage(lines, "reading listing")).toEqual([
      expect.objectContaining({ requestId }),
    ]);
    expect(linesWithMessage(lines, "[Instrumentation] captured error")).toEqual(
      [expect.objectContaining({ requestId })],
    );
  });
});
