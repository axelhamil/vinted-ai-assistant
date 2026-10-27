import { describe, expect, it } from "vitest";
import { fitWithin } from "./downscale";

describe("fitWithin", () => {
  it("shrinks the longest edge to the limit and keeps the ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("never upscales a photo already within the limit", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
