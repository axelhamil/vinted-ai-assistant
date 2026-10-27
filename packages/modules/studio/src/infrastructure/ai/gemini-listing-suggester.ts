import { moduleFailureCode } from "@packages/ai/failure-codes";
import type { AiFailure } from "@packages/ai/failures";
import type { GeminiClient } from "@packages/ai/gemini-client";
import { type ILogger, Option, Result } from "@packages/ddd-kit";
import type {
  IListingSuggester,
  ListingSuggestionRequest,
  SuggesterReading,
} from "../../application/ports/listing-suggester.port";
import type { ListingSuggestionFacts } from "../../domain/listing-suggestion";
import type { StudioAiCode } from "../../errors";
import type { ImageReader } from "./image-reader";
import { listingSuggestionPrompt } from "./prompts/listing-suggestion.prompt";
import {
  type ListingSuggestionAnswer,
  listingSuggestionSchema,
} from "./suggestion.schema";

const SUGGESTED_PHOTOS = 10;

function toFacts({
  suggestedPriceEuros,
  ...answer
}: ListingSuggestionAnswer): ListingSuggestionFacts {
  return {
    ...answer,
    brand: Option.fromNullable(answer.brand),
    category: Option.fromNullable(answer.category),
    size: Option.fromNullable(answer.size),
    material: Option.fromNullable(answer.material),
    priceCents: Math.round(suggestedPriceEuros * 100),
  };
}

export class GeminiListingSuggester implements IListingSuggester {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly readImage: ImageReader,
    private readonly logger: ILogger,
  ) {}

  private failed(failure: AiFailure): Result<SuggesterReading, StudioAiCode> {
    this.logger.warn(
      { code: failure.code, detail: failure.detail },
      "[Studio] listing could not be suggested",
    );

    return Result.fail(moduleFailureCode("STUDIO", failure));
  }

  async suggest(
    request: ListingSuggestionRequest,
  ): Promise<Result<SuggesterReading, StudioAiCode>> {
    const photos = request.photos.slice(0, SUGGESTED_PHOTOS);
    const images = Result.all(
      await Promise.all(photos.map((photo) => this.readImage(photo))),
    );
    if (images.isFailure) return this.failed(images.getError());

    const answer = await this.gemini.generateStructured({
      ...listingSuggestionPrompt(request),
      images: images.getValue(),
      schema: listingSuggestionSchema,
      search: true,
    });
    if (answer.isFailure) return this.failed(answer.getError());

    const { data, sources } = answer.getValue();

    return Result.ok({ facts: toFacts(data), groundingSources: sources });
  }
}
