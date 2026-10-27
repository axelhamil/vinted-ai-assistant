export const LANGUAGES = [
  "fr",
  "en",
  "de",
  "es",
  "it",
  "nl",
  "pt",
  "pl",
  "cs",
  "sk",
  "hu",
  "ro",
  "lt",
  "hr",
] as const;

export type LanguageCode = (typeof LANGUAGES)[number];

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  fr: "French",
  en: "English",
  de: "German",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  pl: "Polish",
  cs: "Czech",
  sk: "Slovak",
  hu: "Hungarian",
  ro: "Romanian",
  lt: "Lithuanian",
  hr: "Croatian",
};

export function languageName(code: LanguageCode): string {
  return LANGUAGE_NAMES[code];
}
