import { afterEach, describe, expect, it } from "bun:test";
import { createDb } from "@packages/drizzle/config";
import pino from "pino";
import { watchPoolErrors } from "./pool";

const db = createDb("postgres://postgres:postgres@localhost:1/unused");

afterEach(() => db.$client.removeAllListeners("error"));

describe("watching the database pool", () => {
  it("logs a lost pooled connection instead of crashing the process", () => {
    const messages: string[] = [];
    const logger = pino(
      {},
      {
        write: (line: string) => {
          const parsed: unknown = JSON.parse(line);
          if (typeof parsed === "object" && parsed !== null && "msg" in parsed)
            messages.push(String(parsed.msg));
        },
      },
    );
    watchPoolErrors(db.$client, logger);

    db.$client.emit("error", new Error("connection terminated"));

    expect(messages).toEqual(["[Database] a pooled connection was lost"]);
  });
});
