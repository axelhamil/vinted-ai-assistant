import { describe, expect, it } from "bun:test";
import { ANALYSIS_STATUSES, type AnalysisStatusValue } from "../contract";
import {
  ANALYZED_AT,
  analysisInput,
  buildAnalysis,
  buildFacts,
  buildListing,
  propsOf,
} from "../testing/analysis.factory";
import { Analysis } from "./analysis.aggregate";
import { AnalysisStatus } from "./value-objects/analysis-status.vo";
import { Score } from "./value-objects/score.vo";

const MINUTE_MS = 60_000;

function completed(analysis: Analysis, marginPercent: number) {
  return {
    eventType: "analysis.completed",
    aggregateId: String(analysis.id.value),
    payload: {
      vintedId: analysis.get("listing").vintedId.value,
      score: analysis.opportunityScore().value,
      marginPercent,
    },
  };
}

function eventsOf(analysis: Analysis) {
  return analysis
    .pullDomainEvents()
    .map(({ eventType, aggregateId, payload }) => ({
      eventType,
      aggregateId,
      payload,
    }));
}

const ALLOWED: Record<AnalysisStatusValue, AnalysisStatusValue[]> = {
  ANALYZED: ["WATCHING", "BOUGHT", "ARCHIVED"],
  WATCHING: ["BOUGHT", "ARCHIVED"],
  BOUGHT: ["SOLD", "ARCHIVED"],
  SOLD: ["ARCHIVED"],
  ARCHIVED: [],
};

const MOVES = ANALYSIS_STATUSES.flatMap((from) =>
  ANALYSIS_STATUSES.map((to) => ({
    from,
    to,
    allowed: ALLOWED[from].includes(to),
  })),
);

describe("Analysis", () => {
  it("computes score, margin, offer and resale once, at creation", () => {
    const analysis = Analysis.create(
      analysisInput({
        listing: buildListing({
          priceCents: 2000,
          shippingCostCents: 300,
          size: "M",
          listedAt: null,
        }),
        facts: buildFacts({
          photoScore: 6,
          authenticityScore: 8,
          lowCents: 2000,
          averageCents: 3000,
        }),
      }),
    ).getValue();

    expect(analysis.get("status").value).toBe("ANALYZED");
    expect(analysis.margin().value).toEqual({
      amountCents: 700,
      percent: 30.4,
    });
    expect(analysis.opportunityScore().value).toBe(7.3);
    expect(analysis.suggestedOfferCents().value).toBe(1800);
    expect(analysis.resale().value.recommendedPriceCents).toBe(3200);
    expect(analysis.get("analyzedAt")).toEqual(ANALYZED_AT);
  });

  it.each([
    {
      case: "an average that is not whole cents",
      facts: { averageCents: 2999.5 },
    },
    { case: "a low above the average", facts: { lowCents: 3500 } },
    { case: "a photo score of 0", facts: { photoScore: 0 } },
    { case: "an authenticity score of 11", facts: { authenticityScore: 11 } },
  ])("refuses to create an analysis from $case", ({ facts }) => {
    const created = Analysis.create(
      analysisInput({ facts: buildFacts(facts) }),
    );

    expect(created.isFailure).toBe(true);
    expect(created.getError()).toBe("ANALYSIS_INPUT_INVALID");
  });

  it("keeps its stored assessment when a refresh is refused", () => {
    const analysis = buildAnalysis();
    const before = analysis.margin().value;

    const refreshed = analysis.refresh(
      analysisInput({
        facts: buildFacts({ averageCents: 2999.5 }),
        now: new Date(ANALYZED_AT.getTime() + 90 * MINUTE_MS),
      }),
    );

    expect(refreshed.isFailure).toBe(true);
    expect(analysis.margin().value).toEqual(before);
    expect(analysis.get("analyzedAt")).toEqual(ANALYZED_AT);
  });

  it.each(MOVES)(
    "moves from $from to $to: $allowed",
    ({ from, to, allowed }) => {
      const analysis = buildAnalysis({ status: from });

      const moved = analysis.changeStatus(AnalysisStatus.create(to).getValue());

      expect(moved.isSuccess).toBe(allowed);
      expect(analysis.get("status").value).toBe(allowed ? to : from);
      if (!allowed) expect(moved.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
    },
  );

  it("keeps its status and id when refreshed, and recomputes from the new facts", () => {
    const analysis = buildAnalysis({ status: "BOUGHT" });
    const id = analysis.id.value;
    const later = new Date(ANALYZED_AT.getTime() + 90 * MINUTE_MS);

    const refreshed = analysis.refresh(
      analysisInput({
        facts: buildFacts({ averageCents: 4000, highCents: 5000 }),
        now: later,
      }),
    );

    expect(refreshed.isSuccess).toBe(true);
    expect(analysis.id.value).toBe(id);
    expect(analysis.get("status").value).toBe("BOUGHT");
    expect(analysis.get("analyzedAt")).toEqual(later);
    expect(analysis.get("createdAt")).toEqual(ANALYZED_AT);
    expect(analysis.margin().value).toEqual({
      amountCents: 2000,
      percent: 100,
    });
  });

  it.each([
    { minutes: 59, fresh: true },
    { minutes: 61, fresh: false },
  ])(
    "is fresh $minutes minutes after analysis: $fresh",
    ({ minutes, fresh }) => {
      const analysis = buildAnalysis();

      expect(
        analysis.isFresh(new Date(ANALYZED_AT.getTime() + minutes * MINUTE_MS)),
      ).toBe(fresh);
    },
  );

  it("recomputes nothing when reconstituted", () => {
    const created = buildAnalysis();
    const stored = Score.create(2).getValue();

    const reconstituted = Analysis.reconstitute(
      { ...propsOf(created), opportunityScore: stored },
      created.id,
    );

    expect(reconstituted.opportunityScore().value).toBe(2);
  });

  it("records analysis.completed with its score and margin when created", () => {
    const analysis = Analysis.create(analysisInput()).getValue();

    expect(eventsOf(analysis)).toEqual([
      completed(analysis, analysis.margin().value.percent),
    ]);
  });

  it("records analysis.completed with the recomputed score when refreshed", () => {
    const analysis = buildAnalysis({ status: "BOUGHT" });

    analysis.refresh(
      analysisInput({
        facts: buildFacts({ averageCents: 4000, highCents: 5000 }),
        now: new Date(ANALYZED_AT.getTime() + 90 * MINUTE_MS),
      }),
    );

    expect(eventsOf(analysis)).toEqual([completed(analysis, 100)]);
  });

  it("records analysis.status_changed from the old status to the new one, and nothing on a refused move", () => {
    const analysis = buildAnalysis({ status: "WATCHING" });

    analysis.changeStatus(AnalysisStatus.create("BOUGHT").getValue());
    analysis.changeStatus(AnalysisStatus.create("WATCHING").getValue());

    expect(eventsOf(analysis)).toEqual([
      {
        eventType: "analysis.status_changed",
        aggregateId: String(analysis.id.value),
        payload: {
          vintedId: analysis.get("listing").vintedId.value,
          from: "WATCHING",
          to: "BOUGHT",
        },
      },
    ]);
  });

  it("records analysis.deleted when marked deleted", () => {
    const analysis = buildAnalysis();

    analysis.markDeleted();

    expect(eventsOf(analysis)).toEqual([
      {
        eventType: "analysis.deleted",
        aggregateId: String(analysis.id.value),
        payload: { vintedId: analysis.get("listing").vintedId.value },
      },
    ]);
  });
});
