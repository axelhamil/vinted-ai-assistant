import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const MIN_SCORE = 1;
const MAX_SCORE = 10;

const scoreSchema = z.number().min(MIN_SCORE).max(MAX_SCORE);

export class Score extends ValueObject<number> {
  static clamped(raw: number): Score {
    const rounded = Math.round(raw * 10) / 10;

    return new Score(Math.min(MAX_SCORE, Math.max(MIN_SCORE, rounded)));
  }

  protected validate(value: number): Result<number> {
    const result = scoreSchema.safeParse(value);
    if (!result.success) return Result.fail("A score lies between 1 and 10");

    return Result.ok(result.data);
  }
}
