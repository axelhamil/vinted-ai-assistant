import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";
import { centsSchema } from "./price.vo";

export const RESALE_TIPS = [
  "HIGH_MARGIN",
  "HIGHLIGHT_BRAND",
  "RETAKE_PHOTOS",
  "DETAILED_DESCRIPTION",
] as const;

const resaleSchema = z.object({
  recommendedPriceCents: centsSchema,
  estimatedDays: z.number().int().positive(),
  platforms: z.array(
    z.object({
      name: z.enum(["vinted", "leboncoin", "vestiaire-collective"]),
      relevance: z.enum(["high", "medium", "low"]),
    }),
  ),
  tips: z.array(z.enum(RESALE_TIPS)),
});

export type ResaleValue = z.infer<typeof resaleSchema>;
export type ResaleTip = (typeof RESALE_TIPS)[number];

export class Resale extends ValueObject<ResaleValue> {
  static of(value: ResaleValue): Resale {
    return new Resale(value);
  }

  protected validate(value: ResaleValue): Result<ResaleValue> {
    const result = resaleSchema.safeParse(value);
    if (!result.success) return Result.fail("Invalid resale recommendation");

    return Result.ok(result.data);
  }
}
