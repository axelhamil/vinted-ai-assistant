import type { Reply } from "@/lib/api/failure";
import type {
  ListingSuggestionDto,
  SuggestInput,
} from "@/lib/messaging/protocol";
import type { ListingField } from "@/lib/vinted/listing-form";
import { UNREADABLE_PHOTO_MESSAGE } from "./edit-queue";
import { buildSuggestionInput } from "./suggestion-input";

export interface SuggestDeps {
  language: () => string;
  downscale: (file: Blob) => Promise<string>;
  send: (input: SuggestInput) => Promise<Reply<ListingSuggestionDto>>;
}

export interface SuggestedListing {
  suggestion: ListingSuggestionDto;
  droppedCount: number;
  unreadableCount: number;
}

export async function suggestListing(
  sources: File[],
  { language, downscale, send }: SuggestDeps,
): Promise<Reply<SuggestedListing>> {
  const built = await buildSuggestionInput(sources, {
    language: language(),
    downscale,
  });
  if (!built.input)
    return {
      ok: false,
      failure: { kind: "local", message: UNREADABLE_PHOTO_MESSAGE },
    };

  const reply = await send(built.input);
  if (!reply.ok) return reply;

  return {
    ok: true,
    data: {
      suggestion: reply.data,
      droppedCount: built.droppedCount,
      unreadableCount: built.unreadableCount,
    },
  };
}

export function applySuggestion(
  suggestion: ListingSuggestionDto,
  fill: (field: ListingField, value: string | number) => boolean,
): ListingField[] {
  const values: [ListingField, string | number][] = [
    ["title", suggestion.title],
    ["description", suggestion.description],
    ["price", suggestion.price],
  ];

  return values.flatMap(([field, value]) =>
    fill(field, value) ? [] : [field],
  );
}
