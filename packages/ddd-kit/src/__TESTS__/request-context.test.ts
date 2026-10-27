import { describe, expect, it } from "bun:test";
import { RequestContext } from "../index";

describe("RequestContext", () => {
  it("has no request outside a run", () => {
    expect(RequestContext.current().isNone()).toBe(true);
  });

  it("exposes the request id to nested async work inside a run", async () => {
    const seen = await RequestContext.run({ requestId: "req-1" }, async () => {
      await Promise.resolve();

      return new Promise<string | undefined>((resolve) =>
        setTimeout(
          () =>
            resolve(
              RequestContext.current()
                .map(({ requestId }) => requestId)
                .toUndefined(),
            ),
          0,
        ),
      );
    });

    expect(seen).toBe("req-1");
  });
});
