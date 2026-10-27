import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const vintedIdSchema = z
  .string()
  .trim()
  .regex(/^\d{1,20}$/, "A Vinted id is the number in the item URL");

export class VintedId extends ValueObject<string> {
  protected validate(value: string): Result<string> {
    const result = vintedIdSchema.safeParse(value);
    if (!result.success)
      return Result.fail(
        result.error.issues[0]?.message ?? "Invalid Vinted id",
      );

    return Result.ok(result.data);
  }
}
