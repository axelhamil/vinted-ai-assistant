import { describe, expect, it } from "bun:test";
import { marginLevel, scoreLevel } from "./contract";

describe("levels", () => {
  it.each([
    { score: 10, level: "high" },
    { score: 7, level: "high" },
    { score: 6.9, level: "medium" },
    { score: 4, level: "medium" },
    { score: 3.9, level: "low" },
  ])("rates a score of $score as $level", ({ score, level }) => {
    expect(scoreLevel(score)).toBe(level);
  });

  it.each([
    { percent: 30, level: "high" },
    { percent: 29.9, level: "medium" },
    { percent: 15, level: "medium" },
    { percent: 14.9, level: "low" },
    { percent: -5, level: "low" },
  ])("rates a $percent % margin as $level", ({ percent, level }) => {
    expect(marginLevel(percent)).toBe(level);
  });
});
