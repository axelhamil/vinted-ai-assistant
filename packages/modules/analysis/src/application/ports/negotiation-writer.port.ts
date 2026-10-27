import type { Option, Result } from "@packages/ddd-kit";
import type { Negotiation } from "../../domain/analysis.aggregate";
import type { Listing } from "../../domain/listing";
import type { Language } from "../../domain/value-objects/language.vo";
import type { NegotiationTone } from "../../domain/value-objects/negotiation-tone.vo";
import type { Price } from "../../domain/value-objects/price.vo";
import type { AnalysisAiFailure } from "./listing-facts-reader.port";

export interface NegotiationRequest {
  listing: Listing;
  offerCents: Price;
  marketAverageCents: number;
  daysListed: Option<number>;
  tone: NegotiationTone;
  language: Language;
}

export interface INegotiationWriter {
  write(
    request: NegotiationRequest,
  ): Promise<Result<Negotiation, AnalysisAiFailure>>;
}
