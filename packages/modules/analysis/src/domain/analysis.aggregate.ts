import { Aggregate, Result, UUID } from "@packages/ddd-kit";
import { ANALYSIS_FRESH_FOR_MS } from "../contract";
import { AnalysisId } from "./analysis-id";
import type { Listing } from "./listing";
import type { ListingFacts } from "./listing-facts";
import { computeOpportunityScore } from "./services/opportunity-score";
import { computeMargin, daysListed } from "./services/pricing";
import { computeResale } from "./services/resale";
import { computeSuggestedOffer } from "./services/suggested-offer";
import { AnalysisStatus } from "./value-objects/analysis-status.vo";
import type { Margin } from "./value-objects/margin.vo";
import type { NegotiationTone } from "./value-objects/negotiation-tone.vo";
import type { Price } from "./value-objects/price.vo";
import { PriceRange } from "./value-objects/price-range.vo";
import type { Resale } from "./value-objects/resale.vo";
import { Score } from "./value-objects/score.vo";

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Negotiation {
  script: string;
  arguments: string[];
  tone: NegotiationTone;
}

export interface AnalysisInput {
  listing: Listing;
  facts: ListingFacts;
  groundingSources: GroundingSource[];
  negotiation: Negotiation;
  now: Date;
}

interface Assessment {
  opportunityScore: Score;
  margin: Margin;
  suggestedOffer: Price;
  resale: Resale;
}

export interface AnalysisProps extends Assessment {
  listing: Listing;
  facts: ListingFacts;
  groundingSources: GroundingSource[];
  negotiation: Negotiation;
  status: AnalysisStatus;
  analyzedAt: Date;
  createdAt: Date;
}

const INPUT_INVALID = "ANALYSIS_INPUT_INVALID";

type InputInvalid = typeof INPUT_INVALID;

function checkFacts(facts: ListingFacts): Result<void> {
  const { lowCents, averageCents, highCents } = facts.market;

  return Result.combine([
    PriceRange.create({ lowCents, averageCents, highCents }),
    Score.create(facts.photoQuality.score),
    Score.create(facts.authenticity.score),
  ]);
}

function assess(
  listing: Listing,
  facts: ListingFacts,
  now: Date,
): Result<Assessment, InputInvalid> {
  const margin = checkFacts(facts).flatMap(() =>
    computeMargin(listing, facts.market),
  );
  if (margin.isFailure) return Result.fail(INPUT_INVALID);

  const { percent } = margin.getValue().value;
  const listedFor = daysListed(listing.listedAt, now);

  const computed = Result.all([
    computeOpportunityScore({
      marginPercent: percent,
      photoQualityScore: facts.photoQuality.score,
      authenticityScore: facts.authenticity.score,
      daysListed: listedFor,
      size: listing.size,
    }),
    computeSuggestedOffer({
      priceCents: listing.priceCents.value,
      lowCents: facts.market.lowCents,
      averageCents: facts.market.averageCents,
      daysListed: listedFor,
    }),
    computeResale({
      averageCents: facts.market.averageCents,
      marginPercent: percent,
      brand: listing.brand.or(facts.detected.brand),
    }),
  ]);
  if (computed.isFailure) return Result.fail(INPUT_INVALID);

  const [opportunityScore, suggestedOffer, resale] = computed.getValue();

  return Result.ok({
    margin: margin.getValue(),
    opportunityScore,
    suggestedOffer,
    resale,
  });
}

export class Analysis extends Aggregate<AnalysisProps> {
  private constructor(props: AnalysisProps, id?: UUID<string | number>) {
    super(props, id);
  }

  get id(): AnalysisId {
    return AnalysisId.create(this._id);
  }

  static create(input: AnalysisInput): Result<Analysis, InputInvalid> {
    const { listing, facts, groundingSources, negotiation, now } = input;
    const assessed = Result.all([
      assess(listing, facts, now),
      AnalysisStatus.create("ANALYZED"),
    ]);
    if (assessed.isFailure) return Result.fail(INPUT_INVALID);

    const [assessment, status] = assessed.getValue();

    return Result.ok(
      new Analysis(
        {
          listing,
          facts,
          groundingSources,
          negotiation,
          ...assessment,
          status,
          analyzedAt: now,
          createdAt: now,
        },
        new UUID<string>(),
      ),
    );
  }

  static reconstitute(props: AnalysisProps, id: AnalysisId): Analysis {
    return new Analysis(props, new UUID(id.value));
  }

  static suggestedOfferFor(
    listing: Listing,
    facts: ListingFacts,
    now: Date,
  ): Result<Price, InputInvalid> {
    return assess(listing, facts, now).map(
      (assessment) => assessment.suggestedOffer,
    );
  }

  storedAs(id: AnalysisId, status: AnalysisStatus, createdAt: Date): Analysis {
    return new Analysis(
      { ...this._props, status, createdAt },
      new UUID(id.value),
    );
  }

  refresh(input: AnalysisInput): Result<void, InputInvalid> {
    const { listing, facts, groundingSources, negotiation, now } = input;
    const assessed = assess(listing, facts, now);
    if (assessed.isFailure) return Result.fail(INPUT_INVALID);

    const assessment = assessed.getValue();

    this._props.listing = listing;
    this._props.facts = facts;
    this._props.groundingSources = groundingSources;
    this._props.negotiation = negotiation;
    this._props.opportunityScore = assessment.opportunityScore;
    this._props.margin = assessment.margin;
    this._props.suggestedOffer = assessment.suggestedOffer;
    this._props.resale = assessment.resale;
    this._props.analyzedAt = now;
    return Result.ok();
  }

  changeStatus(next: AnalysisStatus): Result<void, "ANALYSIS_STATUS_CONFLICT"> {
    if (!this.get("status").canMoveTo(next))
      return Result.fail("ANALYSIS_STATUS_CONFLICT");

    this._props.status = next;
    return Result.ok();
  }

  replaceNegotiation(negotiation: Negotiation): void {
    this._props.negotiation = negotiation;
  }

  isFresh(now: Date): boolean {
    return (
      now.getTime() - this.get("analyzedAt").getTime() < ANALYSIS_FRESH_FOR_MS
    );
  }

  opportunityScore(): Score {
    return this.get("opportunityScore");
  }

  margin(): Margin {
    return this.get("margin");
  }

  suggestedOfferCents(): Price {
    return this.get("suggestedOffer");
  }

  resale(): Resale {
    return this.get("resale");
  }
}
