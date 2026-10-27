import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const ANALYSIS_STATUSES = [
  "ANALYZED",
  "WATCHING",
  "BOUGHT",
  "SOLD",
  "ARCHIVED",
] as const;

export type AnalysisStatusValue = (typeof ANALYSIS_STATUSES)[number];

export const ANALYSIS_STATUS = {
  ANALYZED: "ANALYZED",
  WATCHING: "WATCHING",
  BOUGHT: "BOUGHT",
  SOLD: "SOLD",
  ARCHIVED: "ARCHIVED",
} as const satisfies { [Status in AnalysisStatusValue]: Status };

export const EXCLUDED_FROM_OPPORTUNITIES = ANALYSIS_STATUS.ARCHIVED;

const NEXT_STATUSES: Record<
  AnalysisStatusValue,
  readonly AnalysisStatusValue[]
> = {
  ANALYZED: ["WATCHING", "BOUGHT", "ARCHIVED"],
  WATCHING: ["BOUGHT", "ARCHIVED"],
  BOUGHT: ["SOLD", "ARCHIVED"],
  SOLD: ["ARCHIVED"],
  ARCHIVED: [],
};

const analysisStatusSchema = z.enum(ANALYSIS_STATUSES);

export class AnalysisStatus extends ValueObject<AnalysisStatusValue> {
  static parse(raw: string): Result<AnalysisStatus> {
    const result = analysisStatusSchema.safeParse(raw);
    if (!result.success) return Result.fail("Unknown analysis status");

    return AnalysisStatus.create(result.data);
  }

  canMoveTo(next: AnalysisStatus): boolean {
    return NEXT_STATUSES[this.value].includes(next.value);
  }

  protected validate(value: AnalysisStatusValue): Result<AnalysisStatusValue> {
    const result = analysisStatusSchema.safeParse(value);
    if (!result.success) return Result.fail("Unknown analysis status");

    return Result.ok(result.data);
  }
}
