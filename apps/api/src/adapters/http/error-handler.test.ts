import { describe, expect, it, mock } from "bun:test";
import { AppErrorException } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { HTTPException } from "hono/http-exception";
import { silentLogger } from "../../../common/logger";
import { createApp } from "../../composition/app";
import type { IDatabaseProbe } from "../../ports/database-probe.port";

const EXTENSION_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

function appIn(
  NODE_ENV: "development" | "test" | "production" = "test",
  report = mock(),
) {
  const app = createApp({
    env: { NODE_ENV },
    logger: silentLogger,
    report,
    databaseProbe: mockPort<IDatabaseProbe>(),
  });

  app.get("/typed", () => {
    throw new AppErrorException({
      code: "ANALYSIS_NOT_FOUND",
      message: "No analysis for this listing",
    });
  });
  app.get("/unexpected", () => {
    throw new Error('relation "x" does not exist');
  });
  app.get("/rejected", () => {
    throw new HTTPException(400, { message: "Malformed JSON in request body" });
  });
  app.get("/throttled", () => {
    throw new HTTPException(429, {
      message: "Too many analyses",
      res: new Response(null, { headers: { "Retry-After": "30" } }),
    });
  });
  app.get("/thrown-string", () => {
    throw "boom";
  });

  return app;
}

describe("the http error mapping", () => {
  it("maps a typed app error to its status", async () => {
    const response = await appIn().request("/typed");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "ANALYSIS_NOT_FOUND",
        message: "No analysis for this listing",
        requestId: expect.any(String),
      },
    });
  });

  it("hides an unexpected error behind SERVER_UNAVAILABLE and reports it", async () => {
    const report = mock();

    const response = await appIn("test", report).request("/unexpected");
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body).error.code).toBe("SERVER_UNAVAILABLE");
    expect(body).not.toContain("relation");
    expect(report).toHaveBeenCalledWith(
      expect.any(Error),
      JSON.parse(body).error.requestId,
    );
  });

  it("answers a thrown non error value like an unexpected error", async () => {
    const response = await appIn().request("/thrown-string");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "SERVER_UNAVAILABLE",
        message: expect.any(String),
        requestId: expect.any(String),
      },
    });
  });

  it("keeps the status and headers of a rejected request", async () => {
    const response = await appIn().request("/throttled");

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect((await response.json()).error.code).toBe("REQUEST_RATE_LIMITED");
  });

  it("answers a rejected request with REQUEST_INVALID and keeps its status", async () => {
    const response = await appIn().request("/rejected");

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("REQUEST_INVALID");
  });

  it("answers an unknown route with ROUTE_NOT_FOUND", async () => {
    const response = await appIn().request("/nowhere", { method: "POST" });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: expect.stringContaining("POST /nowhere"),
        requestId: expect.any(String),
      },
    });
  });
});

describe("the cross origin policy", () => {
  it("refuses a cross origin request from a web page", async () => {
    const app = appIn();

    const fromPage = await app.request("/health/live", {
      headers: { Origin: "https://evil.example" },
    });
    const fromExtension = await app.request("/health/live", {
      headers: { Origin: EXTENSION_ORIGIN },
    });

    expect(fromPage.headers.get("access-control-allow-origin")).toBeNull();
    expect(fromExtension.headers.get("access-control-allow-origin")).toBe(
      EXTENSION_ORIGIN,
    );
  });

  it("allows a localhost page in development only", async () => {
    const origin = { Origin: "http://localhost:5173" };

    const inDevelopment = await appIn("development").request("/health/live", {
      headers: origin,
    });
    const inProduction = await appIn("production").request("/health/live", {
      headers: origin,
    });

    expect(inDevelopment.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(inProduction.headers.get("access-control-allow-origin")).toBeNull();
  });
});
