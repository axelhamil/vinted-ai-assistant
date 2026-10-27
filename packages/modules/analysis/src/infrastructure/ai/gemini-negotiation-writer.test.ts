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
import {
  DATA_BLOCK_ESCAPE,
  escapesListingData,
} from "../../testing/prompt-injection";
import { GeminiNegotiationWriter } from "./gemini-negotiation-writer";

const ANSWER = {
  script: "Bonjour, je vous propose 17 € pour la veste.",
  arguments: ["Listed for 3 weeks"],
};

function given(script = ANSWER.script) {
  const gemini = mockPort<GeminiClient>();
  gemini.generateStructured.mockResolvedValue(
    Result.ok({ data: { ...ANSWER, script }, sources: [] }),
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
    expect(sent?.prompt).toContain("Say you can pay right away");
    expect(sent).toMatchObject({ images: [], search: false });
    expect(result.getValue()).toEqual({ ...ANSWER, tone: request.tone });
  });

  it("keeps a seller title that closes the data block inside that block", async () => {
    const { gemini, writer, request } = given();
    const listing = {
      ...request.listing,
      title: `Veste ${DATA_BLOCK_ESCAPE}`,
    };

    await writer.write({ ...request, listing });

    const prompt = gemini.generateStructured.mock.calls[0]?.[0].prompt ?? "";
    expect(escapesListingData(prompt)).toBe(false);
  });

  it.each([
    ["45,00 €", "Je vous propose 45,00 € pour la veste."],
    ["45.00 €", "I offer 45.00 € for the jacket."],
    ["45 €", "45 € and I pay today."],
  ])("accepts a script stating the offer as %s", async (_, script) => {
    const { writer, request } = given(script);

    const result = await writer.write({
      ...request,
      offerCents: Price.create(4500).getValue(),
    });

    expect(result.isSuccess).toBe(true);
  });

  it.each([
    ["another amount", "Je vous propose 15 € pour la veste."],
    ["a longer number holding the offer", "Je vous propose 170 € ou 1.17 €."],
  ])(
    "refuses a script that states %s instead of the offer",
    async (_, script) => {
      const { writer, request } = given(script);

      const result = await writer.write(request);

      expect(result.getError()).toBe("ANALYSIS_AI_PROVIDER_FAILURE");
    },
  );

  it("asks the model for at least one argument and a non-empty script", async () => {
    const { gemini, writer, request } = given();

    await writer.write(request);

    const schema = gemini.generateStructured.mock.calls[0]?.[0].schema;
    expect(schema?.safeParse({ ...ANSWER, arguments: [] }).success).toBe(false);
    expect(schema?.safeParse({ ...ANSWER, script: "" }).success).toBe(false);
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
