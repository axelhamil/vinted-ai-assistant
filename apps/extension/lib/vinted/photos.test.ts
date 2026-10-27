import { describe, expect, it } from "vitest";
import { loadPage } from "./__fixtures__/load";
import { readPhotos } from "./photos";

describe("readPhotos", () => {
  it("reads inline scripts, then structured data, then thumbnails", () => {
    expect(readPhotos(loadPage("item"), "123456")).toEqual([
      "https://images1.vinted.net/t/01_fixture_a/f800/1700000001.jpeg?s=sigA",
      "https://images1.vinted.net/t/01_fixture_b/f800/1700000002.jpeg?s=sigB",
      "https://images1.vinted.net/t/01_fixture_c/f800/1700000003.jpeg?s=sigC",
      "https://images1.vinted.net/t/01_fixture_d/f800/1700000004.jpeg?s=sigD",
    ]);
  });

  it("keeps only https photos and skips avatars", () => {
    const photos = readPhotos(loadPage("item"), "123456");

    expect(photos.every((url) => url.startsWith("https://"))).toBe(true);
    expect(photos.some((url) => url.includes("avatar"))).toBe(false);
  });

  it("reads the high resolution key of inline scripts", () => {
    const doc = loadPage("minimal");
    const script = doc.createElement("script");
    script.textContent =
      '{"id":654321,"high_resolution.url":"https://images1.vinted.net/t/02_minimal_b/f800/1700000102.jpeg"}';
    doc.body.append(script);

    expect(readPhotos(doc, "654321")).toContain(
      "https://images1.vinted.net/t/02_minimal_b/f800/1700000102.jpeg",
    );
  });

  it("ignores a gallery image that is not a Vinted photo", () => {
    const doc = loadPage("minimal");
    const tracker = doc.createElement("img");
    tracker.setAttribute("src", "https://tracker.example.com/pixel?id=1");
    doc.querySelector(".item-photos")?.append(tracker);

    expect(readPhotos(doc, "654321")).toEqual([
      "https://images1.vinted.net/t/02_minimal_a/f800/1700000101.jpeg?s=sigM",
    ]);
  });

  it("ignores the inline scripts of another item left by a previous page", () => {
    const doc = loadPage("minimal");
    const script = doc.createElement("script");
    script.textContent =
      'self.__next_f.push([1,"{\\"item\\":{\\"id\\":6543210,\\"photos\\":[{\\"full_size_url\\":\\"https://images1.vinted.net/t/99_previous/f800/1700000999.jpeg\\"}]}}"])';
    doc.body.append(script);

    expect(readPhotos(doc, "654321")).toEqual([
      "https://images1.vinted.net/t/02_minimal_a/f800/1700000101.jpeg?s=sigM",
    ]);
  });

  it("falls back to the gallery images", () => {
    expect(readPhotos(loadPage("minimal"), "654321")).toEqual([
      "https://images1.vinted.net/t/02_minimal_a/f800/1700000101.jpeg?s=sigM",
    ]);
  });
});
