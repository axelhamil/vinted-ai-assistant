import { describe, expect, it } from "vitest";
import { loadPage } from "@/lib/vinted/__fixtures__/load";
import { createListingReader } from "./listing-reader";

const FIRST = new URL("https://www.vinted.fr/items/123456-fixture");

const NEXT = new URL("https://www.vinted.fr/items/777777-next");

const setText = (doc: Document, selector: string, text: string): void => {
  const element = doc.querySelector(selector);
  if (element) element.textContent = text;
};

describe("createListingReader", () => {
  it("waits while the page still shows the previous item", () => {
    const read = createListingReader({ doc: loadPage("item") });
    read(FIRST, false);

    expect(read(NEXT, false)).toBeNull();
  });

  it("never sends the previous item once the retries are spent", () => {
    const read = createListingReader({ doc: loadPage("item") });
    read(FIRST, false);

    expect(read(NEXT, true)).toEqual({
      vintedId: "777777",
      page: { kind: "stale" },
    });
  });

  it("reads a next item that only shares the title of the previous one", () => {
    const doc = loadPage("item");
    const read = createListingReader({ doc });
    read(FIRST, false);
    setText(doc, '[data-testid="item-price"]', "19,00 €");
    setText(doc, '[data-testid="item-description"]', "Autre veste");

    expect(read(NEXT, false)).toMatchObject({
      vintedId: "777777",
      page: {
        kind: "ready",
        listing: { vintedId: "777777", price: 19, forceRefresh: false },
        sellerProfilePath: "/member/1000001-fixture_seller",
      },
    });
  });
});
