import { describe, expect, it } from "bun:test";
import { db } from "@packages/testing/clone-database";
import { silentLogger } from "../../../common/logger";
import { createApp } from "../../composition/app";
import { PostgresDatabaseProbe } from "./postgres-database-probe";

function checkedOutClients(): number {
  return db.$client.totalCount - db.$client.idleCount;
}

describe("the readiness probe on the real database", () => {
  it("answers ready 200 against the test database", async () => {
    const app = createApp({
      env: { NODE_ENV: "test" },
      logger: silentLogger,
      report: () => {},
      databaseProbe: new PostgresDatabaseProbe(db.$client, silentLogger),
    });

    const response = await app.request("/health/ready");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("gives up on a stalled database and hands its connection back to the pool", async () => {
    const probe = new PostgresDatabaseProbe(db.$client, silentLogger, {
      timeoutMs: 2_000,
      statement: "select pg_sleep(5)",
    });
    const startedAt = performance.now();

    const result = await probe.check();
    const elapsedMs = performance.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.getError()).toBe("DATABASE_UNAVAILABLE");
    expect(elapsedMs).toBeLessThanOrEqual(2_500);
    expect(checkedOutClients()).toBe(0);
  });
});
