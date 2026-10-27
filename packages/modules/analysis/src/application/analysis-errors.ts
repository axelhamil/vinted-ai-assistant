import type {
  AnalysisNotFound,
  AnalysisRecordIntegrityFailed,
  AnalysisStatusConflict,
  AnalysisStoreUnavailable,
} from "./ports/analysis.repository.port";
import type {
  AnalysisAiFailure,
  AnalysisPhotoFailure,
} from "./ports/listing-facts-reader.port";
import type { AnalysisInputInvalid } from "./services/analysis-input";

export type AnalysisErrorCode =
  | AnalysisInputInvalid
  | AnalysisNotFound
  | AnalysisStatusConflict
  | AnalysisRecordIntegrityFailed
  | AnalysisStoreUnavailable
  | AnalysisAiFailure
  | AnalysisPhotoFailure;

export const ANALYSIS_ERROR_MESSAGES: Record<AnalysisErrorCode, string> = {
  ANALYSIS_INPUT_INVALID:
    "The listing data or parameters are invalid. Check the Vinted id, prices, photos, language, status or tone, then retry.",
  ANALYSIS_NOT_FOUND:
    "No analysis exists for this Vinted listing. Analyze the listing first, then retry.",
  ANALYSIS_STATUS_CONFLICT:
    "The analysis changed since it was read, or its current status cannot move to the requested one. Reload the analysis, then retry.",
  ANALYSIS_RECORD_INTEGRITY_FAILED:
    "The stored analysis of this listing can no longer be read. Analyze the listing again to replace it.",
  ANALYSIS_STORE_UNAVAILABLE:
    "The analysis store cannot be reached right now. Retry in a moment.",
  ANALYSIS_AI_RATE_LIMITED:
    "The AI provider is limiting requests right now. Wait a minute, then retry.",
  ANALYSIS_AI_UNAVAILABLE:
    "The AI provider is unavailable right now. Retry in a few minutes.",
  ANALYSIS_AI_TIMEOUT:
    "The AI provider took too long to answer. Retry the analysis in a moment.",
  ANALYSIS_AI_PROVIDER_FAILURE:
    "The AI provider gave an unusable answer for this listing. Retry the analysis.",
  ANALYSIS_PHOTO_INVALID:
    "A photo of the listing cannot be analysed: send Vinted image urls of at most 10 MB each, then retry.",
  ANALYSIS_PHOTO_PROVIDER_FAILURE:
    "The photos of the listing could not be downloaded from Vinted. Retry in a moment.",
};
