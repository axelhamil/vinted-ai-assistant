import type { AnalysisStatusValue } from "../../contract";
import type {
  Analysis,
  GroundingSource,
} from "../../domain/analysis.aggregate";
import type { Listing } from "../../domain/listing";
import type {
  Confidence,
  PhotoBackground,
  PhotoLighting,
  SignalType,
} from "../../domain/listing-facts";
import type { NegotiationToneValue } from "../../domain/value-objects/negotiation-tone.vo";
import type { ResaleValue } from "../../domain/value-objects/resale.vo";
import type { PortfolioListing } from "./analysis.dto";

export interface AnalysisDto {
  vintedId: string;
  title: string;
  brand: string | null;
  price: number;
  totalPrice: number | null;
  status: AnalysisStatusValue;
  listedAt: string | null;
  analyzedAt: string;
  opportunity: {
    score: number;
    margin: number;
    marginPercent: number;
    signals: { type: SignalType; label: string; detail: string }[];
  };
  marketPrice: {
    low: number;
    average: number;
    high: number;
    confidence: Confidence;
    reasoning: string;
    retailPrice: { price: number; brand: string } | null;
    sources: {
      name: string;
      price: number;
      searchQuery: string;
      count: number;
    }[];
  };
  authenticityCheck: { score: number; flags: string[]; confidence: Confidence };
  photoQuality: {
    score: number;
    hasModel: boolean;
    lighting: PhotoLighting;
    background: PhotoBackground;
    issues: string[];
  };
  negotiation: {
    suggestedOffer: number;
    script: string;
    arguments: string[];
    tone: NegotiationToneValue;
  };
  resale: {
    recommendedPrice: number;
    estimatedDays: number;
    tips: ResaleValue["tips"];
    platforms: ResaleValue["platforms"];
  };
  groundingSources: GroundingSource[];
}

export interface PortfolioItemDto {
  vintedId: string;
  url: string;
  title: string;
  price: number;
  totalPrice: number | null;
  score: number;
  marginPercent: number;
  status: AnalysisStatusValue;
  imageUrl: string | null;
  analyzedAt: string;
}

export interface PortfolioDto {
  items: PortfolioItemDto[];
  total: number;
  hasMore: boolean;
}

function euros(cents: number): number {
  return cents / 100;
}

function totalEuros(listing: Listing): number | null {
  return (
    listing.totalPriceCents.map((total) => euros(total.value)).toUndefined() ??
    null
  );
}

export function toAnalysisDto(analysis: Analysis): AnalysisDto {
  const listing = analysis.get("listing");
  const facts = analysis.get("facts");
  const { market } = facts;
  const negotiation = analysis.get("negotiation");
  const margin = analysis.margin().value;
  const resale = analysis.resale().value;

  return {
    vintedId: listing.vintedId.value,
    title: listing.title,
    brand: listing.brand.toUndefined() ?? null,
    price: euros(listing.priceCents.value),
    totalPrice: totalEuros(listing),
    status: analysis.get("status").value,
    listedAt:
      listing.listedAt.map((date) => date.toISOString()).toUndefined() ?? null,
    analyzedAt: analysis.get("analyzedAt").toISOString(),
    opportunity: {
      score: analysis.opportunityScore().value,
      margin: euros(margin.amountCents),
      marginPercent: margin.percent,
      signals: facts.signals,
    },
    marketPrice: {
      low: euros(market.lowCents),
      average: euros(market.averageCents),
      high: euros(market.highCents),
      confidence: market.confidence,
      reasoning: market.reasoning,
      retailPrice:
        market.retail
          .map(({ priceCents, brand }) => ({ price: euros(priceCents), brand }))
          .toUndefined() ?? null,
      sources: market.sources.map(({ priceCents, ...source }) => ({
        ...source,
        price: euros(priceCents),
      })),
    },
    authenticityCheck: facts.authenticity,
    photoQuality: facts.photoQuality,
    negotiation: {
      suggestedOffer: euros(analysis.suggestedOfferCents().value),
      script: negotiation.script,
      arguments: negotiation.arguments,
      tone: negotiation.tone.value,
    },
    resale: {
      recommendedPrice: euros(resale.recommendedPriceCents),
      estimatedDays: resale.estimatedDays,
      tips: resale.tips,
      platforms: resale.platforms,
    },
    groundingSources: analysis.get("groundingSources"),
  };
}

function toPortfolioItemDto(analysis: Analysis): PortfolioItemDto {
  const listing = analysis.get("listing");

  return {
    vintedId: listing.vintedId.value,
    url: listing.url,
    title: listing.title,
    price: euros(listing.priceCents.value),
    totalPrice: totalEuros(listing),
    score: analysis.opportunityScore().value,
    marginPercent: analysis.margin().value.percent,
    status: analysis.get("status").value,
    imageUrl: listing.photos[0] ?? null,
    analyzedAt: analysis.get("analyzedAt").toISOString(),
  };
}

export function toPortfolioDto({
  items,
  total,
  hasMore,
}: PortfolioListing): PortfolioDto {
  return { items: items.map(toPortfolioItemDto), total, hasMore };
}
