import { z } from "zod";

const confidence = z.enum(["low", "medium", "high"]);

export const listingFactsSchema = z.object({
  photoQuality: z.object({
    score: z.number().describe("Photo quality from 1 to 10"),
    hasModel: z.boolean(),
    lighting: z.enum(["poor", "average", "good"]),
    background: z.enum(["messy", "neutral", "professional"]),
    issues: z.array(z.string()),
  }),
  authenticity: z.object({
    score: z.number().describe("Authenticity likelihood from 1 to 10"),
    flags: z.array(z.string()),
    confidence,
  }),
  market: z.object({
    lowEuros: z.number().describe("Quick-sale resale price in euros"),
    averageEuros: z.number().describe("Median resale price in euros"),
    highEuros: z.number().describe("Realistic ceiling resale price in euros"),
    confidence,
    reasoning: z.string(),
    retail: z
      .object({
        priceEuros: z.number().describe("New retail price in euros"),
        brand: z.string(),
      })
      .nullable(),
    sources: z.array(
      z.object({
        name: z.string(),
        priceEuros: z.number().describe("Median price found in euros"),
        searchQuery: z.string(),
        count: z.number().int(),
      }),
    ),
  }),
  detected: z.object({
    brand: z.string().nullable(),
    model: z.string().nullable(),
    condition: z.string(),
  }),
  signals: z.array(
    z.object({
      type: z.enum(["positive", "negative", "neutral"]),
      label: z.string(),
      detail: z.string(),
    }),
  ),
});

export type ListingFactsAnswer = z.infer<typeof listingFactsSchema>;
