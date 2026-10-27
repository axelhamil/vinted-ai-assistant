import { describe, expect, it } from "bun:test";
import { Option, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { mockUnitOfWork } from "@packages/testing/unit-of-work-mock";
import type { Analysis } from "../../domain/analysis.aggregate";
import {
  ANALYZED_AT,
  buildAnalysis,
  buildListing,
  buildNegotiation,
} from "../../testing/analysis.factory";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import type { INegotiationWriter } from "../ports/negotiation-writer.port";
import { RegenerateNegotiationUseCase } from "./regenerate-negotiation.use-case";

const DAY_MS = 86_400_000;
const NOW = new Date(ANALYZED_AT.getTime() + 10 * DAY_MS);
const URGENT_SCRIPT = "Je peux payer tout de suite 17 €.";

function given(stored: Analysis = buildAnalysis()) {
  const repository = mockPort<IAnalysisRepository>();
  const negotiationWriter = mockPort<INegotiationWriter>();
  const transaction = mockUnitOfWork();

  repository.findByVintedId.mockResolvedValue(Result.ok(Option.some(stored)));
  repository.save.mockImplementation(async (analysis) =>
    Result.ok(analysis.id),
  );
  negotiationWriter.write.mockImplementation(async ({ tone }) =>
    Result.ok(buildNegotiation({ script: URGENT_SCRIPT, tone: tone.value })),
  );

  const regenerate = () =>
    new RegenerateNegotiationUseCase(
      repository,
      negotiationWriter,
      transaction.unitOfWork,
      () => NOW,
    ).execute({ vintedId: "4815162342", tone: "urgent" });

  return { repository, negotiationWriter, transaction, stored, regenerate };
}

describe("regenerating the negotiation script", () => {
  it("keeps the stored offer and persists the new script in the requested tone", async () => {
    const { repository, transaction, stored, regenerate } = given();
    const offer = stored.suggestedOfferCents().value;

    const result = await regenerate();

    const analysis = result.getValue();
    expect(analysis.suggestedOfferCents().value).toBe(offer);
    expect(analysis.get("negotiation").script).toBe(URGENT_SCRIPT);
    expect(analysis.get("negotiation").tone.value).toBe("urgent");
    expect(repository.save).toHaveBeenCalledWith(analysis);
    expect(transaction.outcome()).toBe("committed");
  });

  it("counts the days listed from the listing date, not from the analysis date", async () => {
    const listedAt = new Date(NOW.getTime() - 40 * DAY_MS);
    const { negotiationWriter, regenerate } = given(
      buildAnalysis({ listing: buildListing({ listedAt }) }),
    );

    await regenerate();

    const request = negotiationWriter.write.mock.calls[0]?.[0];
    expect(request?.daysListed).toEqual(Option.some(40));
  });

  it("answers not found for an unknown listing", async () => {
    const { repository, negotiationWriter, regenerate } = given();
    repository.findByVintedId.mockResolvedValue(Result.ok(Option.none()));

    const result = await regenerate();

    expect(result.getError()).toBe("ANALYSIS_NOT_FOUND");
    expect(negotiationWriter.write).not.toHaveBeenCalled();
  });
});
