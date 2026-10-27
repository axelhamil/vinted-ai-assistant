import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const centsSchema = z.number().int().nonnegative();

export class Price extends ValueObject<number> {
  static fromEuros(euros: number): Result<Price> {
    return Price.create(Math.round(euros * 100));
  }

  protected validate(value: number): Result<number> {
    const result = centsSchema.safeParse(value);
    if (!result.success)
      return Result.fail("A price is a whole, non-negative number of cents");

    return Result.ok(result.data);
  }
}
