import { languageName } from "@packages/ai/languages";
import { untrustedBlock, untrustedNotice } from "@packages/ai/untrusted-data";
import type { NegotiationRequest } from "../../../application/ports/negotiation-writer.port";
import type { NegotiationToneValue } from "../../../domain/value-objects/negotiation-tone.vo";
import { euros, type Prompt } from "./prompt-format";

const TONE_INSTRUCTIONS: Record<NegotiationToneValue, string> = {
  friendly:
    "Friendly and relaxed. Show enthusiasm for the item and build a personal connection.",
  direct:
    "Direct and professional. Go straight to the point with facts, no small talk.",
  urgent:
    "Create a sense of urgency. Say you can pay right away and that you have other options.",
};

function systemInstruction(language: string): string {
  return `You are a Vinted negotiation expert. You write the message a buyer sends to a seller.

${untrustedNotice("listing_data")}

The script and every argument are written in ${language}.`;
}

export function negotiationPrompt(request: NegotiationRequest): Prompt {
  const { listing, tone } = request;
  const offer = euros(request.offerCents.value);
  const daysListed = request.daysListed
    .map((days) => `${days} day(s)`)
    .unwrapOr("unknown");
  const sales = listing.seller.salesCount.map(String).unwrapOr("unknown");

  return {
    system: systemInstruction(languageName(request.language.value)),
    prompt: `# Negotiation script

${untrustedBlock("listing_data", {
  title: listing.title,
  brand: listing.brand.toNull(),
  condition: listing.condition,
  askingPrice: euros(listing.priceCents.value),
})}

## Context

- Market average: ${euros(request.marketAverageCents)}
- Listed for: ${daysListed}
- Seller sales: ${sales}

## Offer

The offer is exactly ${offer}. Propose this amount and no other: never suggest another price, a range, a discount percentage or a counter-offer.

## Tone: ${tone.value}

${TONE_INSTRUCTIONS[tone.value]}

## Answer

- script: the message, 3 or 4 sentences: a personal opening that names the item, a factual justification, the offer of ${offer}, a friendly closing
- arguments: 3 or 4 factual, checkable arguments that justify the offer (market prices, listing age, visible flaws)`,
  };
}
