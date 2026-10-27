import { describe, expect, it } from "bun:test";
import { Result } from "../index";

describe("Result", () => {
  it("carries the value of a success and the typed error of a failure", () => {
    const success = Result.ok({ id: 1 });
    const failure = Result.fail<number, { code: string }>({
      code: "CLIP_NOT_FOUND",
    });

    expect(success.isSuccess).toBe(true);
    expect(success.isFailure).toBe(false);
    expect(success.getValue()).toEqual({ id: 1 });
    expect(failure.isFailure).toBe(true);
    expect(failure.isSuccess).toBe(false);
    expect(failure.getError()).toEqual({ code: "CLIP_NOT_FOUND" });
  });

  it("refuses to read the value of a failure and the error of a success", () => {
    const failure = Result.fail<number>("boom");
    const success = Result.ok(1);

    expect(() => failure.getValue()).toThrow();
    expect(() => success.getError()).toThrow();
  });

  it("combines to the first failure, typed errors included, or to a success when none failed", () => {
    const first = Result.fail<number>("first");
    const second = Result.fail<number>("second");
    const missing = Result.fail<number, { code: string }>({
      code: "CLIP_NOT_FOUND",
    });
    const invalid = Result.fail<string, { code: string }>({
      code: "CLIP_INVALID",
    });

    const failed = Result.combine([Result.ok(1), first, second]);
    const passed = Result.combine([Result.ok(1), Result.ok("two")]);
    const typed: Result<void, { code: string }> = Result.combine([
      missing,
      invalid,
    ]);

    expect(failed.getError()).toBe("first");
    expect(typed.getError()).toEqual({ code: "CLIP_NOT_FOUND" });
    expect(passed.isSuccess).toBe(true);
    expect(Result.combine([]).isSuccess).toBe(true);
  });

  it("gathers every value in order, or the first failure", () => {
    const title = Result.ok<string, { code: string }>("Clutch");
    const attempts = Result.ok<number, { code: string }>(2);
    const missing = Result.fail<boolean, { code: string }>({
      code: "CLIP_NOT_FOUND",
    });
    const invalid = Result.fail<boolean, { code: string }>({
      code: "CLIP_INVALID",
    });

    const gathered: Result<[string, number], { code: string }> = Result.all([
      title,
      attempts,
    ]);
    const failed = Result.all([title, missing, invalid]);
    const listed: Result<number[], { code: string }> = Result.all(
      [1, 2, 3].map(() => attempts),
    );

    expect(gathered.getValue()).toEqual(["Clutch", 2]);
    expect(failed.getError()).toEqual({ code: "CLIP_NOT_FOUND" });
    expect(listed.getValue()).toEqual([2, 2, 2]);
  });

  it("matches each case to its own branch and falls back only on a failure", () => {
    const describeResult = (result: Result<number>) =>
      result.match({
        ok: (value) => `ok ${value}`,
        fail: (error) => `fail ${error}`,
      });

    expect(describeResult(Result.ok(0))).toBe("ok 0");
    expect(describeResult(Result.fail("boom"))).toBe("fail boom");
    expect(Result.ok<number>(0).unwrapOr(7)).toBe(0);
    expect(Result.fail<number>("boom").unwrapOr(7)).toBe(7);
  });
});
