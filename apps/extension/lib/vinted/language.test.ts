import { describe, expect, it } from "vitest";
import { detectLanguage } from "./language";

describe("detectLanguage", () => {
  it("trusts the Vinted host first", () => {
    expect(
      detectLanguage({
        hostname: "www.vinted.de",
        htmlLang: "en-GB",
        browserLang: "es-ES",
      }),
    ).toBe("de");
  });

  it("falls back to the page language on an unknown host", () => {
    expect(
      detectLanguage({
        hostname: "localhost",
        htmlLang: "en-GB",
        browserLang: "de-DE",
      }),
    ).toBe("en");
  });

  it("falls back to the browser language when the page has none", () => {
    expect(
      detectLanguage({
        hostname: "localhost",
        htmlLang: "",
        browserLang: "de-DE",
      }),
    ).toBe("de");
  });

  it("falls back to French when no language is supported", () => {
    expect(
      detectLanguage({
        hostname: "localhost",
        htmlLang: "ja",
        browserLang: "ja-JP",
      }),
    ).toBe("fr");
  });
});
