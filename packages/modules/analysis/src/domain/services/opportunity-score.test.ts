import { describe, expect, it } from "bun:test";
import { Option } from "@packages/ddd-kit";
import { computeOpportunityScore } from "./opportunity-score";

const WEAKEST = {
  marginPercent: -1,
  photoQualityScore: 10,
  authenticityScore: 1,
  daysListed: Option.none<number>(),
  size: Option.none<string>(),
};

describe("computeOpportunityScore", () => {
  it.each([
    { marginPercent: 40.1, score: 5.5 },
    { marginPercent: 40, score: 4.8 },
    { marginPercent: 30, score: 4.8 },
    { marginPercent: 29.9, score: 4.1 },
    { marginPercent: 20, score: 4.1 },
    { marginPercent: 19.9, score: 3.4 },
    { marginPercent: 10, score: 3.4 },
    { marginPercent: 9.9, score: 2.7 },
    { marginPercent: 0, score: 2.7 },
    { marginPercent: -0.1, score: 2.4 },
  ])(
    "weighs a $marginPercent % margin into $score",
    ({ marginPercent, score }) => {
      expect(
        computeOpportunityScore({ ...WEAKEST, marginPercent }).getValue().value,
      ).toBe(score);
    },
  );

  it.each([
    { days: 31, score: 3.1 },
    { days: 30, score: 2.7 },
    { days: 15, score: 2.7 },
    { days: 14, score: 2.4 },
    { days: 7, score: 2.4 },
    { days: 6, score: 2.1 },
    { days: null, score: 2.4 },
  ])("weighs $days days listed into $score", ({ days, score }) => {
    const daysListed = Option.fromNullable(days);

    expect(
      computeOpportunityScore({ ...WEAKEST, daysListed }).getValue().value,
    ).toBe(score);
  });

  it.each([
    { size: "M", score: 3 },
    { size: " l ", score: 3 },
    { size: "s", score: 2.4 },
    { size: "XL", score: 2.4 },
    { size: "xs", score: 1.9 },
    { size: "XXL", score: 1.9 },
    { size: "XXXL", score: 1.9 },
    { size: "4XL", score: 1.9 },
    { size: "XXS", score: 2.4 },
    { size: "M / 38 / 10", score: 3 },
    { size: "xl/42", score: 2.4 },
    { size: " xs 34", score: 1.9 },
    { size: "38 / M", score: 2.4 },
    { size: "38", score: 2.4 },
    { size: null, score: 2.4 },
  ])("weighs size $size into $score", ({ size, score }) => {
    const input = {
      ...WEAKEST,
      daysListed: Option.some(10),
      size: Option.fromNullable(size),
    };

    expect(computeOpportunityScore(input).getValue().value).toBe(score);
  });

  it.each([
    { photoQualityScore: 1, score: 4.2 },
    { photoQualityScore: 6, score: 3.2 },
    { photoQualityScore: 10, score: 2.4 },
    { photoQualityScore: 0.5, score: 4.2 },
    { photoQualityScore: 11, score: 2.4 },
  ])(
    "rewards amateur photos: quality $photoQualityScore gives $score",
    ({ photoQualityScore, score }) => {
      expect(
        computeOpportunityScore({ ...WEAKEST, photoQualityScore }).getValue()
          .value,
      ).toBe(score);
    },
  );

  it("weighs authenticity by its own score", () => {
    expect(
      computeOpportunityScore({ ...WEAKEST, authenticityScore: 10 }).getValue()
        .value,
    ).toBe(3.7);
  });

  it("reaches 10 when every criterion is at its best", () => {
    const score = computeOpportunityScore({
      marginPercent: 80,
      photoQualityScore: 1,
      authenticityScore: 10,
      daysListed: Option.some(60),
      size: Option.some("L"),
    });

    expect(score.getValue().value).toBe(10);
  });
});
