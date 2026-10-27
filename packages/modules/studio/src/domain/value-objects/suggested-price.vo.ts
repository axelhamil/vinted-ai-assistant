import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const MAX_PRICE_CENTS = 1_000_000_000;
const RANGE_SPREAD = 0.2;
const CENTS_PER_EURO = 100;

const suggestedPriceSchema = z.number().int().positive().max(MAX_PRICE_CENTS);

export interface PriceRangeCents {
  lowCents: number;
  highCents: number;
}

function toWholeEuros(cents: number): number {
  return Math.round(cents / CENTS_PER_EURO) * CENTS_PER_EURO;
}

export class SuggestedPrice extends ValueObject<number> {
  range(): PriceRangeCents {
    return {
      lowCents: toWholeEuros(this.value * (1 - RANGE_SPREAD)),
      highCents: toWholeEuros(this.value * (1 + RANGE_SPREAD)),
    };
  }

  protected validate(value: number): Result<number> {
    const result = suggestedPriceSchema.safeParse(value);
    if (!result.success)
      return Result.fail(
        "A suggested price is a whole number of cents above 0 and up to 10 000 000 euros",
      );

    return Result.ok(result.data);
  }
}
