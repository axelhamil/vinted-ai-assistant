import { describe, expect, it } from "bun:test";
import { Option } from "@packages/ddd-kit";
import { computeSuggestedOffer } from "./suggested-offer";

describe("computeSuggestedOffer", () => {
  it.each([
    {
      case: "ratio 1.10 → −20 %",
      price: 11000,
      low: 5000,
      average: 10000,
      days: null,
      offer: 8800,
    },
    {
      case: "ratio just under 1.10 → −15 %",
      price: 10999,
      low: 5000,
      average: 10000,
      days: null,
      offer: 9300,
    },
    {
      case: "ratio 1.00 → −15 %",
      price: 10000,
      low: 5000,
      average: 10000,
      days: null,
      offer: 8500,
    },
    {
      case: "ratio just over 0.90 → −15 %",
      price: 9001,
      low: 5000,
      average: 10000,
      days: null,
      offer: 7700,
    },
    {
      case: "ratio 0.90 → −10 %",
      price: 9000,
      low: 5000,
      average: 10000,
      days: null,
      offer: 8100,
    },
    {
      case: "21 days listed adds nothing",
      price: 10000,
      low: 5000,
      average: 10000,
      days: 21,
      offer: 8500,
    },
    {
      case: "22 days listed → extra −5 %",
      price: 10000,
      low: 5000,
      average: 10000,
      days: 22,
      offer: 8000,
    },
    {
      case: "above market, 40 days → −25 %",
      price: 12000,
      low: 8000,
      average: 10000,
      days: 40,
      offer: 9000,
    },
    {
      case: "floor at 70 % of low",
      price: 7000,
      low: 9400,
      average: 10000,
      days: null,
      offer: 6600,
    },
    {
      case: "cap at the asking price",
      price: 6000,
      low: 9000,
      average: 10000,
      days: null,
      offer: 6000,
    },
    {
      case: "cap after rounding",
      price: 6050,
      low: 9000,
      average: 10000,
      days: null,
      offer: 6050,
    },
  ])("$case", ({ price, low, average, days, offer }) => {
    const suggested = computeSuggestedOffer({
      priceCents: price,
      lowCents: low,
      averageCents: average,
      daysListed: Option.fromNullable(days),
    });

    expect(suggested.getValue().value).toBe(offer);
  });
});
