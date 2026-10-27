import { describe, expect, it } from "vitest";
import {
  buildSuggestionInput,
  droppedPhotosNotice,
  MAX_SUGGESTION_PHOTOS,
  unreadablePhotosNotice,
} from "./suggestion-input";

const MB = 1024 * 1024;

const SUGGESTION_BODY_LIMIT = 40 * MB;

const phonePhoto = (index: number) =>
  new File([new Uint8Array(8 * MB)], `photo-${index}.jpg`, {
    type: "image/jpeg",
  });

const downscaledPhoto = `data:image/jpeg;base64,${"A".repeat(700_000)}`;

describe("buildSuggestionInput", () => {
  it("keeps ten phone photos under the suggestion body limit", async () => {
    const sources = Array.from({ length: 10 }, (_, index) => phonePhoto(index));

    const built = await buildSuggestionInput(sources, {
      language: "fr",
      downscale: async () => downscaledPhoto,
    });

    expect(built.input?.photos).toHaveLength(10);
    expect(new Blob([JSON.stringify(built.input)]).size).toBeLessThan(
      SUGGESTION_BODY_LIMIT,
    );
  });

  it("drops the photos beyond ten and counts them", async () => {
    const sources = Array.from({ length: 13 }, (_, index) => phonePhoto(index));
    const read: string[] = [];

    const built = await buildSuggestionInput(sources, {
      language: "fr",
      downscale: async (file) => {
        read.push(file instanceof File ? file.name : "");
        return downscaledPhoto;
      },
    });

    expect(built.droppedCount).toBe(3);
    expect(built.input?.photos).toHaveLength(MAX_SUGGESTION_PHOTOS);
    expect(read).not.toContain("photo-10.jpg");
  });

  it("leaves out a photo the browser cannot decode and sends the others", async () => {
    const heic = new File(["x"], "photo.heic", { type: "image/heic" });

    const built = await buildSuggestionInput(
      [phonePhoto(0), heic, phonePhoto(2)],
      {
        language: "de",
        downscale: async (file) =>
          file === heic
            ? Promise.reject(new Error("decode failed"))
            : downscaledPhoto,
      },
    );

    expect(built.unreadableCount).toBe(1);
    expect(built.input).toEqual({
      photos: [downscaledPhoto, downscaledPhoto],
      language: "de",
    });
  });

  it("has nothing to send when no photo can be decoded", async () => {
    const built = await buildSuggestionInput([phonePhoto(0)], {
      language: "fr",
      downscale: () => Promise.reject(new Error("decode failed")),
    });

    expect(built.input).toBeNull();
    expect(built.unreadableCount).toBe(1);
  });
});

describe("suggestion notices", () => {
  it("agrees the participle with a single photo", () => {
    expect(droppedPhotosNotice(1)).toBe(
      "1 photo non envoyée : 10 photos au maximum.",
    );
    expect(unreadablePhotosNotice(1)).toBe(
      "1 photo ignorée : format de photo non pris en charge.",
    );
  });

  it("agrees the participle with several photos", () => {
    expect(droppedPhotosNotice(3)).toBe(
      "3 photos non envoyées : 10 photos au maximum.",
    );
    expect(unreadablePhotosNotice(2)).toBe(
      "2 photos ignorées : format de photo non pris en charge.",
    );
  });
});
