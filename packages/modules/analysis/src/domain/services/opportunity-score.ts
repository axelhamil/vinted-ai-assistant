import type { Option, Result } from "@packages/ddd-kit";
import { Score } from "../value-objects/score.vo";

export interface OpportunityInput {
  marginPercent: number;
  photoQualityScore: number;
  authenticityScore: number;
  daysListed: Option<number>;
  size: Option<string>;
}

const BEST_SIZES = ["M", "L"];
const COMMON_SIZES = ["S", "XL"];
const EDGE_SIZE = /^(XS|X{2,}L|[2-9]XL)$/;
const SIZE_SEPARATOR = /[\s/]+/;

function marginPoints(percent: number): number {
  if (percent > 40) return 10;
  if (percent >= 30) return 8;
  if (percent >= 20) return 6;
  if (percent >= 10) return 4;
  if (percent >= 0) return 2;
  return 1;
}

function photoPoints(photoQualityScore: number): number {
  return Math.min(10, Math.max(1, 11 - photoQualityScore));
}

function agePoints(days: Option<number>): number {
  if (days.isNone()) return 5;

  const listed = days.unwrap();
  if (listed > 30) return 10;
  if (listed >= 15) return 7;
  if (listed >= 7) return 5;
  return 3;
}

function sizePoints(size: Option<string>): number {
  const normalized = size
    .map((raw) => raw.trim().split(SIZE_SEPARATOR)[0] ?? "")
    .unwrapOr("")
    .toUpperCase();

  if (BEST_SIZES.includes(normalized)) return 10;
  if (COMMON_SIZES.includes(normalized)) return 6;
  if (EDGE_SIZE.test(normalized)) return 3;
  return 6;
}

export function computeOpportunityScore(
  input: OpportunityInput,
): Result<Score> {
  const weightedHundredths =
    35 * marginPoints(input.marginPercent) +
    20 * photoPoints(input.photoQualityScore) +
    15 * agePoints(input.daysListed) +
    15 * input.authenticityScore +
    15 * sizePoints(input.size);

  return Score.clamped(Math.round(weightedHundredths / 10) / 10);
}
