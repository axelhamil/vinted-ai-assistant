import { describe, expect, it, mock } from "bun:test";
import {
  ApiError,
  type Candidate,
  FinishReason,
  GenerateContentResponse,
} from "@google/genai";
import { z } from "zod";
import type { AiFailureCode } from "../failures";
import { createGeminiClient, type GenAiModels } from "../gemini-client";

const listingSchema = z.object({
  brand: z.string(),
  price: z.number(),
});

function responseWith(candidate: Candidate): GenerateContentResponse {
  return Object.assign(new GenerateContentResponse(), {
    candidates: [candidate],
  });
}

function answering(text: string, extra: Candidate = {}): Candidate {
  return { content: { role: "model", parts: [{ text }] }, ...extra };
}

function clientAnswering(response: GenerateContentResponse) {
  const generateContent = mock<GenAiModels["generateContent"]>();
  generateContent.mockResolvedValue(response);

  return {
    client: createGeminiClient({ models: { generateContent } }),
    generateContent,
  };
}

function clientFailingWith(error: unknown) {
  const generateContent = mock<GenAiModels["generateContent"]>();
  generateContent.mockRejectedValue(error);

  return createGeminiClient({ models: { generateContent } });
}

const request = {
  system: "You price second-hand clothes.",
  prompt: "Price this jacket as JSON.",
  images: [
    { mimeType: "image/webp", base64: "AAAA" },
    { mimeType: "image/webp", base64: "BBBB" },
  ],
  schema: listingSchema,
  search: true,
};

describe("generateStructured", () => {
  it("returns the parsed data and the grounding sources deduplicated by uri", async () => {
    const { client } = clientAnswering(
      responseWith(
        answering('{"brand":"Levi\'s","price":35}', {
          groundingMetadata: {
            groundingChunks: [
              { web: { title: "vinted.fr", uri: "https://a.example/1" } },
              { web: { title: "vinted.fr again", uri: "https://a.example/1" } },
              { web: { title: "ebay.fr", uri: "https://b.example/2" } },
            ],
          },
        }),
      ),
    );

    const result = await client.generateStructured(request);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      data: { brand: "Levi's", price: 35 },
      sources: [
        { title: "vinted.fr", uri: "https://a.example/1" },
        { title: "ebay.fr", uri: "https://b.example/2" },
      ],
    });
  });

  it("asks for JSON matching the schema, with search, the system text and the images before the prompt", async () => {
    const { client, generateContent } = clientAnswering(
      responseWith(answering('{"brand":"Levi\'s","price":35}')),
    );

    await client.generateStructured(request);

    const { $schema: _, ...expectedSchema } = z.toJSONSchema(listingSchema);
    const sent = generateContent.mock.calls[0]?.[0];

    expect(sent?.config?.responseMimeType).toBe("application/json");
    expect(sent?.config?.responseJsonSchema).toEqual(expectedSchema);
    expect(sent?.config?.responseJsonSchema).not.toHaveProperty("$schema");
    expect(sent?.config?.tools).toEqual([{ googleSearch: {} }]);
    expect(sent?.config?.systemInstruction).toBe(request.system);
    expect(sent?.contents).toEqual([
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/webp", data: "AAAA" } },
          { inlineData: { mimeType: "image/webp", data: "BBBB" } },
          { text: request.prompt },
        ],
      },
    ]);
  });

  it("sends no tool when search is off", async () => {
    const { client, generateContent } = clientAnswering(
      responseWith(answering('{"brand":"Levi\'s","price":35}')),
    );

    await client.generateStructured({ ...request, search: false });

    expect(generateContent.mock.calls[0]?.[0].config?.tools).toBeUndefined();
  });

  it("fails with AI_INVALID_OUTPUT and the issue paths when the JSON breaks the schema", async () => {
    const { client } = clientAnswering(
      responseWith(answering('{"brand":12,"price":"cheap"}')),
    );

    const result = await client.generateStructured(request);

    expect(result.getError().code).toBe("AI_INVALID_OUTPUT");
    expect(result.getError().message).toContain("brand");
    expect(result.getError().message).toContain("price");
  });

  it("fails with AI_INVALID_OUTPUT when the text is not JSON", async () => {
    const { client } = clientAnswering(
      responseWith(answering("Sure! The jacket is worth 35 euros.")),
    );

    const result = await client.generateStructured(request);

    expect(result.getError().code).toBe("AI_INVALID_OUTPUT");
  });

  it("fails with AI_REJECTED and the finish reason when the model returns no text", async () => {
    const { client } = clientAnswering(
      responseWith({
        content: { role: "model", parts: [] },
        finishReason: FinishReason.SAFETY,
      }),
    );

    const result = await client.generateStructured(request);

    expect(result.getError().code).toBe("AI_REJECTED");
    expect(result.getError().message).toContain("SAFETY");
  });

  it.each<[number, AiFailureCode]>([
    [429, "AI_RATE_LIMITED"],
    [503, "AI_UNAVAILABLE"],
    [400, "AI_REJECTED"],
  ])("maps an API error %d to %s with its status", async (status, code) => {
    const client = clientFailingWith(
      new ApiError({ message: "quota", status }),
    );

    const result = await client.generateStructured(request);

    expect(result.getError().code).toBe(code);
    expect(result.getError().status.unwrap()).toBe(status);
  });

  it.each(["TimeoutError", "AbortError"])(
    "maps a %s to AI_TIMEOUT",
    async (name) => {
      const client = clientFailingWith(new DOMException("stopped", name));

      const result = await client.generateStructured(request);

      expect(result.getError().code).toBe("AI_TIMEOUT");
      expect(result.getError().status.isNone()).toBe(true);
    },
  );

  it("maps a network failure to AI_UNAVAILABLE", async () => {
    const client = clientFailingWith(new TypeError("fetch failed"));

    const result = await client.generateStructured(request);

    expect(result.getError().code).toBe("AI_UNAVAILABLE");
    expect(result.getError().status.isNone()).toBe(true);
  });
});
