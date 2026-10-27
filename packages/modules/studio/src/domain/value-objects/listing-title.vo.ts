import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const MAX_TITLE_LENGTH = 50;

const characterCount = (text: string): number => Array.from(text).length;

const listingTitleSchema = z
  .string()
  .trim()
  .min(1)
  .refine((title) => characterCount(title) <= MAX_TITLE_LENGTH);

function cutAtWordBoundary(text: string): string {
  const compact = text.trim().replace(/\s+/g, " ");
  const characters = Array.from(compact);
  if (characters.length <= MAX_TITLE_LENGTH) return compact;

  const head = characters.slice(0, MAX_TITLE_LENGTH + 1).join("");
  const lastSpace = head.lastIndexOf(" ");
  if (lastSpace > 0) return head.slice(0, lastSpace).trimEnd();

  return characters.slice(0, MAX_TITLE_LENGTH).join("");
}

export class ListingTitle extends ValueObject<string> {
  static fit(raw: string): Result<ListingTitle> {
    return ListingTitle.create(cutAtWordBoundary(raw));
  }

  protected validate(value: string): Result<string> {
    const result = listingTitleSchema.safeParse(value);
    if (!result.success)
      return Result.fail(
        `A listing title holds 1 to ${MAX_TITLE_LENGTH} characters`,
      );

    return Result.ok(result.data);
  }
}
