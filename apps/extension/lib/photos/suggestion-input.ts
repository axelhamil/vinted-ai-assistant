import type { SuggestInput } from "@/lib/messaging/protocol";

export const MAX_SUGGESTION_PHOTOS = 10;

interface SuggestionInputOptions {
  language: string;
  existingTitle?: string;
  downscale: (file: Blob) => Promise<string>;
}

export interface BuiltSuggestionInput {
  input: SuggestInput | null;
  droppedCount: number;
  unreadableCount: number;
}

export async function buildSuggestionInput(
  sources: File[],
  { language, existingTitle, downscale }: SuggestionInputOptions,
): Promise<BuiltSuggestionInput> {
  const kept = sources.slice(0, MAX_SUGGESTION_PHOTOS);
  const photos: string[] = [];

  for (const source of kept) {
    const photo = await downscale(source).catch(() => null);
    if (photo !== null) photos.push(photo);
  }

  const droppedCount = sources.length - kept.length;
  const unreadableCount = kept.length - photos.length;

  if (photos.length === 0)
    return { input: null, droppedCount, unreadableCount };

  return {
    input: existingTitle
      ? { photos, language, existingTitle }
      : { photos, language },
    droppedCount,
    unreadableCount,
  };
}
