import { moduleFailureCode } from "@packages/ai/failure-codes";
import type { AiFailure } from "@packages/ai/failures";
import type { StudioAiCode } from "../../errors";

export function toStudioFailure(failure: AiFailure): StudioAiCode {
  return moduleFailureCode("STUDIO", failure);
}
