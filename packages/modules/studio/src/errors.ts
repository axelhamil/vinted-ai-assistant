export type StudioPresetNotFound = "STUDIO_PRESET_NOT_FOUND";

export type StudioInputInvalid = "STUDIO_INPUT_INVALID";

export type StudioAiCode =
  | "STUDIO_AI_RATE_LIMITED"
  | "STUDIO_AI_UNAVAILABLE"
  | "STUDIO_AI_TIMEOUT"
  | "STUDIO_AI_PROVIDER_FAILURE"
  | "STUDIO_PHOTO_INVALID"
  | "STUDIO_PHOTO_PROVIDER_FAILURE";

export type StudioErrorCode =
  | StudioPresetNotFound
  | StudioInputInvalid
  | StudioAiCode;

export const STUDIO_ERROR_MESSAGES: Record<StudioErrorCode, string> = {
  STUDIO_PRESET_NOT_FOUND:
    "This studio preset does not exist. Reload the preset list, then pick one of its presets.",
  STUDIO_INPUT_INVALID:
    "The studio request is invalid. Send an image with a preset id or an instruction of 10 to 1000 characters, or 1 to 10 photos with a supported language, then retry.",
  STUDIO_AI_RATE_LIMITED:
    "The AI provider is limiting requests right now. Wait a minute, then retry.",
  STUDIO_AI_UNAVAILABLE:
    "The AI provider is unavailable right now. Retry in a few minutes.",
  STUDIO_AI_TIMEOUT:
    "The AI provider took too long to answer. Retry in a moment.",
  STUDIO_AI_PROVIDER_FAILURE:
    "The AI provider gave an unusable answer for these photos. Retry, or try other photos.",
  STUDIO_PHOTO_INVALID:
    "A photo cannot be used: send Vinted image urls or base64 image data urls of at most 10 MB each, then retry.",
  STUDIO_PHOTO_PROVIDER_FAILURE:
    "The photos could not be downloaded from Vinted. Retry in a moment.",
};
