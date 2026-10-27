import { describe, expect, it } from "bun:test";
import { type ILogger, Option, Result, UUID } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { mockUnitOfWork } from "@packages/testing/unit-of-work-mock";
import { AnalysisId } from "../../domain/analysis-id";
import {
  ANALYZED_AT,
  buildAnalysis,
  buildFacts,
  buildListingDto,
  buildNegotiation,
} from "../../testing/analysis.factory";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import type { IListingFactsReader } from "../ports/listing-facts-reader.port";
import type { INegotiationWriter } from "../ports/negotiation-writer.port";
import { AnalyzeListingUseCase } from "./analyze-listing.use-case";

const HOUR_MS = 3_600_000;
const FRESH_NOW = new Date(ANALYZED_AT.getTime() + HOUR_MS / 2);
const ONE_HOUR_LATER = new Date(ANALYZED_AT.getTime() + HOUR_MS);
const STALE_NOW = new Date(ANALYZED_AT.getTime() + 2 * HOUR_MS);
const NEW_SCRIPT = "Bonjour, je vous propose 17 € pour la veste.";

function given(now: Date) {
  const repository = mockPort<IAnalysisRepository>();
  const factsReader = mockPort<IListingFactsReader>();
  const negotiationWriter = mockPort<INegotiationWriter>();
  const logger = mockPort<ILogger>();
  const transaction = mockUnitOfWork();

  repository.findByVintedId.mockResolvedValue(Result.ok(Option.none()));
  repository.save.mockImplementation(async (analysis) =>
    Result.ok(analysis.id),
  );
  factsReader.read.mockResolvedValue(
    Result.ok({ facts: buildFacts(), groundingSources: [] }),
  );
  negotiationWriter.write.mockResolvedValue(
    Result.ok(buildNegotiation({ script: NEW_SCRIPT })),
  );

  const analyze = (forceRefresh = false) =>
    new AnalyzeListingUseCase(
      repository,
      factsReader,
      negotiationWriter,
      transaction.unitOfWork,
      logger,
      () => now,
    ).execute({ listing: buildListingDto(), forceRefresh });

  return {
    repository,
    factsReader,
    negotiationWriter,
    logger,
    transaction,
    analyze,
  };
}

describe("analysing a listing", () => {
  it("answers the stored analysis without calling the model while it is fresh", async () => {
    const { repository, factsReader, transaction, analyze } = given(FRESH_NOW);
    const stored = buildAnalysis();
    repository.findByVintedId.mockResolvedValue(Result.ok(Option.some(stored)));

    const result = await analyze();

    expect(result.getValue()).toBe(stored);
    expect(factsReader.read).not.toHaveBeenCalled();
    expect(transaction.outcome()).toBe("not_started");
  });

  it.each([
    { reason: "stale", now: STALE_NOW, forceRefresh: false },
    { reason: "one hour old", now: ONE_HOUR_LATER, forceRefresh: false },
    { reason: "forced", now: FRESH_NOW, forceRefresh: true },
  ])(
    "re-reads a $reason analysis and keeps its portfolio status and id",
    async ({ now, forceRefresh }) => {
      const { repository, transaction, analyze } = given(now);
      const stored = buildAnalysis({ status: "BOUGHT" });
      const storedId = stored.id.value;
      repository.findByVintedId.mockResolvedValue(
        Result.ok(Option.some(stored)),
      );

      const result = await analyze(forceRefresh);

      const analysis = result.getValue();
      expect(analysis.id.value).toBe(storedId);
      expect(analysis.get("status").value).toBe("BOUGHT");
      expect(analysis.get("analyzedAt")).toEqual(now);
      expect(analysis.get("negotiation").script).toBe(NEW_SCRIPT);
      expect(transaction.outcome()).toBe("committed");
    },
  );

  it("saves nothing when the model cannot read the listing", async () => {
    const { repository, factsReader, negotiationWriter, transaction, analyze } =
      given(STALE_NOW);
    factsReader.read.mockResolvedValue(Result.fail("ANALYSIS_AI_TIMEOUT"));

    const result = await analyze();

    expect(result.getError()).toBe("ANALYSIS_AI_TIMEOUT");
    expect(negotiationWriter.write).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(transaction.outcome()).toBe("not_started");
  });

  it.each([
    { reason: "an average below the low price", facts: { averageCents: 1500 } },
    { reason: "a photo score of 0", facts: { photoScore: 0 } },
  ])(
    "answers a provider failure and saves nothing when the model gives $reason",
    async ({ facts }) => {
      const {
        repository,
        factsReader,
        negotiationWriter,
        logger,
        transaction,
        analyze,
      } = given(STALE_NOW);
      factsReader.read.mockResolvedValue(
        Result.ok({ facts: buildFacts(facts), groundingSources: [] }),
      );

      const result = await analyze();

      expect(result.getError()).toBe("ANALYSIS_AI_PROVIDER_FAILURE");
      expect(negotiationWriter.write).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(transaction.outcome()).toBe("not_started");
    },
  );

  it("keeps the negotiation tone chosen for the stored analysis", async () => {
    const { repository, negotiationWriter, analyze } = given(STALE_NOW);
    const stored = buildAnalysis();
    stored.replaceNegotiation(buildNegotiation({ tone: "urgent" }));
    repository.findByVintedId.mockResolvedValue(Result.ok(Option.some(stored)));

    await analyze();

    const request = negotiationWriter.write.mock.calls[0]?.[0];
    expect(request?.tone.value).toBe("urgent");
  });

  it("replaces an unreadable stored analysis with a new one", async () => {
    const { repository, logger, transaction, analyze } = given(STALE_NOW);
    repository.findByVintedId.mockResolvedValue(
      Result.fail("ANALYSIS_RECORD_INTEGRITY_FAILED"),
    );

    const result = await analyze();

    expect(result.getValue().get("status").value).toBe("ANALYZED");
    expect(logger.warn).toHaveBeenCalled();
    expect(transaction.outcome()).toBe("committed");
  });

  it("answers with the stored id when a parallel first analysis saved the row before", async () => {
    const { repository, analyze } = given(STALE_NOW);
    const winner = AnalysisId.create(new UUID<string>());
    repository.save.mockResolvedValue(Result.ok(winner));

    const result = await analyze();

    expect(result.getValue().id.value).toBe(winner.value);
  });
});
