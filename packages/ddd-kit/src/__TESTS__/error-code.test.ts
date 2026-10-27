import { describe, expect, it } from "bun:test";
import { type ErrorCode, type ErrorStatus, httpStatusFromCode } from "../index";

describe("httpStatusFromCode", () => {
  it.each<[ErrorCode, ErrorStatus]>([["AUTH_REQUIRED", 401]])(
    "maps %s to %i: the longest matching suffix wins",
    (code, status) => {
      expect(httpStatusFromCode(code)).toBe(status);
    },
  );
});
