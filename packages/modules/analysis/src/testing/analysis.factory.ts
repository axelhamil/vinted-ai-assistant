import { Option } from "@packages/ddd-kit";
import type { ListingDto } from "../application/dto/analysis.dto";
import type { AnalysisStatusValue } from "../contract";
import {
  Analysis,
  type AnalysisInput,
  type AnalysisProps,
  type Negotiation,
} from "../domain/analysis.aggregate";
import type { Listing } from "../domain/listing";
import type { ListingFacts } from "../domain/listing-facts";
import { AnalysisStatus } from "../domain/value-objects/analysis-status.vo";
import { Language } from "../domain/value-objects/language.vo";
import { NegotiationTone } from "../domain/value-objects/negotiation-tone.vo";
import { Price } from "../domain/value-objects/price.vo";
import { VintedId } from "../domain/value-objects/vinted-id.vo";

export const ANALYZED_AT = new Date("2026-10-27T10:00:00.000Z");

export interface ListingOverrides {
  vintedId?: string;
  brand?: string | null;
  size?: string | null;
  priceCents?: number;
  totalPriceCents?: number | null;
  shippingCostCents?: number | null;
  listedAt?: Date | null;
}

export function buildListing(overrides: ListingOverrides = {}): Listing {
  return {
    vintedId: VintedId.create(overrides.vintedId ?? "4815162342").getValue(),
    url: "https://www.vinted.fr/items/4815162342-veste-en-jean",
    title: "Veste en jean Levi's",
    description: "Portée deux fois, très bon état.",
    brand: Option.fromNullable(
      overrides.brand === undefined ? "Levi's" : overrides.brand,
    ),
    size: Option.fromNullable(
      overrides.size === undefined ? "M" : overrides.size,
    ),
    condition: "Très bon état",
    priceCents: Price.create(overrides.priceCents ?? 2000).getValue(),
    totalPriceCents: Option.fromNullable(overrides.totalPriceCents).map(
      (cents) => Price.create(cents).getValue(),
    ),
    shippingCostCents: Option.fromNullable(overrides.shippingCostCents).map(
      (cents) => Price.create(cents).getValue(),
    ),
    listedAt: Option.fromNullable(overrides.listedAt),
    photos: ["https://images1.vinted.net/t/01_abc/f800/1.jpeg"],
    seller: {
      username: "marie_vintage",
      rating: Option.some(4.8),
      salesCount: Option.some(132),
    },
    language: Language.create("fr").getValue(),
  };
}

export interface FactsOverrides {
  photoScore?: number;
  authenticityScore?: number;
  lowCents?: number;
  averageCents?: number;
  highCents?: number;
}

export function buildFacts(overrides: FactsOverrides = {}): ListingFacts {
  return {
    photoQuality: {
      score: overrides.photoScore ?? 6,
      hasModel: false,
      lighting: "average",
      background: "neutral",
      issues: [],
    },
    authenticity: {
      score: overrides.authenticityScore ?? 8,
      flags: [],
      confidence: "high",
    },
    market: {
      lowCents: overrides.lowCents ?? 2000,
      averageCents: overrides.averageCents ?? 3000,
      highCents: overrides.highCents ?? 4500,
      confidence: "medium",
      reasoning: "Similar jackets sell between 20 and 45 euros.",
      retail: Option.none(),
      sources: [
        {
          name: "Vinted",
          priceCents: 3000,
          searchQuery: "veste jean levis",
          count: 12,
        },
      ],
    },
    detected: {
      brand: Option.some("Levi's"),
      model: Option.none(),
      condition: "very_good",
    },
    signals: [],
  };
}

export function buildNegotiation(
  overrides: Partial<{
    script: string;
    tone: "friendly" | "direct" | "urgent";
  }> = {},
): Negotiation {
  return {
    script: overrides.script ?? "Bonjour, seriez-vous ouvert à une offre ?",
    arguments: ["Prix du marché plus bas"],
    tone: NegotiationTone.create(overrides.tone ?? "friendly").getValue(),
  };
}

export interface BuildAnalysisOptions {
  listing?: Listing;
  facts?: ListingFacts;
  now?: Date;
  status?: AnalysisStatusValue;
}

export function analysisInput(
  options: Omit<BuildAnalysisOptions, "status"> = {},
): AnalysisInput {
  return {
    listing: options.listing ?? buildListing(),
    facts: options.facts ?? buildFacts(),
    groundingSources: [{ title: "Vinted", uri: "https://www.vinted.fr" }],
    negotiation: buildNegotiation(),
    now: options.now ?? ANALYZED_AT,
  };
}

export function propsOf(analysis: Analysis): AnalysisProps {
  return {
    listing: analysis.get("listing"),
    facts: analysis.get("facts"),
    groundingSources: analysis.get("groundingSources"),
    negotiation: analysis.get("negotiation"),
    status: analysis.get("status"),
    opportunityScore: analysis.get("opportunityScore"),
    margin: analysis.get("margin"),
    suggestedOffer: analysis.get("suggestedOffer"),
    resale: analysis.get("resale"),
    analyzedAt: analysis.get("analyzedAt"),
    createdAt: analysis.get("createdAt"),
  };
}

export function buildAnalysis(options: BuildAnalysisOptions = {}): Analysis {
  const created = Analysis.create(analysisInput(options)).getValue();
  const status = AnalysisStatus.create(
    options.status ?? created.get("status").value,
  ).getValue();

  return Analysis.reconstitute({ ...propsOf(created), status }, created.id);
}

export function buildListingDto(
  overrides: Partial<ListingDto> = {},
): ListingDto {
  return {
    vintedId: "4815162342",
    url: "https://www.vinted.fr/items/4815162342-veste-en-jean",
    title: "Veste en jean Levi's",
    description: "Portée deux fois, très bon état.",
    brand: "Levi's",
    size: "M",
    condition: "Très bon état",
    priceCents: 2000,
    totalPriceCents: null,
    shippingCostCents: null,
    listedAt: null,
    photos: ["https://images1.vinted.net/t/01_abc/f800/1.jpeg"],
    seller: { username: "marie_vintage", rating: 4.8, salesCount: 132 },
    language: "fr",
    ...overrides,
  };
}
