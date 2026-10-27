export type LanguageCode =
  | "fr"
  | "en"
  | "de"
  | "es"
  | "it"
  | "nl"
  | "pt"
  | "pl"
  | "cs"
  | "sk"
  | "hu"
  | "ro"
  | "lt"
  | "hr";

export type VintedTld =
  | "fr"
  | "de"
  | "es"
  | "it"
  | "nl"
  | "be"
  | "at"
  | "pl"
  | "pt"
  | "cz"
  | "sk"
  | "hu"
  | "ro"
  | "lt"
  | "hr"
  | "co.uk"
  | "com";

interface VintedHost {
  tld: VintedTld;
  language: LanguageCode;
}

export const VINTED_HOSTS: readonly VintedHost[] = [
  { tld: "fr", language: "fr" },
  { tld: "de", language: "de" },
  { tld: "es", language: "es" },
  { tld: "it", language: "it" },
  { tld: "nl", language: "nl" },
  { tld: "be", language: "fr" },
  { tld: "at", language: "de" },
  { tld: "pl", language: "pl" },
  { tld: "pt", language: "pt" },
  { tld: "cz", language: "cs" },
  { tld: "sk", language: "sk" },
  { tld: "hu", language: "hu" },
  { tld: "ro", language: "ro" },
  { tld: "lt", language: "lt" },
  { tld: "hr", language: "hr" },
  { tld: "co.uk", language: "en" },
  { tld: "com", language: "en" },
];

const PROOF_HOST_PATTERN = "http://localhost/*";

export const hostPatterns = (mode: string): string[] => {
  const patterns = VINTED_HOSTS.map(({ tld }) => `https://*.vinted.${tld}/*`);

  return mode === "proof" ? [...patterns, PROOF_HOST_PATTERN] : patterns;
};

export const languageForHost = (hostname: string): LanguageCode | null => {
  const host = VINTED_HOSTS.find(({ tld }) => {
    const domain = `vinted.${tld}`;

    return hostname === domain || hostname.endsWith(`.${domain}`);
  });

  return host?.language ?? null;
};
