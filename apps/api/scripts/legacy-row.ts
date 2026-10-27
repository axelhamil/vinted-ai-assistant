import { toListing } from "@packages/analysis/application/services/analysis-input";
import {
  Analysis,
  type GroundingSource,
} from "@packages/analysis/domain/analysis.aggregate";
import type { ListingFacts } from "@packages/analysis/domain/listing-facts";
import { AnalysisStatus } from "@packages/analysis/domain/value-objects/analysis-status.vo";
import { NegotiationTone } from "@packages/analysis/domain/value-objects/negotiation-tone.vo";
import { Price } from "@packages/analysis/domain/value-objects/price.vo";
import { PriceRange } from "@packages/analysis/domain/value-objects/price-range.vo";
import { Score } from "@packages/analysis/domain/value-objects/score.vo";
import { Option, Result } from "@packages/ddd-kit";
import { z } from "zod";

const DEFAULT_LANGUAGE = "fr";
const DEFAULT_TONE = "friendly";

function jsonText<T extends z.ZodType>(schema: T) {
  return z
    .string()
    .transform((text, context): unknown => {
      try {
        return JSON.parse(text);
      } catch {
        context.addIssue({ code: "custom", message: "is not valid json" });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

const confidenceSchema = z.enum(["low", "medium", "high"]);
const euros = z.number().nonnegative();

const legacyRowSchema = z.object({
  vinted_id: z.string(),
  url: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  price: euros,
  total_price: euros.nullish(),
  brand: z.string().nullable(),
  size: z.string().nullable(),
  condition: z.string().nullable(),
  seller_username: z.string(),
  seller_rating: z.number().nullable(),
  seller_sales_count: z.number().int().nullable(),
  photos: jsonText(z.array(z.string())),
  photo_quality_score: z.number(),
  photo_analysis: jsonText(
    z.object({
      hasModel: z.boolean(),
      lighting: z.enum(["poor", "average", "good"]),
      background: z.enum(["messy", "neutral", "professional"]),
      issues: z.array(z.string()),
    }),
  ),
  authenticity_score: z.number(),
  authenticity_flags: jsonText(z.array(z.string())),
  authenticity_confidence: confidenceSchema,
  detected_model: z.string().nullish(),
  market_price_low: euros.nullable(),
  market_price_high: euros.nullable(),
  market_price_avg: euros,
  market_price_sources: jsonText(
    z.array(
      z.object({ name: z.string(), price: euros, url: z.string().optional() }),
    ),
  ).nullable(),
  market_price_confidence: confidenceSchema.nullable(),
  market_price_reasoning: z.string().nullish(),
  signals: jsonText(
    z.array(
      z.object({
        type: z.enum(["positive", "negative", "neutral"]),
        label: z.string(),
        detail: z.string(),
      }),
    ),
  ),
  negotiation_script: z.string().nullable(),
  negotiation_arguments: jsonText(z.array(z.string())).nullable(),
  negotiation_tone: z.string().nullable(),
  status: z.string(),
  analyzed_at: z.number().int().nonnegative(),
});

type LegacyRow = z.infer<typeof legacyRowSchema>;

function inColumn<T>(column: string, result: Result<T>): Result<T> {
  return result.mapError((error) => `Invalid legacy ${column}: ${error}`);
}

function centsIn(column: string, euros: number): Result<number> {
  return inColumn(
    column,
    Price.fromEuros(euros).map((price) => price.value),
  );
}

function optionalCentsIn(
  column: string,
  euros: number | null | undefined,
): Result<number | null> {
  return Option.fromNullable(euros)
    .tryMap((amount) => centsIn(column, amount))
    .map((cents) => cents.toNull());
}

function marketRangeOf(row: LegacyRow): Result<PriceRange> {
  const average = row.market_price_avg;

  return Result.all([
    centsIn("market_price_low", row.market_price_low ?? average),
    centsIn("market_price_avg", average),
    centsIn("market_price_high", row.market_price_high ?? average),
  ]).flatMap(([lowCents, averageCents, highCents]) =>
    inColumn(
      "market_price_low, market_price_avg, market_price_high",
      PriceRange.create({ lowCents, averageCents, highCents }),
    ),
  );
}

function factsOf(row: LegacyRow): Result<ListingFacts> {
  const scores = Result.combine([
    inColumn("photo_quality_score", Score.create(row.photo_quality_score)),
    inColumn("authenticity_score", Score.create(row.authenticity_score)),
  ]);
  const sources = Result.all(
    (row.market_price_sources ?? []).map((source) =>
      centsIn("market_price_sources", source.price).map((priceCents) => ({
        name: source.name,
        priceCents,
        searchQuery: "",
        count: 1,
      })),
    ),
  );

  return Result.all([scores, marketRangeOf(row), sources]).map(
    ([, range, validSources]) => ({
      photoQuality: { score: row.photo_quality_score, ...row.photo_analysis },
      authenticity: {
        score: row.authenticity_score,
        flags: row.authenticity_flags,
        confidence: row.authenticity_confidence,
      },
      market: {
        ...range.value,
        confidence: row.market_price_confidence ?? "low",
        reasoning: row.market_price_reasoning ?? "",
        retail: Option.none(),
        sources: validSources,
      },
      detected: {
        brand: Option.none(),
        model: Option.fromNullable(row.detected_model),
        condition: row.condition ?? "",
      },
      signals: row.signals,
    }),
  );
}

function groundingSourcesOf(row: LegacyRow): GroundingSource[] {
  return (row.market_price_sources ?? []).flatMap((source) =>
    source.url ? [{ title: source.name, uri: source.url }] : [],
  );
}

export function legacyVintedIdOf(raw: unknown): string {
  const parsed = z.object({ vinted_id: z.string() }).safeParse(raw);

  return parsed.success ? parsed.data.vinted_id : "unknown";
}

export function analysisFromLegacyRow(raw: unknown): Result<Analysis, string> {
  const parsed = legacyRowSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    return Result.fail(
      `Unreadable legacy column ${issue?.path.join(".")}: ${issue?.message}`,
    );
  }

  const row = parsed.data;
  const prices = Result.all([
    centsIn("price", row.price),
    optionalCentsIn("total_price", row.total_price),
    factsOf(row),
  ]);
  if (prices.isFailure) return Result.fail(prices.getError());

  const [priceCents, totalPriceCents, facts] = prices.getValue();
  const analyzedAt = new Date(row.analyzed_at * 1000);
  const values = Result.all([
    toListing({
      vintedId: row.vinted_id,
      url: row.url,
      title: row.title,
      description: row.description ?? "",
      brand: row.brand,
      size: row.size,
      condition: row.condition ?? "",
      priceCents,
      totalPriceCents,
      shippingCostCents: null,
      listedAt: null,
      photos: row.photos,
      seller: {
        username: row.seller_username,
        rating: row.seller_rating,
        salesCount: row.seller_sales_count,
      },
      language: DEFAULT_LANGUAGE,
    }),
    NegotiationTone.parse(row.negotiation_tone ?? DEFAULT_TONE),
    AnalysisStatus.parse(row.status),
  ]);
  if (values.isFailure) return Result.fail(values.getError());

  const [listing, tone, status] = values.getValue();
  const created = Analysis.create({
    listing,
    facts,
    groundingSources: groundingSourcesOf(row),
    negotiation: {
      script: row.negotiation_script ?? "",
      arguments: row.negotiation_arguments ?? [],
      tone,
    },
    now: analyzedAt,
  });
  if (created.isFailure) return Result.fail(created.getError());

  const analysis = created.getValue();

  return Result.ok(analysis.storedAs(analysis.id, status, analyzedAt));
}
