import { LANGUAGES } from "@packages/ai/languages";
import { type ILogger, Option, Result } from "@packages/ddd-kit";
import { z } from "zod";
import { ListingSuggestion } from "../../domain/listing-suggestion";
import {
  presetOf,
  SYSTEM_PRESETS,
  type SystemPreset,
} from "../../domain/presets";
import { EditInstruction } from "../../domain/value-objects/edit-instruction.vo";
import { PresetId } from "../../domain/value-objects/preset-id.vo";
import type {
  StudioAiCode,
  StudioInputInvalid,
  StudioPresetNotFound,
} from "../../errors";
import type {
  GroundingSource,
  IListingSuggester,
  ListingSuggestionRequest,
} from "../ports/listing-suggester.port";
import type { EditedPhoto, IPhotoEditor } from "../ports/photo-editor.port";

const INPUT_INVALID: StudioInputInvalid = "STUDIO_INPUT_INVALID";
const PRESET_NOT_FOUND: StudioPresetNotFound = "STUDIO_PRESET_NOT_FOUND";
const SUGGESTION_REFUSED: StudioAiCode = "STUDIO_AI_PROVIDER_FAILURE";
const MAX_PHOTOS = 10;
const MAX_EXISTING_TITLE_LENGTH = 200;

const suggestionInputSchema = z.object({
  photos: z.array(z.string().min(1)).min(1).max(MAX_PHOTOS),
  language: z.enum(LANGUAGES),
  existingTitle: z.string().trim().max(MAX_EXISTING_TITLE_LENGTH).optional(),
});

export interface PresetEditInput {
  image: string;
  presetId: string;
}

export interface InstructionEditInput {
  image: string;
  instruction: string;
}

export interface SuggestListingInput {
  photos: string[];
  language: string;
  existingTitle?: string;
}

export interface SuggestedListing {
  suggestion: ListingSuggestion;
  groundingSources: GroundingSource[];
}

function toSuggestionRequest(
  input: SuggestListingInput,
): Result<ListingSuggestionRequest, StudioInputInvalid> {
  const parsed = suggestionInputSchema.safeParse(input);
  if (!parsed.success) return Result.fail(INPUT_INVALID);

  const { photos, language, existingTitle } = parsed.data;

  return Result.ok({
    photos,
    language,
    existingTitle: Option.fromNullable(existingTitle || null),
  });
}

export class StudioService {
  constructor(
    private readonly photoEditor: IPhotoEditor,
    private readonly listingSuggester: IListingSuggester,
    private readonly logger: ILogger,
  ) {}

  listPresets(): SystemPreset[] {
    return [...SYSTEM_PRESETS].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async editWithPreset({
    image,
    presetId,
  }: PresetEditInput): Promise<
    Result<EditedPhoto, StudioPresetNotFound | StudioAiCode>
  > {
    const id = PresetId.parse(presetId);
    if (id.isFailure) return Result.fail(PRESET_NOT_FOUND);

    const { background } = presetOf(id.getValue().value);

    return this.photoEditor.edit({ image, background });
  }

  async editWithInstruction({
    image,
    instruction,
  }: InstructionEditInput): Promise<
    Result<EditedPhoto, StudioInputInvalid | StudioAiCode>
  > {
    const parsed = EditInstruction.create(instruction);
    if (parsed.isFailure) return Result.fail(INPUT_INVALID);

    return this.photoEditor.edit({ image, instruction: parsed.getValue() });
  }

  async suggestListing(
    input: SuggestListingInput,
  ): Promise<Result<SuggestedListing, StudioInputInvalid | StudioAiCode>> {
    const request = toSuggestionRequest(input);
    if (request.isFailure) return Result.fail(request.getError());

    const reading = await this.listingSuggester.suggest(request.getValue());
    if (reading.isFailure) return Result.fail(reading.getError());

    const { facts, groundingSources } = reading.getValue();
    const suggestion = ListingSuggestion.create(facts);
    if (suggestion.isFailure) {
      this.logger.warn(
        { cause: suggestion.getError() },
        "[Studio] model listing suggestion refused by the domain",
      );

      return Result.fail(SUGGESTION_REFUSED);
    }

    return Result.ok({ suggestion: suggestion.getValue(), groundingSources });
  }
}
