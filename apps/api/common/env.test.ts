import { describe, expect, it } from "bun:test";
import { parseEnv } from "./env";

const DATABASE_URL = "postgres://x";
const GEMINI_API_KEY = "a-gemini-key";

describe("the api environment", () => {
  it("refuses a missing database url and names it", () => {
    const result = parseEnv({});

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain("DATABASE_URL");
  });

  it("treats a blank variable as unset", () => {
    const result = parseEnv({ DATABASE_URL, GEMINI_API_KEY, SENTRY_DSN: "  " });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().SENTRY_DSN.isNone()).toBe(true);
  });

  it("defaults the port to 3000 and the log level to info", () => {
    const env = parseEnv({ DATABASE_URL, GEMINI_API_KEY }).getValue();

    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("refuses a port outside 1..65535", () => {
    const result = parseEnv({ DATABASE_URL, GEMINI_API_KEY, PORT: "70000" });

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain("PORT");
  });

  it.each([undefined, "", "   "])(
    "refuses a Gemini api key that is %p and names it",
    (key) => {
      const result = parseEnv({ DATABASE_URL, GEMINI_API_KEY: key });

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toContain("GEMINI_API_KEY");
    },
  );

  it("polls the outbox every 30 s by default", () => {
    const env = parseEnv({ DATABASE_URL, GEMINI_API_KEY }).getValue();

    expect(env.OUTBOX_POLL_INTERVAL_MS).toBe(30_000);
  });

  it.each(["999", "1500.5", "soon", "2147483648"])(
    "refuses an outbox poll interval of %p and names it",
    (interval) => {
      const result = parseEnv({
        DATABASE_URL,
        GEMINI_API_KEY,
        OUTBOX_POLL_INTERVAL_MS: interval,
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toContain("OUTBOX_POLL_INTERVAL_MS");
    },
  );
});
