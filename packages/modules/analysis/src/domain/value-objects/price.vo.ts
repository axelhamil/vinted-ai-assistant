import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const MAX_PRICE_CENTS = 1_000_000_000;

export const centsSchema = z.number().int().nonnegative().max(MAX_PRICE_CENTS);

export class Price extends ValueObject<number> {
  static fromEuros(euros: number): Result<Price> {
    return Price.create(Math.round(euros * 100));
  }

  protected validate(value: number): Result<number> {
    const result = centsSchema.safeParse(value);
    if (!result.success)
      return Result.fail(
        "A price is a whole number of cents between 0 and 10 000 000 euros",
      );

    return Result.ok(result.data);
  }
}
