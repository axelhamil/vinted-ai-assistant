import { ApiError } from "@google/genai";
import { Option } from "@packages/ddd-kit";

export type AiFailureCode =
  | "AI_RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_REJECTED"
  | "AI_INVALID_OUTPUT"
  | "AI_NO_IMAGE"
  | "IMAGE_FETCH_FAILED"
  | "IMAGE_HOST_FORBIDDEN"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_INVALID";

export interface AiFailure {
  code: AiFailureCode;
  message: string;
  status: Option<number>;
}

const ABORT_NAMES = new Set(["TimeoutError", "AbortError"]);

export function aiFailure(
  code: AiFailureCode,
  message: string,
  status: Option<number> = Option.none(),
): AiFailure {
  return { code, message, status };
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

  const reason = error instanceof Error ? error.message : String(error);

  return aiFailure("AI_UNAVAILABLE", `Gemini could not be reached: ${reason}`);
}
