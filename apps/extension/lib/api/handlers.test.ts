import { ANALYSIS_FRESH_FOR_MS } from "@packages/analysis/contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { analysisCache } from "@/lib/cache/analysis-cache";
import type { AnalysisDto, AnalyzeInput } from "@/lib/messaging/protocol";
import { dailyCount } from "@/lib/storage/daily-count";
import { DEFAULT_SETTINGS, settings } from "@/lib/storage/settings";
import { createApiClient } from "./client";
import { createHandlers } from "./handlers";

const VINTED_ID = "123";

function analysisDto(overrides: Partial<AnalysisDto> = {}): AnalysisDto {
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

const analyzeInput: AnalyzeInput = {
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

type Route = () => Response;

function fakeApi(routes: Record<string, Route>) {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const route = `${request.method} ${new URL(request.url).pathname}`;
    calls.push(route);

    return (
      routes[route]?.() ??
      Response.json(
        {
          error: {
            code: "ROUTE_NOT_FOUND",
            message: `No route for ${route}`,
            requestId: "req-404",
          },
        },
        { status: 404 },
      )
    );
  };

  const handlers = createHandlers({
    client: (baseUrl) => createApiClient(baseUrl, fetchImpl),
    cache: analysisCache,
    settings,
    counter: dailyCount,
  });

  return { calls, handlers };
}

const ANALYZE = "POST /api/analyses";

function analyzingApi() {
  return fakeApi({
    [ANALYZE]: () => Response.json(analysisDto(), { status: 201 }),
  });
}

describe("background handlers", () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 27, 10));
    await analysisCache.remove(VINTED_ID);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("analyze", () => {
    it("answers from the cache inside the freshness window", async () => {
      const api = analyzingApi();
      await api.handlers.analyze(analyzeInput);

      vi.setSystemTime(Date.now() + ANALYSIS_FRESH_FOR_MS - 1);
      const reply = await api.handlers.analyze(analyzeInput);

      expect(reply).toEqual({ ok: true, data: analysisDto() });
      expect(api.calls).toEqual([ANALYZE]);
    });

    it("asks the api again once the cached analysis is stale", async () => {
      const api = analyzingApi();
      await api.handlers.analyze(analyzeInput);

      vi.setSystemTime(Date.now() + ANALYSIS_FRESH_FOR_MS + 1);
      await api.handlers.analyze(analyzeInput);

      expect(api.calls).toEqual([ANALYZE, ANALYZE]);
    });

    it("asks the api and replaces the cache on a forced refresh", async () => {
      await analysisCache.put(analysisDto({ title: "Old" }));
      const api = analyzingApi();

      const reply = await api.handlers.analyze({
        ...analyzeInput,
        forceRefresh: true,
      });

      expect(reply).toEqual({ ok: true, data: analysisDto() });
      expect(api.calls).toEqual([ANALYZE]);
      expect(await analysisCache.get(VINTED_ID)).toEqual(analysisDto());
    });

    it("counts each analysis made by the api today", async () => {
      const api = analyzingApi();

      await api.handlers.analyze(analyzeInput);
      await api.handlers.analyze(analyzeInput);

      expect(await dailyCount.current()).toBe(1);
    });

    it("neither caches nor counts a failed analysis", async () => {
      const api = fakeApi({});

      const reply = await api.handlers.analyze(analyzeInput);

      expect(reply).toMatchObject({
        ok: false,
        failure: { kind: "api", code: "ROUTE_NOT_FOUND" },
      });
      expect(await analysisCache.get(VINTED_ID)).toBeNull();
      expect(await dailyCount.current()).toBe(0);
    });
  });

  it("writes the analysis returned by a status change through the cache", async () => {
    await analysisCache.put(analysisDto());
    const api = fakeApi({
      [`PATCH /api/analyses/${VINTED_ID}/status`]: () =>
        Response.json(analysisDto({ status: "WATCHING" })),
    });

    await api.handlers.changeStatus({
      vintedId: VINTED_ID,
      status: "WATCHING",
    });

    expect(await analysisCache.get(VINTED_ID)).toMatchObject({
      status: "WATCHING",
    });
  });

  it("writes the analysis returned by a new negotiation through the cache", async () => {
    await analysisCache.put(analysisDto());
    const negotiated = analysisDto({
      negotiation: {
        suggestedOffer: 18,
        script: "Prix ferme ?",
        arguments: [],
        tone: "direct",
      },
    });
    const api = fakeApi({
      [`POST /api/analyses/${VINTED_ID}/negotiation`]: () =>
        Response.json(negotiated),
    });

    await api.handlers.regenerateNegotiation({
      vintedId: VINTED_ID,
      tone: "direct",
    });

    expect(await analysisCache.get(VINTED_ID)).toEqual(negotiated);
  });

  it("forgets the cached analysis once deleted", async () => {
    await analysisCache.put(analysisDto());
    const api = fakeApi({
      [`DELETE /api/portfolio/${VINTED_ID}`]: () =>
        new Response(null, { status: 204 }),
    });

    const reply = await api.handlers.deleteAnalysis(VINTED_ID);

    expect(reply).toEqual({ ok: true, data: null });
    expect(await analysisCache.get(VINTED_ID)).toBeNull();
  });

  it("reads the export filename from the response", async () => {
    const api = fakeApi({
      [`GET /api/analyses/${VINTED_ID}/export`]: () =>
        new Response("# Veste", {
          headers: {
            "Content-Disposition": 'attachment; filename="veste-levis.md"',
          },
        }),
    });

    const reply = await api.handlers.exportAnalysis(VINTED_ID);

    expect(reply).toEqual({
      ok: true,
      data: { filename: "veste-levis.md", markdown: "# Veste" },
    });
  });

  describe("when the extension is disabled", () => {
    beforeEach(async () => {
      await settings.setValue({ ...DEFAULT_SETTINGS, enabled: false });
    });

    it("refuses analyses and the portfolio without calling the api", async () => {
      const api = fakeApi({});

      const replies = [
        await api.handlers.analyze(analyzeInput),
        await api.handlers.listPortfolio({}),
      ];

      expect(replies).toEqual([
        { ok: false, failure: { kind: "disabled" } },
        { ok: false, failure: { kind: "disabled" } },
      ]);
      expect(api.calls).toEqual([]);
    });

    it("keeps the studio and the backend check available", async () => {
      const api = fakeApi({
        "GET /api/studio/presets": () => Response.json({ presets: [] }),
        "POST /api/studio/edits": () =>
          Response.json({ mimeType: "image/png", imageBase64: "AAAA" }),
        "GET /health/live": () => Response.json({ status: "ok" }),
      });

      const replies = [
        await api.handlers.listPresets(undefined),
        await api.handlers.editPhoto({ image: "data:", presetId: "white" }),
        await api.handlers.checkBackend(undefined),
      ];

      expect(replies.map((reply) => reply.ok)).toEqual([true, true, true]);
    });
  });

  it("reports an unreachable server", async () => {
    const handlers = createHandlers({
      client: (baseUrl) =>
        createApiClient(baseUrl, async () => {
          throw new TypeError("Failed to fetch");
        }),
      cache: analysisCache,
      settings,
      counter: dailyCount,
    });

    const reply = await handlers.checkBackend(undefined);

    expect(reply).toMatchObject({ ok: false, failure: { kind: "network" } });
  });
});
