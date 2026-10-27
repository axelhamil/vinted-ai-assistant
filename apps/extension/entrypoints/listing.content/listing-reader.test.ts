import { describe, expect, it } from "vitest";
import { loadPage } from "@/lib/vinted/__fixtures__/load";
import { createListingReader } from "./listing-reader";

const FIRST = new URL("https://www.vinted.fr/items/123456-fixture");

const NEXT = new URL("https://www.vinted.fr/items/777777-next");

describe("createListingReader", () => {
  it("waits while the page still shows the previous item", () => {
    const read = createListingReader({ doc: loadPage("item"), autoOpen: true });
    read(FIRST, false);

    expect(read(NEXT, false)).toBeNull();
  });

  it("mounts with what the page shows once the retries are spent", () => {
    const read = createListingReader({ doc: loadPage("item"), autoOpen: true });
    read(FIRST, false);

    expect(read(NEXT, true)).toMatchObject({
      vintedId: "777777",
      listing: { vintedId: "777777", forceRefresh: false },
      sellerProfilePath: "/member/1000001-fixture_seller",
      autoOpen: true,
    });
  });
});
