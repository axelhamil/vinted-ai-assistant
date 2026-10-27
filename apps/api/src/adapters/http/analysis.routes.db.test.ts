import { beforeEach, describe, expect, it } from "bun:test";
import type { IListingFactsReader } from "@packages/analysis/application/ports/listing-facts-reader.port";
import type { INegotiationWriter } from "@packages/analysis/application/ports/negotiation-writer.port";
import {
  buildFacts,
  buildNegotiation,
} from "@packages/analysis/testing/analysis.factory";
import {
  clearAnalyses,
  overwriteFacts,
} from "@packages/analysis/testing/database";
import { Result } from "@packages/ddd-kit";
import { db } from "@packages/testing/clone-database";
import { mockPort } from "@packages/testing/port-mock";
import { parseEnv } from "../../../common/env";
import { createApi } from "../../composition/app";
import { createContainer } from "../../composition/container";

const VINTED_ID = "4815162342";

const listingBody = {
  vintedId: VINTED_ID,
  url: `https://www.vinted.fr/items/${VINTED_ID}-veste-en-jean`,
  title: "Veste en jean Levi's",
  description: "Portée deux fois, très bon état.",
  price: 20,
  totalPrice: null,
  shippingCost: null,
  brand: "Levi's",
  size: "M",
  condition: "Très bon état",
  photos: ["https://images1.vinted.net/t/01_abc/f800/1.jpeg"],
  listedAt: null,
  seller: { username: "marie_vintage", rating: 4.8, salesCount: 132 },
  language: "fr",
};

function givenApi() {
  const env = parseEnv({
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    GEMINI_API_KEY: "unused-in-tests",
  }).getValue();
  const factsReader = mockPort<IListingFactsReader>();
  factsReader.read.mockResolvedValue(
    Result.ok({
      facts: buildFacts({ authenticityScore: 7 }),
      groundingSources: [],
    }),
  );
  const negotiationWriter = mockPort<INegotiationWriter>();
  negotiationWriter.write.mockResolvedValue(Result.ok(buildNegotiation()));

  const container = createContainer(env)
    .override("db", () => db)
    .override("IListingFactsReader", () => factsReader)
    .override("INegotiationWriter", () => negotiationWriter)
    .build();

  return { api: createApi(container), factsReader };
}

function send(method: string, path: string, body?: unknown) {
  return givenApi().api.request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(clearAnalyses);

describe("the analysis routes on the real database", () => {
  it("answers the score and margin computed by the domain, in euros, then reads them back", async () => {
    const created = await send("POST", "/api/analyses", listingBody);
    const read = await send("GET", `/api/analyses/${VINTED_ID}`);

    expect(created.status).toBe(201);
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({
      vintedId: VINTED_ID,
      price: 20,
      status: "ANALYZED",
      opportunity: { score: 7.8, margin: 10, marginPercent: 50 },
      negotiation: { suggestedOffer: 18, tone: "friendly" },
      resale: { recommendedPrice: 32 },
    });
  });

  it("answers 409 ANALYSIS_STATUS_CONFLICT for a move the status does not allow", async () => {
    await send("POST", "/api/analyses", listingBody);

    const response = await send("PATCH", `/api/analyses/${VINTED_ID}/status`, {
      status: "SOLD",
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "ANALYSIS_STATUS_CONFLICT",
        message: expect.stringContaining("status"),
        requestId: expect.any(String),
      },
    });
  });

  it("answers 404 ANALYSIS_NOT_FOUND for a listing never analysed", async () => {
    const response = await send("GET", "/api/analyses/999");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "ANALYSIS_NOT_FOUND",
        message: expect.stringContaining("Analyze the listing"),
        requestId: expect.any(String),
      },
    });
  });

  it("answers 400 ANALYSIS_INPUT_INVALID for a listing without photos", async () => {
    const response = await send("POST", "/api/analyses", {
      ...listingBody,
      photos: [],
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "ANALYSIS_INPUT_INVALID" },
    });
  });

  it("exports the analysis as a markdown attachment", async () => {
    await send("POST", "/api/analyses", listingBody);

    const response = await send("GET", `/api/analyses/${VINTED_ID}/export`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename=".+\.md"$/,
    );
    expect(await response.text()).toContain("# Veste en jean Levi's");
  });

  it.each([
    ["a price above 10 000 000 euros", { price: 30_000_000 }],
    ["a listing url outside Vinted", { url: "javascript:alert(1)" }],
    ["a listing url over http", { url: "http://www.vinted.fr/items/1" }],
  ])(
    "answers 400 ANALYSIS_INPUT_INVALID for %s before calling the model",
    async (_, change) => {
      const { api, factsReader } = givenApi();

      const response = await api.request("/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...listingBody, ...change }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "ANALYSIS_INPUT_INVALID" },
      });
      expect(factsReader.read).not.toHaveBeenCalled();
    },
  );

  it("answers 413 REQUEST_TOO_LARGE for a body over 1 MB before calling the model", async () => {
    const { api, factsReader } = givenApi();

    const response = await api.request("/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...listingBody,
        description: "a".repeat(1024 * 1024),
      }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: {
        code: "REQUEST_TOO_LARGE",
        message:
          "The request body exceeds 1 MB. Send a smaller request body and retry.",
      },
    });
    expect(factsReader.read).not.toHaveBeenCalled();
  });

  it("treats a blank portfolio limit as unset", async () => {
    await send("POST", "/api/analyses", listingBody);

    const response = await send("GET", "/api/portfolio?limit=&minScore=");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: 1, hasMore: false });
  });

  it("answers 204 when deleting an analysis whose stored row no longer reads", async () => {
    await send("POST", "/api/analyses", listingBody);
    await overwriteFacts(VINTED_ID, { photoQuality: "unreadable" });

    const deleted = await send("DELETE", `/api/portfolio/${VINTED_ID}`);
    const read = await send("GET", `/api/analyses/${VINTED_ID}`);

    expect(deleted.status).toBe(204);
    expect(read.status).toBe(404);
  });
});
