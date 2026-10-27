import { moduleFailureCode } from "@packages/ai/failure-codes";
import type { AiFailure } from "@packages/ai/failures";
import type { GeminiClient } from "@packages/ai/gemini-client";
import { type ILogger, Result } from "@packages/ddd-kit";
import type {
  EditedPhoto,
  IPhotoEditor,
  PhotoEditRequest,
} from "../../application/ports/photo-editor.port";
import type { StudioAiCode } from "../../errors";
import type { ImageReader } from "./image-reader";
import {
  instructionEditPrompt,
  presetEditPrompt,
} from "./prompts/photo-edit.prompt";

function editPrompt(request: PhotoEditRequest): string {
  if ("background" in request) return presetEditPrompt(request.background);

  return instructionEditPrompt(request.instruction);
}

export class GeminiPhotoEditor implements IPhotoEditor {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly readImage: ImageReader,
    private readonly logger: ILogger,
  ) {}

  private failed(failure: AiFailure): Result<EditedPhoto, StudioAiCode> {
    this.logger.warn(
      { code: failure.code, detail: failure.detail },
      "[Studio] photo could not be edited",
    );

    return Result.fail(moduleFailureCode("STUDIO", failure));
  }

  async edit(
    request: PhotoEditRequest,
  ): Promise<Result<EditedPhoto, StudioAiCode>> {
    const source = await this.readImage(request.image);
    if (source.isFailure) return this.failed(source.getError());

    const edited = await this.gemini.editImage({
      source: source.getValue(),
      instruction: editPrompt(request),
    });
    if (edited.isFailure) return this.failed(edited.getError());

    return Result.ok(edited.getValue());
  }
}
