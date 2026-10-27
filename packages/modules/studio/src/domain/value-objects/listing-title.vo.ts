import { Result, ValueObject } from "@packages/ddd-kit";
import { z } from "zod";

export const MAX_TITLE_LENGTH = 50;

const listingTitleSchema = z.string().trim().min(1).max(MAX_TITLE_LENGTH);

function cutAtWordBoundary(text: string): string {
  const compact = text.trim().replace(/\s+/g, " ");
  if (compact.length <= MAX_TITLE_LENGTH) return compact;

  const head = compact.slice(0, MAX_TITLE_LENGTH + 1);
  const lastSpace = head.lastIndexOf(" ");
  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head.slice(0, -1);

  return cut.trimEnd();
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
