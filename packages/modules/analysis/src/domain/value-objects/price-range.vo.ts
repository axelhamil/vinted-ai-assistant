import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const positiveCents = z.number().int().positive();

const priceRangeSchema = z
  .object({
    lowCents: positiveCents,
    averageCents: positiveCents,
    highCents: positiveCents,
  })
  .refine(
    ({ lowCents, averageCents, highCents }) =>
      lowCents <= averageCents && averageCents <= highCents,
    "A market range needs low ≤ average ≤ high",
  );

export type PriceRangeValue = z.infer<typeof priceRangeSchema>;

export class PriceRange extends ValueObject<PriceRangeValue> {
  protected validate(value: PriceRangeValue): Result<PriceRangeValue> {
    const result = priceRangeSchema.safeParse(value);
    if (!result.success)
      return Result.fail(
        result.error.issues[0]?.message ?? "Invalid market range",
      );

    return Result.ok(result.data);
  }
}
