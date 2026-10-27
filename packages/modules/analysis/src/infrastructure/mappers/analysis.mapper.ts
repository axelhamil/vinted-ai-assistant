import { Option, Result, UUID } from "@packages/ddd-kit";
import { z } from "zod";
import type { analyses } from "../../../schemas/analysis";
import { Analysis, type Negotiation } from "../../domain/analysis.aggregate";
import { AnalysisId } from "../../domain/analysis-id";
import type { Listing } from "../../domain/listing";
import type { ListingFacts } from "../../domain/listing-facts";
import { AnalysisStatus } from "../../domain/value-objects/analysis-status.vo";
import { Language } from "../../domain/value-objects/language.vo";
import { Margin } from "../../domain/value-objects/margin.vo";
import { NegotiationTone } from "../../domain/value-objects/negotiation-tone.vo";
import { Price } from "../../domain/value-objects/price.vo";
import { Resale, resaleSchema } from "../../domain/value-objects/resale.vo";
import { Score } from "../../domain/value-objects/score.vo";
import { VintedId } from "../../domain/value-objects/vinted-id.vo";

export type AnalysisRecord = typeof analyses.$inferSelect;

type AnalysisPersistence = Omit<typeof analyses.$inferInsert, "updatedAt">;

const confidenceSchema = z.enum(["low", "medium", "high"]);

const factsSchema = z.object({
  photoQuality: z.object({
    score: z.number(),
    hasModel: z.boolean(),
    lighting: z.enum(["poor", "average", "good"]),
    background: z.enum(["messy", "neutral", "professional"]),
    issues: z.array(z.string()),
  }),
  authenticity: z.object({
    score: z.number(),
    flags: z.array(z.string()),
    confidence: confidenceSchema,
  }),
  market: z.object({
    lowCents: z.number().int(),
    averageCents: z.number().int(),
    highCents: z.number().int(),
    confidence: confidenceSchema,
    reasoning: z.string(),
    retail: z
      .object({ priceCents: z.number().int(), brand: z.string() })
      .nullable(),
    sources: z.array(
      z.object({
        name: z.string(),
        priceCents: z.number().int(),
        searchQuery: z.string(),
        count: z.number().int(),
      }),
    ),
  }),
  detected: z.object({
    brand: z.string().nullable(),
    model: z.string().nullable(),
    condition: z.string(),
  }),
  signals: z.array(
    z.object({
      type: z.enum(["positive", "negative", "neutral"]),
      label: z.string(),
      detail: z.string(),
    }),
  ),
});

const documentsSchema = z.object({
  photos: z.array(z.string()),
  seller: z.object({
    username: z.string(),
    rating: z.number().nullable(),
    salesCount: z.number().int().nullable(),
  }),
  facts: factsSchema,
  groundingSources: z.array(z.object({ title: z.string(), uri: z.string() })),
  negotiation: z.object({
    script: z.string(),
    arguments: z.array(z.string()),
    tone: z.string(),
  }),
  resale: resaleSchema,
});

type FactsDocument = z.infer<typeof factsSchema>;

function factsOf(document: FactsDocument): ListingFacts {
  const { market, detected } = document;

  return {
    ...document,
    market: { ...market, retail: Option.fromNullable(market.retail) },
    detected: {
      brand: Option.fromNullable(detected.brand),
      model: Option.fromNullable(detected.model),
      condition: detected.condition,
    },
  };
}

function factsDocumentOf(facts: ListingFacts): FactsDocument {
  const { market, detected } = facts;

  return {
    ...facts,
    market: { ...market, retail: market.retail.toNull() },
    detected: {
      brand: detected.brand.toNull(),
      model: detected.model.toNull(),
      condition: detected.condition,
    },
  };
}

function optionalPrice(cents: number | null): Result<Option<Price>> {
  return Option.fromNullable(cents).tryMap((value) => Price.create(value));
}

export function analysisToDomain(record: AnalysisRecord): Result<Analysis> {
  const documents = documentsSchema.safeParse(record);
  if (!documents.success)
    return Result.fail(
      `Unreadable stored documents: ${documents.error.issues[0]?.path.join(".")}`,
    );

  const { photos, seller, facts, groundingSources, negotiation, resale } =
    documents.data;

  const values = Result.all([
    UUID.parse(record.id),
    VintedId.create(record.vintedId),
    Language.parse(record.language),
    Price.create(record.priceCents),
    optionalPrice(record.totalPriceCents),
    optionalPrice(record.shippingCostCents),
    NegotiationTone.parse(negotiation.tone),
    Score.create(record.opportunityScore),
    Margin.create({
      amountCents: record.marginCents,
      percent: record.marginPercent,
    }),
    Price.create(record.suggestedOfferCents),
    Resale.create(resale),
    AnalysisStatus.parse(record.status),
  ]);
  if (values.isFailure) return Result.fail(values.getError());

  const [
    id,
    vintedId,
    language,
    priceCents,
    totalPriceCents,
    shippingCostCents,
    tone,
    opportunityScore,
    margin,
    suggestedOffer,
    resaleValue,
    status,
  ] = values.getValue();

  const listing: Listing = {
    vintedId,
    url: record.url,
    title: record.title,
    description: record.description,
    brand: Option.fromNullable(record.brand),
    size: Option.fromNullable(record.size),
    condition: record.condition,
    priceCents,
    totalPriceCents,
    shippingCostCents,
    listedAt: Option.fromNullable(record.listedAt),
    photos,
    seller: {
      username: seller.username,
      rating: Option.fromNullable(seller.rating),
      salesCount: Option.fromNullable(seller.salesCount),
    },
    language,
  };

  return Result.ok(
    Analysis.reconstitute(
      {
        listing,
        facts: factsOf(facts),
        groundingSources,
        negotiation: { ...negotiation, tone },
        opportunityScore,
        margin,
        suggestedOffer,
        resale: resaleValue,
        status,
        analyzedAt: record.analyzedAt,
        createdAt: record.createdAt,
      },
      AnalysisId.create(id),
    ),
  );
}

export function negotiationToPersistence(
  negotiation: Negotiation,
): AnalysisPersistence["negotiation"] {
  return { ...negotiation, tone: negotiation.tone.value };
}

export function analysisToPersistence(analysis: Analysis): AnalysisPersistence {
  const listing = analysis.get("listing");
  const margin = analysis.margin().value;

  return {
    id: String(analysis.id.value),
    vintedId: listing.vintedId.value,
    url: listing.url,
    title: listing.title,
    description: listing.description,
    brand: listing.brand.toNull(),
    size: listing.size.toNull(),
    condition: listing.condition,
    language: listing.language.value,
    priceCents: listing.priceCents.value,
    totalPriceCents: listing.totalPriceCents.map((p) => p.value).toNull(),
    shippingCostCents: listing.shippingCostCents.map((p) => p.value).toNull(),
    listedAt: listing.listedAt.toNull(),
    photos: listing.photos,
    seller: {
      username: listing.seller.username,
      rating: listing.seller.rating.toNull(),
      salesCount: listing.seller.salesCount.toNull(),
    },
    facts: factsDocumentOf(analysis.get("facts")),
    groundingSources: analysis.get("groundingSources"),
    negotiation: negotiationToPersistence(analysis.get("negotiation")),
    opportunityScore: analysis.opportunityScore().value,
    marginCents: margin.amountCents,
    marginPercent: margin.percent,
    suggestedOfferCents: analysis.suggestedOfferCents().value,
    resale: analysis.resale().value,
    status: analysis.get("status").value,
    analyzedAt: analysis.get("analyzedAt"),
    createdAt: analysis.get("createdAt"),
  };
}
