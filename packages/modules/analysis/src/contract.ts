export const OPPORTUNITY_MIN_SCORE = 7;
export const ANALYSIS_FRESH_FOR_MS = 3_600_000;

export const ANALYSIS_STATUSES = [
  "ANALYZED",
  "WATCHING",
  "BOUGHT",
  "SOLD",
  "ARCHIVED",
] as const;

export type AnalysisStatusValue = (typeof ANALYSIS_STATUSES)[number];

export const NEXT_STATUSES: Record<
  AnalysisStatusValue,
  readonly AnalysisStatusValue[]
> = {
  ANALYZED: ["WATCHING", "BOUGHT", "ARCHIVED"],
  WATCHING: ["BOUGHT", "ARCHIVED"],
  BOUGHT: ["SOLD", "ARCHIVED"],
  SOLD: ["ARCHIVED"],
  ARCHIVED: [],
};

export type Level = "high" | "medium" | "low";

export function scoreLevel(score: number): Level {
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function marginLevel(percent: number): Level {
  if (percent >= 30) return "high";
  if (percent >= 15) return "medium";
  return "low";
}
