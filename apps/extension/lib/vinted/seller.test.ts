import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSellerProfile } from "./seller";

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
      username: "fixture_seller",
      fetchImpl,
    });

    expect(profile).toEqual({ rating: 4.6, salesCount: 87 });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://www.vinted.fr/member/fixture_seller",
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
      username: "fixture_seller",
      fetchImpl,
    });
    await vi.advanceTimersByTimeAsync(3000);

    await expect(pending).resolves.toEqual(NOTHING);
  });

  it("reads nothing from a failed response", async () => {
    await expect(
      fetchSellerProfile({
        host: "www.vinted.fr",
        username: "fixture_seller",
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
          username: "fixture_seller",
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
        username: "fixture_seller",
        fetchImpl: respond('<div data-testid="user-rating">9,5</div>'),
      }),
    ).resolves.toEqual(NOTHING);
  });
});
