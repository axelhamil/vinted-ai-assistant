import { Option, Result } from "@packages/ddd-kit";
import type { Listing } from "../../domain/listing";
import { Language } from "../../domain/value-objects/language.vo";
import { Price } from "../../domain/value-objects/price.vo";
import { VintedId } from "../../domain/value-objects/vinted-id.vo";
import type { ListingDto } from "../dto/analysis.dto";

export const INPUT_INVALID = "ANALYSIS_INPUT_INVALID";

export type AnalysisInputInvalid = typeof INPUT_INVALID;

export function parseVintedId(
  raw: string,
): Result<VintedId, AnalysisInputInvalid> {
  return VintedId.create(raw).mapError(() => INPUT_INVALID);
}

function optionalPrice(cents: number | null): Result<Option<Price>> {
  return Option.fromNullable(cents).tryMap((value) => Price.create(value));
}

export function toListing(
  dto: ListingDto,
): Result<Listing, AnalysisInputInvalid> {
  const parsed = Result.all([
    VintedId.create(dto.vintedId),
    Price.create(dto.priceCents),
    optionalPrice(dto.totalPriceCents),
    optionalPrice(dto.shippingCostCents),
    Language.parse(dto.language),
  ]);
  if (parsed.isFailure) return Result.fail(INPUT_INVALID);

  const [vintedId, priceCents, totalPriceCents, shippingCostCents, language] =
    parsed.getValue();

  return Result.ok({
    vintedId,
    url: dto.url,
    title: dto.title,
    description: dto.description,
    brand: Option.fromNullable(dto.brand),
    size: Option.fromNullable(dto.size),
    condition: dto.condition,
    priceCents,
    totalPriceCents,
    shippingCostCents,
    listedAt: Option.fromNullable(dto.listedAt),
    photos: dto.photos,
    seller: {
      username: dto.seller.username,
      rating: Option.fromNullable(dto.seller.rating),
      salesCount: Option.fromNullable(dto.seller.salesCount),
    },
    language,
  });
}
