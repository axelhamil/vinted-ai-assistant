import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const NEGOTIATION_TONES = ["friendly", "direct", "urgent"] as const;

export type NegotiationToneValue = (typeof NEGOTIATION_TONES)[number];

const negotiationToneSchema = z.enum(NEGOTIATION_TONES);

export class NegotiationTone extends ValueObject<NegotiationToneValue> {
  static parse(raw: string): Result<NegotiationTone> {
    const result = negotiationToneSchema.safeParse(raw);
    if (!result.success)
      return Result.fail(`A tone is one of ${NEGOTIATION_TONES.join(", ")}`);

    return Result.ok(new NegotiationTone(result.data));
  }

  protected validate(
    value: NegotiationToneValue,
  ): Result<NegotiationToneValue> {
    const result = negotiationToneSchema.safeParse(value);
    if (!result.success)
      return Result.fail(`A tone is one of ${NEGOTIATION_TONES.join(", ")}`);

    return Result.ok(result.data);
  }
}
