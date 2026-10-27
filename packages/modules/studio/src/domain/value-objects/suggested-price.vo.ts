import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const MAX_PRICE_CENTS = 1_000_000_000;
const RANGE_SPREAD = 0.2;
const CENTS_PER_EURO = 100;
const SMALL_PRICE_STEP_CENTS = 10;
const SMALL_PRICE_LIMIT_CENTS = 1000;

const suggestedPriceSchema = z.number().int().positive().max(MAX_PRICE_CENTS);

export interface PriceRangeCents {
  lowCents: number;
  highCents: number;
}

function roundTo(cents: number, step: number): number {
  return Math.round(cents / step) * step;
}

export class SuggestedPrice extends ValueObject<number> {
  range(): PriceRangeCents {
    const step =
      this.value >= SMALL_PRICE_LIMIT_CENTS
        ? CENTS_PER_EURO
        : SMALL_PRICE_STEP_CENTS;
    const lowCents = Math.max(
      SMALL_PRICE_STEP_CENTS,
      roundTo(this.value * (1 - RANGE_SPREAD), step),
    );
    const highCents = Math.max(
      lowCents,
      roundTo(this.value * (1 + RANGE_SPREAD), step),
    );

    return { lowCents, highCents };
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
