import type { AiFailure } from "@packages/ai/failures";
import type { GeminiClient } from "@packages/ai/gemini-client";
import type { InlineImage } from "@packages/ai/inline-image";
import { type ILogger, Option, Result } from "@packages/ddd-kit";
import type {
  AnalysisAiFailure,
  AnalysisPhotoFailure,
  IListingFactsReader,
  ListingFactsReading,
} from "../../application/ports/listing-facts-reader.port";
import type { Listing } from "../../domain/listing";
import type { ListingFacts } from "../../domain/listing-facts";
import { Price } from "../../domain/value-objects/price.vo";
import { PriceRange } from "../../domain/value-objects/price-range.vo";
import { Score } from "../../domain/value-objects/score.vo";
import { toAnalysisFailure } from "./ai-failure.mapping";
import { type ListingFactsAnswer, listingFactsSchema } from "./facts.schema";
import { listingFactsPrompt } from "./prompts/listing-facts.prompt";

export type ListingImageFetcher = (
  urls: string[],
) => Promise<Result<InlineImage[], AiFailure>>;

type ReadFailure = AnalysisAiFailure | AnalysisPhotoFailure;

const ANALYSED_PHOTOS = 10;

function cents(euros: number): Result<number> {
  return Price.fromEuros(euros).map((price) => price.value);
}

function toListingFacts(answer: ListingFactsAnswer): Result<ListingFacts> {
  const { market } = answer;
  const range = Result.all([
    cents(market.lowEuros),
    cents(market.averageEuros),
    cents(market.highEuros),
  ]).flatMap(([lowCents, averageCents, highCents]) =>
    PriceRange.create({ lowCents, averageCents, highCents }),
  );
  const scores = Result.combine([
    Score.create(answer.photoQuality.score),
    Score.create(answer.authenticity.score),
  ]);
  const retail = Option.fromNullable(market.retail).tryMap(
    ({ priceEuros, brand }) =>
      cents(priceEuros).map((priceCents) => ({ priceCents, brand })),
  );
  const sources = Result.all(
    market.sources.map(({ priceEuros, ...source }) =>
      cents(priceEuros).map((priceCents) => ({ ...source, priceCents })),
    ),
  );

  return Result.all([range, scores, retail, sources]).map(
    ([validRange, , validRetail, validSources]) => ({
      photoQuality: answer.photoQuality,
      authenticity: answer.authenticity,
      market: {
        ...validRange.value,
        confidence: market.confidence,
        reasoning: market.reasoning,
        retail: validRetail,
        sources: validSources,
      },
      detected: {
        brand: Option.fromNullable(answer.detected.brand),
        model: Option.fromNullable(answer.detected.model),
        condition: answer.detected.condition,
      },
      signals: answer.signals,
    }),
  );
}

export class GeminiListingFactsReader implements IListingFactsReader {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly fetchImages: ListingImageFetcher,
    private readonly logger: ILogger,
  ) {}

  private failed(
    listing: Listing,
    failure: AiFailure,
  ): Result<ListingFactsReading, ReadFailure> {
    this.logger.warn(
      {
        vintedId: listing.vintedId.value,
        code: failure.code,
        detail: failure.detail,
      },
      "[Analysis] listing facts could not be read",
    );

    return Result.fail(toAnalysisFailure(failure));
  }

  async read(
    listing: Listing,
  ): Promise<Result<ListingFactsReading, ReadFailure>> {
    const images = await this.fetchImages(
      listing.photos.slice(0, ANALYSED_PHOTOS),
    );
    if (images.isFailure) return this.failed(listing, images.getError());

    const answer = await this.gemini.generateStructured({
      ...listingFactsPrompt(listing),
      images: images.getValue(),
      schema: listingFactsSchema,
      search: true,
    });
    if (answer.isFailure) return this.failed(listing, answer.getError());

    const { data, sources } = answer.getValue();
    const facts = toListingFacts(data);

    if (facts.isFailure) {
      this.logger.warn(
        { vintedId: listing.vintedId.value, reason: facts.getError() },
        "[Analysis] the model answered facts that break the market rules",
      );

      return Result.fail("ANALYSIS_AI_PROVIDER_FAILURE");
    }

    return Result.ok({ facts: facts.getValue(), groundingSources: sources });
  }
}
