import { describe, expect, it } from "bun:test";
import {
  LEGACY_ANALYZED_AT_SECONDS,
  legacyRow,
} from "./fixtures/legacy-schema";
import { analysisFromLegacyRow } from "./legacy-row";

describe("a legacy sqlite analysis row", () => {
  it("turns euros into whole cents", () => {
    const analysis = analysisFromLegacyRow(legacyRow()).getValue();
    const listing = analysis.get("listing");
    const market = analysis.get("facts").market;

    expect(listing.priceCents.value).toBe(1999);
    expect(listing.totalPriceCents.map((price) => price.value).toNull()).toBe(
      2149,
    );
    expect(market.lowCents).toBe(2000);
    expect(market.averageCents).toBe(3025);
    expect(market.highCents).toBe(4550);
    expect(market.sources[0]?.priceCents).toBe(3000);
  });

  it("keeps the status and the analysis date of the legacy row", () => {
    const analysis = analysisFromLegacyRow(
      legacyRow({ status: "SOLD" }),
    ).getValue();
    const analyzedAt = new Date(LEGACY_ANALYZED_AT_SECONDS * 1000);

    expect(analysis.get("status").value).toBe("SOLD");
    expect(analysis.get("analyzedAt")).toEqual(analyzedAt);
    expect(analysis.get("createdAt")).toEqual(analyzedAt);
  });

  it("recomputes the score and the offer with today's rules", () => {
    const analysis = analysisFromLegacyRow(
      legacyRow({ opportunity_score: 1, suggested_offer: 1 }),
    ).getValue();

    expect(analysis.opportunityScore().value).toBeGreaterThan(1);
    expect(analysis.suggestedOfferCents().value).toBeGreaterThan(100);
  });

  it("maps missing optional fields to none or defaults", () => {
    const analysis = analysisFromLegacyRow(
      legacyRow({
        description: null,
        brand: null,
        size: null,
        condition: null,
        total_price: null,
        seller_rating: null,
        seller_sales_count: null,
        detected_model: null,
        market_price_low: null,
        market_price_high: null,
        market_price_sources: null,
        market_price_confidence: null,
        market_price_reasoning: null,
        negotiation_script: null,
        negotiation_arguments: null,
        negotiation_tone: null,
      }),
    ).getValue();
    const listing = analysis.get("listing");
    const market = analysis.get("facts").market;

    expect(listing.brand.isNone()).toBe(true);
    expect(listing.size.isNone()).toBe(true);
    expect(listing.totalPriceCents.isNone()).toBe(true);
    expect(listing.seller.rating.isNone()).toBe(true);
    expect(listing.description).toBe("");
    expect(listing.language.value).toBe("fr");
    expect(market.lowCents).toBe(3025);
    expect(market.highCents).toBe(3025);
    expect(market.sources).toEqual([]);
    expect(market.confidence).toBe("low");
    expect(analysis.get("negotiation").tone.value).toBe("friendly");
    expect(analysis.get("negotiation").arguments).toEqual([]);
  });

  it("fails a row without an average market price", () => {
    const result = analysisFromLegacyRow(legacyRow({ market_price_avg: null }));

    expect(result.isFailure).toBe(true);
  });

  it("fails a row whose photo score is out of range and names the column", () => {
    const result = analysisFromLegacyRow(
      legacyRow({ photo_quality_score: 42 }),
    );

    expect(result.getError()).toContain("photo_quality_score");
  });

  it("fails a row whose authenticity score is out of range and names the column", () => {
    const result = analysisFromLegacyRow(legacyRow({ authenticity_score: 0 }));

    expect(result.getError()).toContain("authenticity_score");
  });

  it("fails a row whose market low is above the average and names the columns", () => {
    const result = analysisFromLegacyRow(
      legacyRow({ market_price_low: 40, market_price_avg: 30.25 }),
    );

    expect(result.getError()).toContain("market_price_low");
  });

  it("fails a row whose price is beyond the price limit and names the column", () => {
    const result = analysisFromLegacyRow(
      legacyRow({ total_price: 20_000_000 }),
    );

    expect(result.getError()).toContain("total_price");
  });

  it("fails a row whose market source price is beyond the price limit and names the column", () => {
    const result = analysisFromLegacyRow(
      legacyRow({
        market_price_sources: JSON.stringify([
          { name: "Vinted", price: 20_000_000 },
        ]),
      }),
    );

    expect(result.getError()).toContain("market_price_sources");
  });

  it("fails a row whose photos are not valid json and names the column", () => {
    const result = analysisFromLegacyRow(legacyRow({ photos: "[not json" }));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain("photos");
  });

  it("fails a row with an unknown status", () => {
    const result = analysisFromLegacyRow(legacyRow({ status: "LOST" }));

    expect(result.isFailure).toBe(true);
  });
});
