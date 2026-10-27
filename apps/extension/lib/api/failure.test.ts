import { describe, expect, it } from "vitest";
import { NETWORK_FAILURE_MESSAGE, toFailure } from "./failure";

describe("toFailure", () => {
  it("keeps the api error code, message and request id", async () => {
    const error = {
      code: "ANALYSIS_AI_RATE_LIMITED",
      message: "The AI provider is rate limited. Retry in a minute.",
      requestId: "req-1",
    };

    const failure = await toFailure(Response.json({ error }, { status: 429 }));

    expect(failure).toEqual({ kind: "api", ...error });
  });

  it("reads a rejected fetch as an unreachable server", async () => {
    const failure = await toFailure(new TypeError("Failed to fetch"));

    expect(failure).toEqual({
      kind: "network",
      message: NETWORK_FAILURE_MESSAGE,
    });
  });

  it("keeps the status of a body that is not an api error", async () => {
    const failure = await toFailure(
      new Response("<html>Bad Gateway</html>", { status: 502 }),
    );

    expect(failure).toMatchObject({ kind: "api", code: "HTTP_502" });
    expect(failure.kind === "api" && failure.message).toContain("502");
  });
});
