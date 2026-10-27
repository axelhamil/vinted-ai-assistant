import { describe, expect, it, mock } from "bun:test";
import { Option, Result } from "../index";

describe("Option", () => {
  it("reads null and undefined as none, and keeps falsy values as some", () => {
    expect(Option.fromNullable(null).isNone()).toBe(true);
    expect(Option.fromNullable(undefined).isNone()).toBe(true);
    expect(Option.fromNullable(0).unwrap()).toBe(0);
    expect(Option.fromNullable("").unwrap()).toBe("");
    expect(Option.fromNullable(false).unwrap()).toBe(false);
  });

  it("refuses to unwrap a none", () => {
    expect(() => Option.none<number>().unwrap()).toThrow();
  });

  it("goes back to null at the storage edge", () => {
    expect(Option.some("clip").toNull()).toBe("clip");
    expect(Option.none<string>().toNull()).toBeNull();
  });

  it("becomes a result that fails with the given error when the value is absent", () => {
    const notFound = mock(() => ({ code: "CLIP_NOT_FOUND" }));

    expect(Option.some("clip").toResult(notFound).getValue()).toBe("clip");
    expect(notFound).not.toHaveBeenCalled();
    expect(Option.none<string>().toResult(notFound).getError()).toEqual({
      code: "CLIP_NOT_FOUND",
    });
    expect(Option.none<string>().toResult("missing").getError()).toBe(
      "missing",
    );
  });

  it("tells two options apart by their values, through the given comparison when there is one", () => {
    const sameLength = (left: string, right: string) =>
      left.length === right.length;

    expect(Option.none<string>().equals(Option.none())).toBe(true);
    expect(Option.none<string>().equals(Option.some("clip"))).toBe(false);
    expect(Option.some("clip").equals(Option.none())).toBe(false);
    expect(Option.some("clip").equals(Option.some("clip"))).toBe(true);
    expect(Option.some("clip").equals(Option.some("reel"))).toBe(false);
    expect(Option.some("clip").equals(Option.some("reel"), sameLength)).toBe(
      true,
    );
  });

  it("reads a nullable stored value through a creation that can fail", () => {
    const positive = (value: number) =>
      value > 0
        ? Result.ok<number>(value)
        : Result.fail<number>("must be positive");

    expect(
      Option.fromNullable<number>(null).tryMap(positive).getValue().isNone(),
    ).toBe(true);
    expect(Option.fromNullable(3).tryMap(positive).getValue().unwrap()).toBe(3);
    expect(Option.fromNullable(-3).tryMap(positive).getError()).toBe(
      "must be positive",
    );
  });
});
