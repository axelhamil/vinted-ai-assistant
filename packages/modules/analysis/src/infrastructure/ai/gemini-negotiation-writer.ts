import type { GeminiClient } from "@packages/ai/gemini-client";
import { type ILogger, Result } from "@packages/ddd-kit";
import { z } from "zod";
import type { AnalysisAiFailure } from "../../application/ports/listing-facts-reader.port";
import type {
  INegotiationWriter,
  NegotiationRequest,
} from "../../application/ports/negotiation-writer.port";
import type { Negotiation } from "../../domain/analysis.aggregate";
import { toAnalysisAiFailure } from "./ai-failure.mapping";
import { negotiationPrompt } from "./prompts/negotiation.prompt";

const negotiationSchema = z.object({
  script: z.string(),
  arguments: z.array(z.string()),
});

export class GeminiNegotiationWriter implements INegotiationWriter {
  constructor(
    private readonly gemini: GeminiClient,
    private readonly logger: ILogger,
  ) {}

  async write(
    request: NegotiationRequest,
  ): Promise<Result<Negotiation, AnalysisAiFailure>> {
    const answer = await this.gemini.generateStructured({
      ...negotiationPrompt(request),
      images: [],
      schema: negotiationSchema,
      search: false,
    });

    if (answer.isFailure) {
      const failure = answer.getError();
      this.logger.warn(
        {
          vintedId: request.listing.vintedId.value,
          code: failure.code,
          detail: failure.detail,
        },
        "[Analysis] negotiation script could not be written",
      );

      return Result.fail(toAnalysisAiFailure(failure));
    }

    const { script, arguments: reasons } = answer.getValue().data;

    return Result.ok({ script, arguments: reasons, tone: request.tone });
  }
}
