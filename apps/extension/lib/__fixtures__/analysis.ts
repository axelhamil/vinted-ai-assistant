import type { AnalysisDto, AnalyzeInput } from "@/lib/messaging/protocol";

export const VINTED_ID = "123";

export function analysisDto(overrides: Partial<AnalysisDto> = {}): AnalysisDto {
  return {
    vintedId: VINTED_ID,
    title: "Veste Levi's",
    brand: "Levi's",
    price: 25,
    totalPrice: 28.5,
    status: "ANALYZED",
    listedAt: null,
    analyzedAt: "2026-10-27T10:00:00.000Z",
    opportunity: { score: 8, margin: 20, marginPercent: 40, signals: [] },
    marketPrice: {
      low: 30,
      average: 45,
      high: 60,
      confidence: "medium",
      reasoning: "Comparable listings",
      retailPrice: null,
      sources: [],
    },
    authenticityCheck: { score: 9, flags: [], confidence: "high" },
    photoQuality: {
      score: 7,
      hasModel: false,
      lighting: "good",
      background: "neutral",
      issues: [],
    },
    negotiation: {
      suggestedOffer: 20,
      script: "Bonjour",
      arguments: [],
      tone: "friendly",
    },
    resale: {
      recommendedPrice: 45,
      estimatedDays: 10,
      tips: ["HIGH_MARGIN"],
      platforms: [{ name: "vinted", relevance: "high" }],
    },
    groundingSources: [],
    ...overrides,
  };
}

export const analyzeInput: AnalyzeInput = {
  vintedId: VINTED_ID,
  url: `https://www.vinted.fr/items/${VINTED_ID}`,
  title: "Veste Levi's",
  description: "Très bon état",
  price: 25,
  totalPrice: 28.5,
  shippingCost: 3.5,
  brand: "Levi's",
  size: "M",
  condition: "Très bon état",
  photos: ["https://images.vinted.net/1.jpg"],
  listedAt: null,
  seller: { username: "alice", rating: 4.8, salesCount: 12 },
};
