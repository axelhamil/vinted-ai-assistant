import type { AiFailure } from "@packages/ai/failures";
import type { GeminiClient } from "@packages/ai/gemini-client";
import { type ILogger, Result } from "@packages/ddd-kit";
import { z } from "zod";
import type { AnalysisAiFailure } from "../../application/ports/listing-facts-reader.port";
import type {
  INegotiationWriter,
  NegotiationRequest,
} from "../../application/ports/negotiation-writer.port";
import type { Negotiation } from "../../domain/analysis.aggregate";
import type { Price } from "../../domain/value-objects/price.vo";
import { toAnalysisAiFailure } from "./ai-failure.mapping";
import { negotiationPrompt } from "./prompts/negotiation.prompt";

const negotiationSchema = z.object({
  script: z.string().min(1),
  arguments: z.array(z.string()).min(1),
});

function mentionsOffer(script: string, offer: Price): boolean {
  const wholeEuros = Math.round(offer.value / 100);
  const figure = new RegExp(
    `(?<![\\d.,])${wholeEuros}(?:[.,]\\d{1,2})?(?![.,]?\\d)`,
  );

  return figure.test(script);
}

export class GeminiNegotiationWriter implements INegotiationWriter {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly logger: ILogger,
  ) {}

  private logFailure(
    request: NegotiationRequest,
    code: string,
    detail: string,
  ): void {
    this.logger.warn(
      { vintedId: request.listing.vintedId.value, code, detail },
      "[Analysis] negotiation script could not be written",
    );
  }

  private modelFailed(
    request: NegotiationRequest,
    failure: AiFailure,
  ): Result<Negotiation, AnalysisAiFailure> {
    this.logFailure(request, failure.code, failure.detail);

    return Result.fail(toAnalysisAiFailure(failure));
  }

  async write(
    request: NegotiationRequest,
  ): Promise<Result<Negotiation, AnalysisAiFailure>> {
    const answer = await this.gemini.generateStructured({
      ...negotiationPrompt(request),
      images: [],
      schema: negotiationSchema,
      search: false,
    });
    if (answer.isFailure) return this.modelFailed(request, answer.getError());

    const { script, arguments: reasons } = answer.getValue().data;

    if (!mentionsOffer(script, request.offerCents)) {
      this.logFailure(
        request,
        "OFFER_MISSING",
        `The script does not state the offer of ${request.offerCents.value} cents: ${script}`,
      );

      return Result.fail("ANALYSIS_AI_PROVIDER_FAILURE");
    }

    return Result.ok({ script, arguments: reasons, tone: request.tone });
  }
}
