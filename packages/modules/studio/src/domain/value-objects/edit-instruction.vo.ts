import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

const editInstructionSchema = z.string().trim().min(10).max(1000);

export class EditInstruction extends ValueObject<string> {
  protected validate(value: string): Result<string> {
    const result = editInstructionSchema.safeParse(value);
    if (!result.success)
      return Result.fail("An edit instruction holds 10 to 1000 characters");

    return Result.ok(result.data);
  }
}
