import type { Option, Result } from "@packages/ddd-kit";
import { Price } from "../value-objects/price.vo";

export interface OfferInput {
  priceCents: number;
  lowCents: number;
  averageCents: number;
  daysListed: Option<number>;
}

const STALE_AFTER_DAYS = 21;
const FLOOR_SHARE_OF_LOW = 0.7;

function discountPercent(input: OfferInput): number {
  const isStale = input.daysListed
    .map((days) => days > STALE_AFTER_DAYS)
    .unwrapOr(false);
  const staleDiscount = isStale ? 5 : 0;

  if (input.priceCents * 100 >= input.averageCents * 110)
    return 20 + staleDiscount;
  if (input.priceCents * 100 > input.averageCents * 90)
    return 15 + staleDiscount;
  return 10 + staleDiscount;
}

function roundToEuro(cents: number): number {
  return Math.round(cents / 100) * 100;
}

export function computeSuggestedOffer(input: OfferInput): Result<Price> {
  const discounted = (input.priceCents * (100 - discountPercent(input))) / 100;
  const floored = Math.max(discounted, input.lowCents * FLOOR_SHARE_OF_LOW);

  return Price.create(Math.min(roundToEuro(floored), input.priceCents));
}
