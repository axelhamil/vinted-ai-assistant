import { describe, expect, it } from "vitest";
import { parsePrice } from "./price";

describe("parsePrice", () => {
  it.each([
    ["12,50 €", 12.5],
    ["1 234,50 €", 1234.5],
    ["1 234,50 €", 1234.5],
    ["1.234,50 €", 1234.5],
    ["£1,234.50", 1234.5],
    ["12.5", 12.5],
    ["45 €", 45],
    ["Livraison à partir de 2,88 €", 2.88],
  ])("reads %s as %d", (text, expected) => {
    expect(parsePrice(text)).toBe(expected);
  });

  it.each(["gratuit", "", "€"])("reads %s as no price", (text) => {
    expect(parsePrice(text)).toBeNull();
  });
});
