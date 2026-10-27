import { describe, expect, it } from "vitest";
import { hostPatterns, languageForHost, VINTED_HOSTS } from "./hosts";

describe("Vinted hosts", () => {
  it("covers the 17 Vinted country sites", () => {
    expect(VINTED_HOSTS).toHaveLength(17);
  });

  it.each([
    ["www.vinted.be", "fr"],
    ["www.vinted.at", "de"],
    ["www.vinted.co.uk", "en"],
    ["www.vinted.com", "en"],
    ["www.vinted.cz", "cs"],
  ])("reads %s in %s", (hostname, language) => {
    expect(languageForHost(hostname)).toBe(language);
  });

  it.each(["evil-vinted.fr.example.com", "www.vinted.xx"])(
    "does not recognise %s",
    (hostname) => {
      expect(languageForHost(hostname)).toBeNull();
    },
  );

  it("grants only the Vinted hosts in production", () => {
    const patterns = hostPatterns("production");

    expect(patterns).toHaveLength(17);
    expect(patterns).toContain("https://*.vinted.co.uk/*");
    expect(patterns.some((pattern) => pattern.includes("localhost"))).toBe(
      false,
    );
  });

  it("adds localhost for the proof build", () => {
    expect(hostPatterns("proof")).toHaveLength(18);
    expect(hostPatterns("proof")).toContain("http://localhost/*");
  });
});
