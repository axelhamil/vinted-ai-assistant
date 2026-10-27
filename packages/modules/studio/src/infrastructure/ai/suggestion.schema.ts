import { z } from "zod";
import {
  ITEM_CONDITIONS,
  PRICE_CONFIDENCES,
} from "../../domain/listing-suggestion";

export const listingSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  condition: z.enum(ITEM_CONDITIONS),
  brand: z.string().nullable(),
  colors: z.array(z.string()),
  category: z.string().nullable(),
  size: z.string().nullable(),
  material: z.string().nullable(),
  suggestedPriceEuros: z
    .number()
    .describe("Competitive selling price on Vinted in euros"),
  priceConfidence: z.enum(PRICE_CONFIDENCES),
  priceReasoning: z.string(),
});

export type ListingSuggestionAnswer = z.infer<typeof listingSuggestionSchema>;
