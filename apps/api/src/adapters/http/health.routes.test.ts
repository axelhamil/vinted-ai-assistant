import { describe, expect, it } from "bun:test";
import { Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import pino from "pino";
import { createApp } from "../../composition/app";
import type { IDatabaseProbe } from "./database-probe";

function appWith(probe: IDatabaseProbe) {
  return createApp({
    env: { NODE_ENV: "test" },
    logger: pino({ level: "silent" }),
    databaseProbe: probe,
  });
}

describe("the health routes", () => {
  it("answers live without touching the database", async () => {
    const probe = mockPort<IDatabaseProbe>();

    const response = await appWith(probe).request("/health/live");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(probe.check).not.toHaveBeenCalled();
  });

  it("answers ready 503 DATABASE_UNAVAILABLE when the database probe fails", async () => {
    const probe = mockPort<IDatabaseProbe>();
    probe.check.mockResolvedValue(Result.fail("DATABASE_UNAVAILABLE"));

    const response = await appWith(probe).request("/health/ready");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: expect.stringContaining("database"),
        requestId: expect.any(String),
      },
    });
  });

  it("answers ready 200 when the database probe succeeds", async () => {
    const probe = mockPort<IDatabaseProbe>();
    probe.check.mockResolvedValue(Result.ok());

    const response = await appWith(probe).request("/health/ready");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
