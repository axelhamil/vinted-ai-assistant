import { describe, expect, it } from "bun:test";
import { db } from "@packages/testing/clone-database";
import pino from "pino";
import { createApp } from "../../composition/app";
import { PostgresDatabaseProbe } from "./database-probe";

describe("the readiness probe on the real database", () => {
  it("answers ready 200 against the test database", async () => {
    const logger = pino({ level: "silent" });
    const app = createApp({
      env: { NODE_ENV: "test" },
      logger,
      databaseProbe: new PostgresDatabaseProbe(db, logger),
    });

    const response = await app.request("/health/ready");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
