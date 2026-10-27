import { describe, expect, it } from "bun:test";
import { moduleFailureCode } from "../failure-codes";
import { aiFailure } from "../failures";

describe("moduleFailureCode", () => {
  it.each([
    ["AI_RATE_LIMITED", "STUDIO_AI_RATE_LIMITED"],
    ["AI_UNAVAILABLE", "STUDIO_AI_UNAVAILABLE"],
    ["AI_TIMEOUT", "STUDIO_AI_TIMEOUT"],
    ["AI_REJECTED", "STUDIO_AI_PROVIDER_FAILURE"],
    ["AI_INVALID_OUTPUT", "STUDIO_AI_PROVIDER_FAILURE"],
    ["AI_NO_IMAGE", "STUDIO_AI_PROVIDER_FAILURE"],
    ["IMAGE_HOST_FORBIDDEN", "STUDIO_PHOTO_INVALID"],
    ["IMAGE_INVALID", "STUDIO_PHOTO_INVALID"],
    ["IMAGE_TOO_LARGE", "STUDIO_PHOTO_INVALID"],
    ["IMAGE_FETCH_FAILED", "STUDIO_PHOTO_PROVIDER_FAILURE"],
  ] as const)("maps %s to %s under the module prefix", (code, expected) => {
    expect(moduleFailureCode("STUDIO", aiFailure(code, "detail"))).toBe(
      expected,
    );
  });
});
