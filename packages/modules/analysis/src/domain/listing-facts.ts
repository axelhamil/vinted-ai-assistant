import type { Option } from "@packages/ddd-kit";

export type Confidence = "low" | "medium" | "high";
export type PhotoLighting = "poor" | "average" | "good";
export type PhotoBackground = "messy" | "neutral" | "professional";
export type SignalType = "positive" | "negative" | "neutral";

export interface MarketSource {
  name: string;
  priceCents: number;
  searchQuery: string;
  count: number;
}

export interface ListingFacts {
  photoQuality: {
    score: number;
    hasModel: boolean;
    lighting: PhotoLighting;
    background: PhotoBackground;
    issues: string[];
  };
  authenticity: {
    score: number;
    flags: string[];
    confidence: Confidence;
  };
  market: {
    lowCents: number;
    averageCents: number;
    highCents: number;
    confidence: Confidence;
    reasoning: string;
    retail: Option<{ priceCents: number; brand: string }>;
    sources: MarketSource[];
  };
  detected: {
    brand: Option<string>;
    model: Option<string>;
    condition: string;
  };
  signals: { type: SignalType; label: string; detail: string }[];
}
