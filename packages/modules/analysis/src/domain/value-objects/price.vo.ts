import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const centsSchema = z.number().int().nonnegative();

export class Price extends ValueObject<number> {
  static ofCents(cents: number): Price {
    return new Price(Math.max(0, Math.round(cents)));
  }

  protected validate(value: number): Result<number> {
    const result = centsSchema.safeParse(value);
    if (!result.success)
      return Result.fail("A price is a whole, non-negative number of cents");

    return Result.ok(result.data);
  }
}
