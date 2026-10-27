import { describe, expect, it } from "vitest";
import type { AnalysisDto } from "@/lib/messaging/protocol";
import { verdict } from "./verdict";

interface Shape {
  score?: number;
  margin?: number;
  offer?: number;
  confidence?: "low" | "medium" | "high";
  sources?: number;
}

const analysis = ({
  score = 8,
  margin = 23,
  offer = 32,
  confidence = "high",
  sources = 1,
}: Shape): AnalysisDto => ({
  vintedId: "1",
  title: "Veste",
  brand: null,
  price: 40,
  totalPrice: null,
  status: "ANALYZED",
  listedAt: null,
  analyzedAt: "2026-10-27T10:00:00.000Z",
  opportunity: { score, margin, marginPercent: 30, signals: [] },
  marketPrice: {
    low: 40,
    average: 60,
    high: 80,
    confidence,
    reasoning: "",
    retailPrice: null,
    sources: Array.from({ length: sources }, () => ({
      name: "vinted",
      price: 60,
      searchQuery: "veste",
      count: 12,
    })),
  },
  authenticityCheck: { score: 8, flags: [], confidence: "high" },
  photoQuality: {
    score: 7,
    hasModel: false,
    lighting: "good",
    background: "neutral",
    issues: [],
  },
  negotiation: {
    suggestedOffer: offer,
    script: "",
    arguments: [],
    tone: "friendly",
  },
  resale: {
    recommendedPrice: 70,
    estimatedDays: 10,
    tips: [],
    platforms: [],
  },
  groundingSources: [],
});

describe("verdict", () => {
  it("tells a good deal and the offer to make", () => {
    expect(verdict(analysis({ score: 8, margin: 23, offer: 32 }))).toBe(
      "Bonne affaire : offrez 32 €",
    );
  });

  it("tells by how much a listing is overpriced", () => {
    expect(verdict(analysis({ score: 8, margin: -15 }))).toBe(
      "Trop cher de 15 €",
    );
  });

  it("admits when the market price rests on nothing", () => {
    expect(verdict(analysis({ confidence: "low", sources: 0 }))).toBe(
      "Pas assez de données pour estimer ce prix",
    );
  });

  it("starts the good deal at the opportunity threshold", () => {
    expect(verdict(analysis({ score: 7 }))).toBe("Bonne affaire : offrez 32 €");
    expect(verdict(analysis({ score: 6.9 }))).not.toBe(
      "Bonne affaire : offrez 32 €",
    );
  });
});
