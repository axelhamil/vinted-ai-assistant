import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPage } from "./__fixtures__/load";
import { parseArticle } from "./article";

const ITEM_URL = new URL(
  "https://www.vinted.fr/items/123456-fixture?referrer=catalog",
);

const MINIMAL_URL = new URL("https://www.vinted.fr/items/654321-minimal");

const remove = (doc: Document, selector: string): Document => {
  for (const element of doc.querySelectorAll(selector)) element.remove();

  return doc;
};

describe("parseArticle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads a full listing into the analysis body", () => {
    const article = parseArticle(loadPage("item"), ITEM_URL);

    expect(article).toMatchObject({
      vintedId: "123456",
      url: "https://www.vinted.fr/items/123456-fixture",
      title: "Veste en jean Levi's",
      description:
        "Veste en jean Levi's Trucker, portée quelques fois. Aucun défaut.",
      price: 45,
      totalPrice: 47.95,
      shippingCost: 2.88,
      brand: "Levi's",
      size: "M / 38 / 10",
      condition: "Très bon état",
      listedAt: "2026-10-20T07:15:00.000Z",
      seller: { username: "fixture_seller", rating: 4.8, salesCount: 132 },
      language: "fr",
    });
    expect(article?.photos.length).toBeGreaterThanOrEqual(3);
  });

  it("reads a bare listing into nulls the api accepts", () => {
    const article = parseArticle(loadPage("minimal"), MINIMAL_URL);

    expect(article).toMatchObject({
      vintedId: "654321",
      title: "T-shirt blanc",
      description: "",
      price: 8,
      totalPrice: null,
      shippingCost: null,
      brand: null,
      size: null,
      condition: "Bon état",
      listedAt: null,
      seller: { username: "minimal_seller", rating: null, salesCount: null },
    });
    expect(article?.photos).toHaveLength(1);
    expect(JSON.stringify(article)).not.toContain("NaN");
  });

  it("dates a listing from its relative age without structured data", () => {
    vi.useFakeTimers({ now: new Date("2026-10-27T12:00:00.000Z") });
    const doc = remove(loadPage("item"), 'script[type="application/ld+json"]');

    expect(parseArticle(doc, ITEM_URL)?.listedAt).toBe(
      "2026-10-20T12:00:00.000Z",
    );
  });

  it("falls back to the structured price when the page shows zero", () => {
    const doc = loadPage("item");
    const price = doc.querySelector('[data-testid="item-price"]');
    if (price) price.textContent = "0,00 €";

    expect(parseArticle(doc, ITEM_URL)?.price).toBe(45);
  });

  it("dates a listing from the page when the structured date is invalid", () => {
    vi.useFakeTimers({ now: new Date("2026-10-27T12:00:00.000Z") });
    const doc = loadPage("item");
    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      jsonLd.textContent = (jsonLd.textContent ?? "").replace(
        "2026-10-20T09:15:00+02:00",
        "not a date",
      );
    }

    expect(parseArticle(doc, ITEM_URL)?.listedAt).toBe(
      "2026-10-20T12:00:00.000Z",
    );
  });

  it("uses the page host language", () => {
    const article = parseArticle(
      loadPage("minimal"),
      new URL("https://www.vinted.de/items/654321-minimal"),
    );

    expect(article?.language).toBe("de");
  });

  it.each([
    ["title", '[data-testid="item-title"], h1'],
    ["price", '[data-testid="item-price"], script'],
  ])("gives up on a page without a %s", (_field, selector) => {
    expect(
      parseArticle(remove(loadPage("minimal"), selector), MINIMAL_URL),
    ).toBeNull();
  });

  it("gives up on a free listing the api would refuse", () => {
    const doc = loadPage("minimal");
    const price = doc.querySelector('[data-testid="item-price"]');
    if (price) price.textContent = "0,00 €";

    expect(parseArticle(doc, MINIMAL_URL)).toBeNull();
  });

  it("gives up outside a listing url", () => {
    expect(
      parseArticle(loadPage("minimal"), new URL("https://www.vinted.fr/")),
    ).toBeNull();
  });
});
