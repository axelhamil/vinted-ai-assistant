import { moduleFailureCode } from "@packages/ai/failure-codes";
import type { AiFailure } from "@packages/ai/failures";
import type {
  AnalysisAiFailure,
  AnalysisPhotoFailure,
} from "../../application/ports/listing-facts-reader.port";

export function toAnalysisFailure(
  failure: AiFailure,
): AnalysisAiFailure | AnalysisPhotoFailure {
  return moduleFailureCode("ANALYSIS", failure);
}

export function toAnalysisAiFailure(failure: AiFailure): AnalysisAiFailure {
  const code = toAnalysisFailure(failure);

  return code === "ANALYSIS_PHOTO_INVALID" ||
    code === "ANALYSIS_PHOTO_PROVIDER_FAILURE"
    ? "ANALYSIS_AI_PROVIDER_FAILURE"
    : code;
}
