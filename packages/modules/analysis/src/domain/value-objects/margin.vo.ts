import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const marginSchema = z.object({
  amountCents: z.number().int(),
  percent: z.number().finite(),
});

export type MarginValue = z.infer<typeof marginSchema>;

export class Margin extends ValueObject<MarginValue> {
  static of(value: MarginValue): Margin {
    return new Margin(value);
  }

  protected validate(value: MarginValue): Result<MarginValue> {
    const result = marginSchema.safeParse(value);
    if (!result.success)
      return Result.fail("A margin is whole cents and a finite percent");

    return Result.ok(result.data);
  }
}
