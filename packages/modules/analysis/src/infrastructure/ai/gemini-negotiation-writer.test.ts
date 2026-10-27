import { describe, expect, it } from "bun:test";
import { aiFailure } from "@packages/ai/failures";
import type { GeminiClient } from "@packages/ai/gemini-client";
import { type ILogger, Option, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import type { NegotiationRequest } from "../../application/ports/negotiation-writer.port";
import { Language } from "../../domain/value-objects/language.vo";
import { NegotiationTone } from "../../domain/value-objects/negotiation-tone.vo";
import { Price } from "../../domain/value-objects/price.vo";
import { buildListing } from "../../testing/analysis.factory";
import { GeminiNegotiationWriter } from "./gemini-negotiation-writer";

const ANSWER = {
  script: "Bonjour, je vous propose 17 € pour la veste.",
  arguments: ["Listed for 3 weeks"],
};

function given() {
  const gemini = mockPort<GeminiClient>();
  gemini.generateStructured.mockResolvedValue(
    Result.ok({ data: ANSWER, sources: [] }),
  );
  const writer = new GeminiNegotiationWriter(gemini, mockPort<ILogger>());
  const request: NegotiationRequest = {
    listing: buildListing(),
    offerCents: Price.create(1700).getValue(),
    marketAverageCents: 2400,
    daysListed: Option.some(23),
    tone: NegotiationTone.create("urgent").getValue(),
    language: Language.create("fr").getValue(),
  };

  return { gemini, writer, request };
}

describe("GeminiNegotiationWriter", () => {
  it("asks for the exact offer in the requested tone and keeps that tone", async () => {
    const { gemini, writer, request } = given();

    const result = await writer.write(request);

    const sent = gemini.generateStructured.mock.calls[0]?.[0];
    expect(sent?.prompt).toContain("17.00 €");
    expect(sent?.prompt).toContain("urgent");
    expect(sent).toMatchObject({ images: [], search: false });
    expect(result.getValue()).toEqual({ ...ANSWER, tone: request.tone });
  });

  it("maps a model failure to its analysis error", async () => {
    const { gemini, writer, request } = given();
    gemini.generateStructured.mockResolvedValue(
      Result.fail(aiFailure("AI_TIMEOUT", "detail")),
    );

    const result = await writer.write(request);

    expect(result.getError()).toBe("ANALYSIS_AI_TIMEOUT");
  });
});
