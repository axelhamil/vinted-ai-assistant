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
  detail: string;
  status: Option<number>;
}

const MESSAGES: Record<AiFailureCode, string> = {
  AI_RATE_LIMITED:
    "The AI service is receiving too many requests. Try again in a minute.",
  AI_UNAVAILABLE:
    "The AI service is unavailable right now. Try again in a few minutes.",
  AI_TIMEOUT: "The AI service took too long to answer. Try again.",
  AI_REJECTED:
    "The AI service refused this request. Change the listing photos or text and try again.",
  AI_INVALID_OUTPUT:
    "The AI service returned an answer that could not be read. Try again.",
  AI_NO_IMAGE:
    "The AI service did not return an image. Try again with another photo.",
  IMAGE_FETCH_FAILED:
    "A listing photo could not be downloaded. Reload the listing and try again.",
  IMAGE_HOST_FORBIDDEN:
    "Only photos hosted by Vinted can be analysed. Use the photos of the listing.",
  IMAGE_TOO_LARGE:
    "A listing photo is too large to analyse. Use a photo under 10 MB.",
  IMAGE_INVALID:
    "A listing photo is not a readable image. Use another photo of the listing.",
};

const ABORT_NAMES = new Set(["TimeoutError", "AbortError"]);

export function aiFailure(
  code: AiFailureCode,
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

  const reason = error instanceof Error ? error.message : String(error);

  return aiFailure("AI_UNAVAILABLE", `Gemini could not be reached: ${reason}`);
}
