import { type Option, Result } from "@packages/ddd-kit";
import { z } from "zod";
import { ListingTitle } from "./value-objects/listing-title.vo";
import { SuggestedPrice } from "./value-objects/suggested-price.vo";

export const ITEM_CONDITIONS = [
  "new_with_tags",
  "new",
  "very_good",
  "good",
  "satisfactory",
] as const;

export const PRICE_CONFIDENCES = ["low", "medium", "high"] as const;

const conditionSchema = z.enum(ITEM_CONDITIONS);
const confidenceSchema = z.enum(PRICE_CONFIDENCES);

export type ItemCondition = (typeof ITEM_CONDITIONS)[number];
export type PriceConfidence = (typeof PRICE_CONFIDENCES)[number];

export interface ListingSuggestionFacts {
  title: string;
  description: string;
  condition: string;
  brand: Option<string>;
  colors: string[];
  category: Option<string>;
  size: Option<string>;
  material: Option<string>;
  priceCents: number;
  priceConfidence: string;
  priceReasoning: string;
}

export interface ListingSuggestionProps {
  title: ListingTitle;
  description: string;
  condition: ItemCondition;
  brand: Option<string>;
  colors: string[];
  category: Option<string>;
  size: Option<string>;
  material: Option<string>;
  price: SuggestedPrice;
  priceConfidence: PriceConfidence;
  priceReasoning: string;
}

export class ListingSuggestion {
  private constructor(private readonly props: ListingSuggestionProps) {}

  static create(facts: ListingSuggestionFacts): Result<ListingSuggestion> {
    const title = ListingTitle.fit(facts.title);
    if (title.isFailure) return Result.fail(title.getError());

    const condition = conditionSchema.safeParse(facts.condition);
    if (!condition.success)
      return Result.fail(`Unknown item condition ${facts.condition}`);

    const price = SuggestedPrice.create(facts.priceCents);
    if (price.isFailure) return Result.fail(price.getError());

    const priceConfidence = confidenceSchema.safeParse(facts.priceConfidence);
    if (!priceConfidence.success)
      return Result.fail(`Unknown price confidence ${facts.priceConfidence}`);

    return Result.ok(
      new ListingSuggestion({
        ...facts,
        title: title.getValue(),
        condition: condition.data,
        price: price.getValue(),
        priceConfidence: priceConfidence.data,
      }),
    );
  }

  get<K extends keyof ListingSuggestionProps>(
    key: K,
  ): ListingSuggestionProps[K] {
    return this.props[key];
  }
}
