import { ApiError } from "@google/genai";
import { Option } from "@packages/ddd-kit";

export type AiFailureCode =
  | "AI_RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_REJECTED"
  | "AI_INVALID_OUTPUT"
  | "AI_NO_IMAGE";

export type ImageIntakeCode =
  | "IMAGE_FETCH_FAILED"
  | "IMAGE_HOST_FORBIDDEN"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_INVALID";

export interface AiFailure {
  code: AiFailureCode | ImageIntakeCode;
  message: string;
  detail: string;
  status: Option<number>;
}

const MESSAGES: Record<AiFailureCode | ImageIntakeCode, string> = {
  AI_RATE_LIMITED: "The AI service rate limit was reached.",
  AI_UNAVAILABLE: "The AI service is unavailable.",
  AI_TIMEOUT: "The AI service did not answer in time.",
  AI_REJECTED: "The AI service refused the request.",
  AI_INVALID_OUTPUT: "The AI service returned an unreadable answer.",
  AI_NO_IMAGE: "The AI service returned no image.",
  IMAGE_FETCH_FAILED: "The photo could not be downloaded.",
  IMAGE_HOST_FORBIDDEN: "The photo host is not allowed.",
  IMAGE_TOO_LARGE: "The photo exceeds the size limit.",
  IMAGE_INVALID: "The photo is not a readable image.",
};

const ABORT_NAMES = new Set(["TimeoutError", "AbortError"]);

export function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function aiFailure(
  code: AiFailureCode | ImageIntakeCode,
  detail: string,
  status: Option<number> = Option.none(),
): AiFailure {
  return { code, message: MESSAGES[code], detail, status };
}

function codeForStatus(status: number): AiFailureCode {
  if (status === 429) return "AI_RATE_LIMITED";
  if (status === 408) return "AI_TIMEOUT";
  if (status >= 500) return "AI_UNAVAILABLE";

  return "AI_REJECTED";
}

export function toAiFailure(error: unknown): AiFailure {
  if (error instanceof ApiError)
    return aiFailure(
      codeForStatus(error.status),
      `Gemini answered HTTP ${error.status}: ${error.message}`,
      Option.some(error.status),
    );

  if (error instanceof Error && ABORT_NAMES.has(error.name))
    return aiFailure("AI_TIMEOUT", "Gemini did not answer in time.");

  return aiFailure(
    "AI_UNAVAILABLE",
    `Gemini could not be reached: ${errorReason(error)}`,
  );
}
