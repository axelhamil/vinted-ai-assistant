import { describe, expect, it } from "bun:test";
import { parseEnv } from "./env";

const DATABASE_URL = "postgres://x";

describe("the api environment", () => {
  it("refuses a missing database url and names it", () => {
    const result = parseEnv({});

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain("DATABASE_URL");
  });

  it("treats a blank variable as unset", () => {
    const result = parseEnv({ DATABASE_URL, SENTRY_DSN: "  " });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().SENTRY_DSN.isNone()).toBe(true);
  });

  it("defaults the port to 3000 and the log level to info", () => {
    const env = parseEnv({ DATABASE_URL }).getValue();

    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("refuses a port outside 1..65535", () => {
    const result = parseEnv({ DATABASE_URL, PORT: "70000" });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain("PORT");
  });
});
