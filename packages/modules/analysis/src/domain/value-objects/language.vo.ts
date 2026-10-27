import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

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

export type LanguageValue = (typeof LANGUAGES)[number];

const languageSchema = z.enum(LANGUAGES);

export class Language extends ValueObject<LanguageValue> {
  static parse(raw: string): Result<Language> {
    const result = languageSchema.safeParse(raw);
    if (!result.success)
      return Result.fail(`Supported languages are ${LANGUAGES.join(", ")}`);

    return Result.ok(new Language(result.data));
  }

  protected validate(value: LanguageValue): Result<LanguageValue> {
    const result = languageSchema.safeParse(value);
    if (!result.success)
      return Result.fail(`Supported languages are ${LANGUAGES.join(", ")}`);

    return Result.ok(result.data);
  }
}
