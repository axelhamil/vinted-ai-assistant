import type { Option, Result } from "@packages/ddd-kit";
import type { Listing } from "../listing";
import { Margin } from "../value-objects/margin.vo";

const DAY_MS = 86_400_000;

type CostedListing = Pick<
  Listing,
  "priceCents" | "totalPriceCents" | "shippingCostCents"
>;

export function computeMargin(
  listing: CostedListing,
  market: { averageCents: number },
): Result<Margin> {
  const itemCents = listing.totalPriceCents.unwrapOr(listing.priceCents).value;
  const shippingCents = listing.shippingCostCents
    .map((cost) => cost.value)
    .unwrapOr(0);
  const totalCostCents = itemCents + shippingCents;
  const amountCents = market.averageCents - totalCostCents;

  if (totalCostCents === 0) return Margin.create({ amountCents, percent: 0 });

  return Margin.create({
    amountCents,
    percent: Math.round((amountCents * 1000) / totalCostCents) / 10,
  });
}

export function daysListed(listedAt: Option<Date>, now: Date): Option<number> {
  return listedAt.map((date) =>
    Math.ceil((now.getTime() - date.getTime()) / DAY_MS),
  );
}
