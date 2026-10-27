import { type IUnitOfWork, Result, type UseCase } from "@packages/ddd-kit";
import type { Analysis } from "../../domain/analysis.aggregate";
import { daysListed } from "../../domain/services/pricing";
import { NegotiationTone } from "../../domain/value-objects/negotiation-tone.vo";
import type { RegenerateNegotiationInput } from "../dto/analysis.dto";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import type { AnalysisAiFailure } from "../ports/listing-facts-reader.port";
import type { INegotiationWriter } from "../ports/negotiation-writer.port";
import { INPUT_INVALID } from "../services/analysis-input";
import {
  findStoredAnalysis,
  type StoredAnalysisFailure,
  storeAnalysis,
} from "../services/stored-analysis";

export type RegenerateNegotiationFailure =
  | StoredAnalysisFailure
  | AnalysisAiFailure;

export class RegenerateNegotiationUseCase
  implements
    UseCase<RegenerateNegotiationInput, Analysis, RegenerateNegotiationFailure>
{
  constructor(
    private readonly repository: IAnalysisRepository,
    private readonly negotiationWriter: INegotiationWriter,
    private readonly unitOfWork: IUnitOfWork,
    private readonly clock: () => Date,
  ) {}

  async execute(
    input: RegenerateNegotiationInput,
  ): Promise<Result<Analysis, RegenerateNegotiationFailure>> {
    const tone = NegotiationTone.parse(input.tone);
    if (tone.isFailure) return Result.fail(INPUT_INVALID);

    const found = await findStoredAnalysis(this.repository, input.vintedId);
    if (found.isFailure) return Result.fail(found.getError());

    const analysis = found.getValue();
    const listing = analysis.get("listing");
    const negotiation = await this.negotiationWriter.write({
      listing,
      offerCents: analysis.suggestedOfferCents(),
      marketAverageCents: analysis.get("facts").market.averageCents,
      daysListed: daysListed(listing.listedAt, this.clock()),
      tone: tone.getValue(),
      language: listing.language,
    });
    if (negotiation.isFailure) return Result.fail(negotiation.getError());

    analysis.replaceNegotiation(negotiation.getValue());

    return storeAnalysis(this.repository, this.unitOfWork, analysis);
  }
}
