import type { Listing } from "../../../domain/listing";
import {
  euros,
  languageName,
  listingData,
  type Prompt,
  UNTRUSTED_LISTING_DATA,
} from "./prompt-format";

function systemInstruction(language: string): string {
  return `You are a Vinted resale expert with years of experience. You know second-hand prices on Vinted, Vestiaire Collective, Leboncoin and eBay, and how to authenticate items visually by brand.

You observe and estimate; you never compute scores, margins, offers or resale prices.

${UNTRUSTED_LISTING_DATA}

Every text field (issues, flags, reasoning, detected.condition, signals.label, signals.detail) is written in ${language}. Every price is in euros.`;
}

function listingFields(listing: Listing): string {
  return listingData({
    title: listing.title,
    declaredBrand: listing.brand.toNull(),
    declaredCondition: listing.condition,
    size: listing.size.toNull(),
    askingPrice: euros(listing.priceCents.value),
    shipping: listing.shippingCostCents
      .map((price) => euros(price.value))
      .toNull(),
    description: listing.description,
  });
}

const INSTRUCTIONS = `# Instructions

## 1. Photo quality (photoQuality)

Rate the photos as a sign of how professional the seller is.
- 9-10: professional (studio, model, several angles, close-ups)
- 7-8: good (natural light, neutral background, item clearly visible)
- 5-6: correct (some flaws, item identifiable)
- 3-4: poor (dark, blurry or badly framed)
- 1-2: unusable (the item cannot be assessed)

- lighting: "poor" (dark, direct flash, backlit), "average", "good" (natural or studio light)
- background: "messy" (unmade bed, clutter), "neutral" (plain wall or floor), "professional" (backdrop, mannequin)
- hasModel: true when worn by a person or a mannequin
- issues: only concrete problems you see (main photo blurry, label not visible, announced flaws not shown)

## 2. Authenticity (authenticity)

Rate how likely the item is genuine.
- 9-10: certainly genuine, every marker present and consistent
- 7-8: very likely genuine, main markers fine
- 5-6: probably genuine, a few checkable elements
- 3-4: serious doubts, inconsistencies or missing markers
- 1-2: probably counterfeit, several red flags

Checkpoints: luxury (logo, stitching, hardware, serial number, made in, lining); streetwear (labels, tags, finish, typography); fast fashion (usually genuine, check the condition).
- flags: suspicious or reassuring elements you see
- confidence: "low" (photos insufficient), "medium" (partial assessment), "high" (every element visible)

## 3. Identification (detected)

- brand: the brand actually visible on the photos (logos, labels), null when none; it may differ from the declared brand
- model: the exact model name when identifiable, null otherwise
- condition: the condition you actually observe, in 2 to 4 words

## 4. Market price (market)

Base the estimate on prices items actually sold for on Vinted, not on asking prices. Identify the exact category (brand, type, condition), then adjust to the condition seen on the photos.
- lowEuros: quick sale price (hurried buyer, hard bargaining)
- averageEuros: realistic median resale price for this item in this condition
- highEuros: realistic ceiling (patience, perfect condition)
- lowEuros must not exceed averageEuros, and averageEuros must not exceed highEuros; all are above zero
- confidence: "low" (rare item, hard to compare), "medium" (a few references), "high" (well-known market)
- reasoning: 1 or 2 sentences explaining the estimate, citing comparables when possible
- retail: new retail price and brand when one exists, null for vintage or unreferenced items

## 5. Sources (market.sources)

Use Google Search with several queries (brand + model + "occasion", brand + model + "vinted", the listing title, brand + item type + size + "second hand"). Check that each result visually matches the photos (same model, similar condition) and record the sold price. Look at Vinted first, then Vestiaire Collective, Leboncoin, eBay, Google Shopping, Videdressing, Depop and official sites for the retail price.

For each source: name (platform), priceEuros (median price found after visual comparison), searchQuery (the exact query used), count (number of similar items found). List only sources with visually similar items, 8 to 12 sources.

## 6. Signals (signals)

Give 3 to 5 observed signals about the item: type "positive" (opportunity), "negative" (risk) or "neutral" (information), a short label and an actionable detail. Add a size signal when relevant: M or L is a popular size, XS or XXL and above sell more slowly.

Now analyse the attached photos with this method.`;

export function listingFactsPrompt(listing: Listing): Prompt {
  return {
    system: systemInstruction(languageName(listing.language.value)),
    prompt: `# Listing to analyse\n\n${listingFields(listing)}\n\n${INSTRUCTIONS}`,
  };
}
