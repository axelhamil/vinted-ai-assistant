import { describe, expect, it } from "bun:test";
import { Option } from "@packages/ddd-kit";
import { computeResale } from "./resale";

const BASE = {
  averageCents: 10000,
  marginPercent: 10,
  brand: Option.none<string>(),
};

describe("computeResale", () => {
  it.each([
    { averageCents: 10000, recommended: 10500 },
    { averageCents: 3333, recommended: 3500 },
    { averageCents: 2990, recommended: 3100 },
  ])(
    "recommends 5 % above the $averageCents average, rounded to the euro",
    ({ averageCents, recommended }) => {
      expect(
        computeResale({ ...BASE, averageCents }).getValue().value
          .recommendedPriceCents,
      ).toBe(recommended);
    },
  );

  it.each([
    { marginPercent: 20, brand: "Levi's", days: 7 },
    { marginPercent: 20, brand: null, days: 14 },
    { marginPercent: 19.9, brand: "Levi's", days: 14 },
    { marginPercent: 19.9, brand: null, days: 30 },
  ])(
    "expects $days days at $marginPercent % with brand $brand",
    ({ marginPercent, brand, days }) => {
      const resale = computeResale({
        ...BASE,
        marginPercent,
        brand: Option.fromNullable(brand),
      });

      expect(resale.getValue().value.estimatedDays).toBe(days);
    },
  );

  it.each([
    {
      brand: "Levi's",
      platforms: [
        { name: "vinted", relevance: "high" },
        { name: "leboncoin", relevance: "medium" },
        { name: "vestiaire-collective", relevance: "medium" },
      ],
    },
    {
      brand: null,
      platforms: [
        { name: "vinted", relevance: "high" },
        { name: "leboncoin", relevance: "medium" },
      ],
    },
  ])("lists the platforms for brand $brand", ({ brand, platforms }) => {
    const resale = computeResale({
      ...BASE,
      brand: Option.fromNullable(brand),
    });

    expect(resale.getValue().value.platforms).toEqual([...platforms]);
  });

  it.each([
    {
      marginPercent: 30.1,
      brand: "Levi's",
      tips: [
        "HIGH_MARGIN",
        "HIGHLIGHT_BRAND",
        "RETAKE_PHOTOS",
        "DETAILED_DESCRIPTION",
      ],
    },
    {
      marginPercent: 30,
      brand: null,
      tips: ["RETAKE_PHOTOS", "DETAILED_DESCRIPTION"],
    },
  ])(
    "gives tips $tips at $marginPercent % with brand $brand",
    ({ marginPercent, brand, tips }) => {
      const resale = computeResale({
        ...BASE,
        marginPercent,
        brand: Option.fromNullable(brand),
      });

      expect(resale.getValue().value.tips).toEqual([...tips]);
    },
  );
});
