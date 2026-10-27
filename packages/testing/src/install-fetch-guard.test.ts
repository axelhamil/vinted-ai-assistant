import { describe, expect, it } from "bun:test";
import { stubFetch, takeUnstubbedFetchCalls } from "./install-fetch-guard";

describe("the default test run", () => {
  it("refuses a network call and names only the host", async () => {
    const url = "https://api.example.com/v1/secret?token=abc123";

    const error = await fetch(url).catch((caught: unknown) => caught);

    expect(String(error)).toContain('"api.example.com"');
    expect(String(error)).not.toContain("abc123");
    expect(String(error)).not.toContain("/v1/secret");
    takeUnstubbedFetchCalls();
  });

  it("reports a network call even when the code under test swallows the error", async () => {
    const swallowingCode = async () => {
      try {
        return await fetch("https://swallowed.example.com/v1/secret");
      } catch {
        return null;
      }
    };

    const answer = await swallowingCode();

    expect(answer).toBeNull();
    expect(takeUnstubbedFetchCalls()).toEqual(["swallowed.example.com"]);
  });

  it("lets a test stub fetch, then refuses the network again in the next test", async () => {
    const stub = stubFetch(async () => new Response("stubbed"));

    const body = await (await fetch("https://stubbed.example.com")).text();

    expect(body).toBe("stubbed");
    expect(stub).toHaveBeenCalledWith("https://stubbed.example.com");
    expect(takeUnstubbedFetchCalls()).toEqual([]);
  });
});
