import {
  type ILogger,
  type IUnitOfWork,
  Option,
  Result,
  type UseCase,
} from "@packages/ddd-kit";
import { Analysis, type AnalysisInput } from "../../domain/analysis.aggregate";
import type { Listing } from "../../domain/listing";
import { daysListed } from "../../domain/services/pricing";
import { NegotiationTone } from "../../domain/value-objects/negotiation-tone.vo";
import type { AnalyzeListingInput } from "../dto/analysis.dto";
import type {
  AnalysisRecordIntegrityFailed,
  AnalysisStoreUnavailable,
  IAnalysisRepository,
} from "../ports/analysis.repository.port";
import type {
  AnalysisAiFailure,
  AnalysisPhotoFailure,
  IListingFactsReader,
  ListingFactsReading,
} from "../ports/listing-facts-reader.port";
import type { INegotiationWriter } from "../ports/negotiation-writer.port";
import {
  type AnalysisInputInvalid,
  toListing,
} from "../services/analysis-input";

export type AnalyzeListingFailure =
  | AnalysisInputInvalid
  | AnalysisStoreUnavailable
  | AnalysisAiFailure
  | AnalysisPhotoFailure;

const INTEGRITY_FAILED: AnalysisRecordIntegrityFailed =
  "ANALYSIS_RECORD_INTEGRITY_FAILED";
const FACTS_REFUSED = "ANALYSIS_AI_PROVIDER_FAILURE";
const DEFAULT_TONE = NegotiationTone.create("friendly");

export class AnalyzeListingUseCase
  implements UseCase<AnalyzeListingInput, Analysis, AnalyzeListingFailure>
{
  constructor(
    private readonly repository: IAnalysisRepository,
    private readonly factsReader: IListingFactsReader,
    private readonly negotiationWriter: INegotiationWriter,
    private readonly unitOfWork: IUnitOfWork,
    private readonly logger: ILogger,
    private readonly clock: () => Date,
  ) {}

  async execute(
    input: AnalyzeListingInput,
  ): Promise<Result<Analysis, AnalyzeListingFailure>> {
    const parsed = toListing(input.listing);
    if (parsed.isFailure) return Result.fail(parsed.getError());

    const listing = parsed.getValue();
    const now = this.clock();

    const found = await this.findStored(listing);
    if (found.isFailure) return Result.fail(found.getError());

    const stored = found.getValue();
    const isReusable = stored
      .map((analysis) => !input.forceRefresh && analysis.isFresh(now))
      .unwrapOr(false);
    if (isReusable) return Result.ok(stored.unwrap());

    const reading = await this.factsReader.read(listing);
    if (reading.isFailure) return Result.fail(reading.getError());

    const assessed = await this.assess(
      listing,
      reading.getValue(),
      now,
      stored,
    );
    if (assessed.isFailure) return Result.fail(assessed.getError());

    const analysis = assessed.getValue();
    const saved = await this.unitOfWork.run(() =>
      this.repository.save(analysis),
    );

    return saved.map((id) => analysis.storedAs(id));
  }

  private async findStored(
    listing: Listing,
  ): Promise<Result<Option<Analysis>, AnalysisStoreUnavailable>> {
    const found = await this.repository.findByVintedId(listing.vintedId);
    if (found.isSuccess) return Result.ok(found.getValue());

    const error = found.getError();
    if (error !== INTEGRITY_FAILED) return Result.fail(error);

    this.logger.warn(
      { vintedId: listing.vintedId.value, cause: error },
      "[Analysis] unreadable stored analysis replaced by a new one",
    );

    return Result.ok(Option.none());
  }

  private async assess(
    listing: Listing,
    { facts, groundingSources }: ListingFactsReading,
    now: Date,
    stored: Option<Analysis>,
  ): Promise<Result<Analysis, AnalysisAiFailure>> {
    const offer = Analysis.suggestedOfferFor(listing, facts, now);
    if (offer.isFailure) return this.refuseFacts(listing);

    const negotiation = await this.negotiationWriter.write({
      listing,
      offerCents: offer.getValue(),
      marketAverageCents: facts.market.averageCents,
      daysListed: daysListed(listing.listedAt, now),
      tone: stored
        .map((analysis) => analysis.get("negotiation").tone)
        .unwrapOr(DEFAULT_TONE.getValue()),
      language: listing.language,
    });
    if (negotiation.isFailure) return Result.fail(negotiation.getError());

    const analysisInput: AnalysisInput = {
      listing,
      facts,
      groundingSources,
      negotiation: negotiation.getValue(),
      now,
    };
    const analysis = stored.isSome()
      ? this.refreshed(stored.unwrap(), analysisInput)
      : Analysis.create(analysisInput);
    if (analysis.isFailure) return this.refuseFacts(listing);

    return Result.ok(analysis.getValue());
  }

  private refreshed(
    analysis: Analysis,
    analysisInput: AnalysisInput,
  ): Result<Analysis, "ANALYSIS_INPUT_INVALID"> {
    return analysis.refresh(analysisInput).map(() => analysis);
  }

  private refuseFacts(listing: Listing): Result<Analysis, AnalysisAiFailure> {
    this.logger.warn(
      { vintedId: listing.vintedId.value, cause: "ANALYSIS_INPUT_INVALID" },
      "[Analysis] model facts refused by the domain",
    );

    return Result.fail(FACTS_REFUSED);
  }
}
