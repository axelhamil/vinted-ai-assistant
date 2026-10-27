import { describe, expect, it } from "bun:test";
import { Option } from "@packages/ddd-kit";
import { buildListing } from "../../testing/analysis.factory";
import { computeMargin, daysListed } from "./pricing";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-10-27T12:00:00.000Z");

describe("computeMargin", () => {
  it.each([
    {
      price: 2000,
      total: null,
      shipping: null,
      average: 3000,
      amount: 1000,
      percent: 50,
    },
    {
      price: 2000,
      total: 2300,
      shipping: 300,
      average: 3000,
      amount: 400,
      percent: 15.4,
    },
    {
      price: 2000,
      total: null,
      shipping: 500,
      average: 3000,
      amount: 500,
      percent: 20,
    },
    {
      price: 4000,
      total: null,
      shipping: null,
      average: 3000,
      amount: -1000,
      percent: -25,
    },
    {
      price: 0,
      total: null,
      shipping: null,
      average: 3000,
      amount: 3000,
      percent: 0,
    },
  ])(
    "costs $price (total $total, shipping $shipping) against an average of $average → $amount cents, $percent %",
    ({ price, total, shipping, average, amount, percent }) => {
      const listing = buildListing({
        priceCents: price,
        totalPriceCents: total,
        shippingCostCents: shipping,
      });

      const margin = computeMargin(listing, { averageCents: average });

      expect(margin.value).toEqual({ amountCents: amount, percent });
    },
  );
});

describe("daysListed", () => {
  it.each([
    { elapsedMs: 0, days: 0 },
    { elapsedMs: 1, days: 1 },
    { elapsedMs: DAY_MS, days: 1 },
    { elapsedMs: DAY_MS + 1, days: 2 },
    { elapsedMs: 40 * DAY_MS, days: 40 },
  ])("counts $days days after $elapsedMs ms", ({ elapsedMs, days }) => {
    const listedAt = new Date(NOW.getTime() - elapsedMs);

    expect(daysListed(Option.some(listedAt), NOW)).toEqual(Option.some(days));
  });

  it("stays unknown without a listing date", () => {
    expect(daysListed(Option.none(), NOW).isNone()).toBe(true);
  });
});
