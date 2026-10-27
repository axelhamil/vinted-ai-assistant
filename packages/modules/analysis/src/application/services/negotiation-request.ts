import type { Listing } from "../../domain/listing";
import { daysListed } from "../../domain/services/pricing";
import type { NegotiationTone } from "../../domain/value-objects/negotiation-tone.vo";
import type { Price } from "../../domain/value-objects/price.vo";
import type { NegotiationRequest } from "../ports/negotiation-writer.port";

export interface NegotiationTerms {
  listing: Listing;
  offerCents: Price;
  marketAverageCents: number;
  tone: NegotiationTone;
  now: Date;
}

export function toNegotiationRequest({
  listing,
  offerCents,
  marketAverageCents,
  tone,
  now,
}: NegotiationTerms): NegotiationRequest {
  return {
    listing,
    offerCents,
    marketAverageCents,
    daysListed: daysListed(listing.listedAt, now),
    tone,
    language: listing.language,
  };
}
