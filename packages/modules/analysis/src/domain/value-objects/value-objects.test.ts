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
