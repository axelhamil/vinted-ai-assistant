import type { Option } from "@packages/ddd-kit";
import type { LanguageValue } from "../../../domain/value-objects/language.vo";

export interface Prompt {
  system: string;
  prompt: string;
}

const LANGUAGE_NAMES: Record<LanguageValue, string> = {
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

export function languageName(language: LanguageValue): string {
  return LANGUAGE_NAMES[language];
}

export function euros(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export function orUnknown(value: Option<string>): string {
  return value.unwrapOr("not specified");
}
