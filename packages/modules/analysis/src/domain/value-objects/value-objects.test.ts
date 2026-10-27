import { describe, expect, it } from "bun:test";
import { Language } from "./language.vo";
import { Price } from "./price.vo";
import { PriceRange } from "./price-range.vo";
import { Score } from "./score.vo";
import { VintedId } from "./vinted-id.vo";

describe("value objects", () => {
  it.each([
    { raw: 1, valid: true },
    { raw: 10, valid: true },
    { raw: 7.5, valid: true },
    { raw: 0.9, valid: false },
    { raw: 10.1, valid: false },
    { raw: Number.NaN, valid: false },
  ])("Score accepts $raw: $valid", ({ raw, valid }) => {
    expect(Score.create(raw).isSuccess).toBe(valid);
  });

  it.each([
    { raw: 0, valid: true },
    { raw: 1999, valid: true },
    { raw: -1, valid: false },
    { raw: 12.5, valid: false },
  ])("Price accepts $raw cents: $valid", ({ raw, valid }) => {
    expect(Price.create(raw).isSuccess).toBe(valid);
  });

  it.each([
    { euros: 19.99, cents: 1999 },
    { euros: 0.1 + 0.2, cents: 30 },
    { euros: 1234.5, cents: 123450 },
  ])("Price converts $euros € into $cents whole cents", ({ euros, cents }) => {
    expect(Price.fromEuros(euros).getValue().value).toBe(cents);
  });

  it.each([-0.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "Price refuses %p euros",
    (euros) => {
      expect(Price.fromEuros(euros).isFailure).toBe(true);
    },
  );

  it.each([
    { raw: 0.2, score: 1 },
    { raw: 7.46, score: 7.5 },
    { raw: 12, score: 10 },
  ])("Score clamps $raw to $score", ({ raw, score }) => {
    expect(Score.clamped(raw).getValue().value).toBe(score);
  });

  it("refuses to clamp a score that is not a number", () => {
    expect(Score.clamped(Number.NaN).isFailure).toBe(true);
  });

  it.each([
    { low: 1000, average: 2000, high: 3000, valid: true },
    { low: 2000, average: 2000, high: 2000, valid: true },
    { low: 2500, average: 2000, high: 3000, valid: false },
    { low: 1000, average: 3500, high: 3000, valid: false },
    { low: 0, average: 2000, high: 3000, valid: false },
    { low: 1000.5, average: 2000, high: 3000, valid: false },
  ])(
    "PriceRange $low ≤ $average ≤ $high: $valid",
    ({ low, average, high, valid }) => {
      const range = PriceRange.create({
        lowCents: low,
        averageCents: average,
        highCents: high,
      });

      expect(range.isSuccess).toBe(valid);
    },
  );

  it.each([
    { raw: "fr", valid: true },
    { raw: "hr", valid: true },
    { raw: "ja", valid: false },
    { raw: "FR", valid: false },
  ])("Language accepts $raw: $valid", ({ raw, valid }) => {
    expect(Language.parse(raw).isSuccess).toBe(valid);
  });

  it.each([
    { raw: "4815162342", valid: true },
    { raw: "", valid: false },
    { raw: "48151a", valid: false },
  ])("VintedId accepts '$raw': $valid", ({ raw, valid }) => {
    expect(VintedId.create(raw).isSuccess).toBe(valid);
  });
});
