import type {
  AiFailure,
  AiFailureCode,
  ImageIntakeCode,
} from "@packages/ai/failures";
import type {
  AnalysisAiFailure,
  AnalysisPhotoFailure,
} from "../../application/ports/listing-facts-reader.port";

const AI_ERRORS: Record<AiFailureCode, AnalysisAiFailure> = {
  AI_RATE_LIMITED: "ANALYSIS_AI_RATE_LIMITED",
  AI_UNAVAILABLE: "ANALYSIS_AI_UNAVAILABLE",
  AI_TIMEOUT: "ANALYSIS_AI_TIMEOUT",
  AI_REJECTED: "ANALYSIS_AI_PROVIDER_FAILURE",
  AI_INVALID_OUTPUT: "ANALYSIS_AI_PROVIDER_FAILURE",
  AI_NO_IMAGE: "ANALYSIS_AI_PROVIDER_FAILURE",
};

const PHOTO_ERRORS: Record<ImageIntakeCode, AnalysisPhotoFailure> = {
  IMAGE_HOST_FORBIDDEN: "ANALYSIS_PHOTO_INVALID",
  IMAGE_INVALID: "ANALYSIS_PHOTO_INVALID",
  IMAGE_TOO_LARGE: "ANALYSIS_PHOTO_INVALID",
  IMAGE_FETCH_FAILED: "ANALYSIS_PHOTO_PROVIDER_FAILURE",
};

function isAiFailureCode(
  code: AiFailureCode | ImageIntakeCode,
): code is AiFailureCode {
  return Object.hasOwn(AI_ERRORS, code);
}

export function toAnalysisFailure(
  failure: AiFailure,
): AnalysisAiFailure | AnalysisPhotoFailure {
  const { code } = failure;

  return isAiFailureCode(code) ? AI_ERRORS[code] : PHOTO_ERRORS[code];
}

export function toAnalysisAiFailure(failure: AiFailure): AnalysisAiFailure {
  const { code } = failure;

  return isAiFailureCode(code)
    ? AI_ERRORS[code]
    : "ANALYSIS_AI_PROVIDER_FAILURE";
}
