import type { Option, Result } from "@packages/ddd-kit";
import {
  Resale,
  type ResaleTip,
  type ResaleValue,
} from "../value-objects/resale.vo";

export interface ResaleInput {
  averageCents: number;
  marginPercent: number;
  brand: Option<string>;
}

function estimatedDays(marginPercent: number, hasBrand: boolean): number {
  if (marginPercent >= 20) return hasBrand ? 7 : 14;
  return hasBrand ? 14 : 30;
}

export function computeResale(input: ResaleInput): Result<Resale> {
  const hasBrand = input.brand.isSome();

  const platforms: ResaleValue["platforms"] = [
    { name: "vinted", relevance: "high" },
    { name: "leboncoin", relevance: "medium" },
  ];
  if (hasBrand)
    platforms.push({ name: "vestiaire-collective", relevance: "medium" });

  const tips: ResaleTip[] = [];
  if (input.marginPercent > 30) tips.push("HIGH_MARGIN");
  if (hasBrand) tips.push("HIGHLIGHT_BRAND");
  tips.push("RETAKE_PHOTOS", "DETAILED_DESCRIPTION");

  return Resale.create({
    recommendedPriceCents:
      Math.round((input.averageCents * 105) / 10_000) * 100,
    estimatedDays: estimatedDays(input.marginPercent, hasBrand),
    platforms,
    tips,
  });
}
