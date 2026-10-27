import type { SuggestInput } from "@/lib/messaging/protocol";
import { UNREADABLE_PHOTO_MESSAGE } from "./edit-queue";

export const MAX_SUGGESTION_PHOTOS = 10;

const agreedPhotos = (count: number, participle: string): string =>
  count > 1 ? `${count} photos ${participle}s` : `${count} photo ${participle}`;

export const droppedPhotosNotice = (count: number): string =>
  `${agreedPhotos(count, "non envoyée")} : ${MAX_SUGGESTION_PHOTOS} photos au maximum.`;

export const unreadablePhotosNotice = (count: number): string =>
  `${agreedPhotos(count, "ignorée")} : ${UNREADABLE_PHOTO_MESSAGE.toLowerCase()}.`;

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
