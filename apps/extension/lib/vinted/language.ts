import type { LanguageCode } from "@packages/ai/languages";
import { languageForHost, VINTED_HOSTS } from "./hosts";

const DEFAULT_LANGUAGE: LanguageCode = "fr";

interface LanguageInput {
  hostname: string;
  htmlLang: string;
  browserLang: string;
}

const supportedLanguage = (tag: string): LanguageCode | null => {
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];

  return (
    VINTED_HOSTS.find(({ language }) => language === primary)?.language ?? null
  );
};

export const detectLanguage = ({
  hostname,
  htmlLang,
  browserLang,
}: LanguageInput): LanguageCode =>
  languageForHost(hostname) ??
  supportedLanguage(htmlLang) ??
  supportedLanguage(browserLang) ??
  DEFAULT_LANGUAGE;
