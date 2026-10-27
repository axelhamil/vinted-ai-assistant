import type { AiFailure, AiFailureCode, ImageIntakeCode } from "./failures";

type ModuleFailureSuffix =
  | "AI_RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_FAILURE"
  | "PHOTO_INVALID"
  | "PHOTO_PROVIDER_FAILURE";

export type ModuleFailureCode<P extends string> = `${P}_${ModuleFailureSuffix}`;

const SUFFIXES: Record<AiFailureCode | ImageIntakeCode, ModuleFailureSuffix> = {
  AI_RATE_LIMITED: "AI_RATE_LIMITED",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_REJECTED: "AI_PROVIDER_FAILURE",
  AI_INVALID_OUTPUT: "AI_PROVIDER_FAILURE",
  AI_NO_IMAGE: "AI_PROVIDER_FAILURE",
  IMAGE_HOST_FORBIDDEN: "PHOTO_INVALID",
  IMAGE_INVALID: "PHOTO_INVALID",
  IMAGE_TOO_LARGE: "PHOTO_INVALID",
  IMAGE_FETCH_FAILED: "PHOTO_PROVIDER_FAILURE",
};

export function moduleFailureCode<P extends string>(
  prefix: P,
  failure: AiFailure,
): ModuleFailureCode<P> {
  return `${prefix}_${SUFFIXES[failure.code]}`;
}
