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
import type { Resale } from "./value-objects/resale.vo";
import type { Score } from "./value-objects/score.vo";

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

function assess(listing: Listing, facts: ListingFacts, now: Date): Assessment {
  const margin = computeMargin(listing, facts.market);
  const listedFor = daysListed(listing.listedAt, now);

  return {
    margin,
    opportunityScore: computeOpportunityScore({
      marginPercent: margin.value.percent,
      photoQualityScore: facts.photoQuality.score,
      authenticityScore: facts.authenticity.score,
      daysListed: listedFor,
      size: listing.size,
    }),
    suggestedOffer: computeSuggestedOffer({
      priceCents: listing.priceCents.value,
      lowCents: facts.market.lowCents,
      averageCents: facts.market.averageCents,
      daysListed: listedFor,
    }),
    resale: computeResale({
      averageCents: facts.market.averageCents,
      marginPercent: margin.value.percent,
      brand: listing.brand.or(facts.detected.brand),
    }),
  };
}

export class Analysis extends Aggregate<AnalysisProps> {
  private constructor(props: AnalysisProps, id?: UUID<string | number>) {
    super(props, id);
  }

  get id(): AnalysisId {
    return AnalysisId.create(this._id);
  }

  static create(input: AnalysisInput): Analysis {
    const { listing, facts, groundingSources, negotiation, now } = input;

    return new Analysis(
      {
        listing,
        facts,
        groundingSources,
        negotiation,
        ...assess(listing, facts, now),
        status: AnalysisStatus.of("ANALYZED"),
        analyzedAt: now,
        createdAt: now,
      },
      new UUID<string>(),
    );
  }

  static reconstitute(props: AnalysisProps, id: AnalysisId): Analysis {
    return new Analysis(props, new UUID(id.value));
  }

  refresh(input: AnalysisInput): void {
    const { listing, facts, groundingSources, negotiation, now } = input;
    const assessment = assess(listing, facts, now);

    this._props.listing = listing;
    this._props.facts = facts;
    this._props.groundingSources = groundingSources;
    this._props.negotiation = negotiation;
    this._props.opportunityScore = assessment.opportunityScore;
    this._props.margin = assessment.margin;
    this._props.suggestedOffer = assessment.suggestedOffer;
    this._props.resale = assessment.resale;
    this._props.analyzedAt = now;
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
