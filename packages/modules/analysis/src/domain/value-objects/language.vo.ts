import { LANGUAGES, type LanguageCode } from "@packages/ai/languages";
import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export type LanguageValue = LanguageCode;

const languageSchema = z.enum(LANGUAGES);

export class Language extends ValueObject<LanguageValue> {
  static parse(raw: string): Result<Language> {
    const result = languageSchema.safeParse(raw);
    if (!result.success)
      return Result.fail(`Supported languages are ${LANGUAGES.join(", ")}`);

    return Language.create(result.data);
  }

  protected validate(value: LanguageValue): Result<LanguageValue> {
    const result = languageSchema.safeParse(value);
    if (!result.success)
      return Result.fail(`Supported languages are ${LANGUAGES.join(", ")}`);

    return Result.ok(result.data);
  }
}
