import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPage } from "./__fixtures__/load";
import { fetchSellerProfile, readSellerProfilePath } from "./seller";

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
