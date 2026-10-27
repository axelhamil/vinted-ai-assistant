import type { Result } from "@packages/ddd-kit";
import type { EditInstruction } from "../../domain/value-objects/edit-instruction.vo";
import type { StudioAiCode } from "../../errors";

export type PhotoEditRequest =
  | { image: string; background: string }
  | { image: string; instruction: EditInstruction };

export interface EditedPhoto {
  mimeType: string;
  bytes: Uint8Array;
}

export interface IPhotoEditor {
  edit(request: PhotoEditRequest): Promise<Result<EditedPhoto, StudioAiCode>>;
}
