import type { Option } from "@packages/ddd-kit";
import type {
  ItemCondition,
  PriceConfidence,
} from "../../domain/listing-suggestion";
import type { SystemPreset } from "../../domain/presets";
import type { GroundingSource } from "../ports/listing-suggester.port";
import type { EditedPhoto } from "../ports/photo-editor.port";
import type { SuggestedListing } from "../services/studio.service";

export interface PresetDto {
  id: string;
  name: string;
  description: string;
}

export interface EditedPhotoDto {
  mimeType: string;
  imageBase64: string;
}

export interface ListingSuggestionDto {
  title: string;
  description: string;
  condition: ItemCondition;
  brand: string | null;
  colors: string[];
  category: string | null;
  size: string | null;
  material: string | null;
  price: number;
  priceRange: { low: number; high: number };
  priceConfidence: PriceConfidence;
  priceReasoning: string;
  groundingSources: GroundingSource[];
}

function euros(cents: number): number {
  return cents / 100;
}

function nullable(value: Option<string>): string | null {
  return value.toUndefined() ?? null;
}

export function toPresetsDto(presets: SystemPreset[]): {
  presets: PresetDto[];
} {
  return {
    presets: presets.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  };
}

export function toEditedPhotoDto({
  mimeType,
  bytes,
}: EditedPhoto): EditedPhotoDto {
  return { mimeType, imageBase64: Buffer.from(bytes).toString("base64") };
}

export function toListingSuggestionDto({
  suggestion,
  groundingSources,
}: SuggestedListing): ListingSuggestionDto {
  const price = suggestion.get("price");
  const { lowCents, highCents } = price.range();

  return {
    title: suggestion.get("title").value,
    description: suggestion.get("description"),
    condition: suggestion.get("condition"),
    brand: nullable(suggestion.get("brand")),
    colors: suggestion.get("colors"),
    category: nullable(suggestion.get("category")),
    size: nullable(suggestion.get("size")),
    material: nullable(suggestion.get("material")),
    price: euros(price.value),
    priceRange: { low: euros(lowCents), high: euros(highCents) },
    priceConfidence: suggestion.get("priceConfidence"),
    priceReasoning: suggestion.get("priceReasoning"),
    groundingSources,
  };
}
