import { languageName } from "@packages/ai/languages";
import { untrustedBlock, untrustedNotice } from "@packages/ai/untrusted-data";
import type { ListingSuggestionRequest } from "../../../application/ports/listing-suggester.port";

const LISTING_DATA = "listing_data";

interface Prompt {
  system: string;
  prompt: string;
}

function systemInstruction(language: string): string {
  return `You are a Vinted resale expert. You fill in a Vinted listing form from the photos of an item a seller wants to sell.

You observe and estimate; you never compute price ranges.

${untrustedNotice(LISTING_DATA)}

Every text field (title, description, brand, colors, category, size, material, priceReasoning) is written in ${language}. Every price is in euros.`;
}

const INSTRUCTIONS = `# Instructions

## 1. Item

Fill in every field from what you see on the photos; use the current title as context only.
- title: a catchy, descriptive title of at most 50 characters
- description: the key features, the condition and the measurements when visible
- condition: "new_with_tags" (tags still attached), "new" (never worn, no tags), "very_good", "good" or "satisfactory" (visible wear or flaws); look for tags, wear signs and defects
- brand: the brand visible on the photos (logos, labels), null when none
- category: the Vinted category, like "Tops > T-shirts", null when unsure
- size: the size visible on a label (S, M, L, 38...), null when none
- material: the material read on a label or clearly recognisable, null otherwise
- colors: the main colours of the item

## 2. Price

Use Google Search to find the prices similar items actually sold for, with queries like brand + item type + "vinted", brand + model + "occasion" and brand + category + "second hand". Check that each result matches the photos (same model, similar condition).
- suggestedPriceEuros: one competitive selling price in euros for this item in this condition, above zero
- priceConfidence: "high" (clear brand and condition, well-known market), "medium" (partial information), "low" (uncertain)
- priceReasoning: 1 or 2 sentences explaining the price, citing the prices found

Now fill in the form from the attached photos.`;

export function listingSuggestionPrompt(
  request: ListingSuggestionRequest,
): Prompt {
  const fields = untrustedBlock(LISTING_DATA, {
    currentTitle: request.existingTitle.toNull(),
  });

  return {
    system: systemInstruction(languageName(request.language)),
    prompt: `# Listing to fill in\n\n${fields}\n\n${INSTRUCTIONS}`,
  };
}
