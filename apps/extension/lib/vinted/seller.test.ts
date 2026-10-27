import { afterEach, describe, expect, it, vi } from "vitest";
import { analysisDto, analyzeInput } from "@/lib/__fixtures__/analysis";
import type { Reply } from "@/lib/api/failure";
import type { AnalysisDto } from "@/lib/messaging/protocol";
import { loadPage } from "./__fixtures__/load";
import {
  completeSeller,
  fetchSellerProfile,
  loadAnalysis,
  needsSellerCheck,
  readSellerProfilePath,
} from "./seller";

const PROFILE = `<html><body>
  <div data-testid="user-rating" content="4.6"></div>
  <div data-testid="seller-sales-count">87 ventes</div>
</body></html>`;

const NOTHING = { rating: null, salesCount: null };

const respond = (body: string, status = 200): typeof fetch =>
  vi.fn<typeof fetch>(async () => new Response(body, { status }));

describe("fetchSellerProfile", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the rating and sales from the profile page", async () => {
    const fetchImpl = respond(PROFILE);

    const profile = await fetchSellerProfile({
      host: "www.vinted.fr",
      profilePath: "/member/1000001-fixture_seller",
      fetchImpl,
    });

    expect(profile).toEqual({ rating: 4.6, salesCount: 87 });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://www.vinted.fr/member/1000001-fixture_seller",
      expect.anything(),
    );
  });

  it("gives up after 3 seconds", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const pending = fetchSellerProfile({
      host: "www.vinted.fr",
      profilePath: "/member/1000001-fixture_seller",
      fetchImpl,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toEqual(NOTHING);
  });

  it("reads nothing from a failed response", async () => {
    await expect(
      fetchSellerProfile({
        host: "www.vinted.fr",
        profilePath: "/member/1000001-fixture_seller",
        fetchImpl: respond(PROFILE, 503),
      }),
    ).resolves.toEqual(NOTHING);
  });

  it.each(["evil.example.com", "evil.com/.vinted.fr"])(
    "refuses the host %s",
    async (host) => {
      const fetchImpl = respond(PROFILE);

      await expect(
        fetchSellerProfile({
          host,
          profilePath: "/member/1000001-fixture_seller",
          fetchImpl,
        }),
      ).resolves.toEqual(NOTHING);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("drops a rating outside the api range", async () => {
    await expect(
      fetchSellerProfile({
        host: "www.vinted.fr",
        profilePath: "/member/1000001-fixture_seller",
        fetchImpl: respond('<div data-testid="user-rating">9,5</div>'),
      }),
    ).resolves.toEqual(NOTHING);
  });
});

describe("readSellerProfilePath", () => {
  it("reads the seller profile link of the page", () => {
    expect(readSellerProfilePath(loadPage("item"))).toBe(
      "/member/1000001-fixture_seller",
    );
  });

  it("refuses a link that leaves the member pages", async () => {
    const doc = new DOMParser().parseFromString(
      '<a href="https://evil.example.com/member/../admin">x</a>',
      "text/html",
    );
    const fetchImpl = respond(PROFILE);

    expect(readSellerProfilePath(doc)).toBeNull();
    await expect(
      fetchSellerProfile({
        host: "www.vinted.fr",
        profilePath: "//evil.example.com/member/x",
        fetchImpl,
      }),
    ).resolves.toEqual(NOTHING);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

const LISTING = {
  ...analyzeInput,
  seller: { username: "alice", rating: null, salesCount: null },
};

const NOT_FOUND: Reply<AnalysisDto> = {
  ok: false,
  failure: {
    kind: "api",
    code: "ANALYSIS_NOT_FOUND",
    message: "No analysis",
    requestId: "r1",
  },
};

const NOW = Date.parse("2026-10-27T10:30:00.000Z");

function analysisFlow(stored: Reply<AnalysisDto>) {
  const fetchImpl = respond(PROFILE);
  const send = {
    getAnalysis: vi.fn(async () => stored),
    analyze: vi.fn(
      async (): Promise<Reply<AnalysisDto>> => ({
        ok: true,
        data: analysisDto({ analyzedAt: new Date(NOW).toISOString() }),
      }),
    ),
  };
  const load = (forceRefresh = false) =>
    loadAnalysis({
      listing: { ...LISTING, forceRefresh },
      seller: () =>
        completeSeller({
          listing: LISTING,
          profilePath: "/member/1000001-fixture_seller",
          fetchImpl,
        }),
      send,
      now: NOW,
    });

  return { fetchImpl, send, load };
}

describe("loadAnalysis", () => {
  it("shows a fresh stored analysis without visiting the seller profile", async () => {
    const stored = analysisDto();
    const { fetchImpl, send, load } = analysisFlow({ ok: true, data: stored });

    await expect(load()).resolves.toEqual({ ok: true, data: stored });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(send.analyze).not.toHaveBeenCalled();
  });

  it("completes the seller from the profile before a first analysis", async () => {
    const { send, load } = analysisFlow(NOT_FOUND);

    const reply = await load();

    expect(reply.ok).toBe(true);
    expect(send.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        seller: { username: "alice", rating: 4.6, salesCount: 87 },
      }),
    );
  });

  it("analyzes again once the stored analysis is older than an hour", async () => {
    const stale = analysisDto({ analyzedAt: "2026-10-27T09:29:59.000Z" });
    const { send, load } = analysisFlow({ ok: true, data: stale });

    await load();

    expect(send.analyze).toHaveBeenCalledTimes(1);
  });

  it("reports a failure of the lookup without analyzing", async () => {
    const down: Reply<AnalysisDto> = {
      ok: false,
      failure: { kind: "network", message: "Le serveur est injoignable." },
    };
    const { fetchImpl, send, load } = analysisFlow(down);

    await expect(load()).resolves.toEqual(down);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(send.analyze).not.toHaveBeenCalled();
  });

  it("skips the stored analysis when a new analysis is asked", async () => {
    const { send, load } = analysisFlow({ ok: true, data: analysisDto() });

    await load(true);

    expect(send.getAnalysis).not.toHaveBeenCalled();
    expect(send.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ forceRefresh: true }),
    );
  });
});

describe("needsSellerCheck", () => {
  it.each([
    { rating: 4.8, salesCount: 40, check: false },
    { rating: 3.9, salesCount: 40, check: true },
    { rating: 4.8, salesCount: 2, check: true },
    { rating: null, salesCount: 40, check: true },
    { rating: 4.8, salesCount: null, check: true },
  ])(
    "asks to check a seller rated $rating with $salesCount sales: $check",
    ({ rating, salesCount, check }) => {
      expect(needsSellerCheck({ username: "alice", rating, salesCount })).toBe(
        check,
      );
    },
  );
});
