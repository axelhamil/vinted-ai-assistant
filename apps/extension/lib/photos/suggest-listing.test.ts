import { describe, expect, it, vi } from "vitest";
import type { Reply } from "@/lib/api/failure";
import type {
  ListingSuggestionDto,
  SuggestInput,
} from "@/lib/messaging/protocol";
import { UNREADABLE_PHOTO_MESSAGE } from "./edit-queue";
import { type SuggestDeps, suggestListing } from "./suggest-listing";

const SUGGESTION: ListingSuggestionDto = {
  title: "Veste en jean Levi's",
  description: "Très bon état, portée deux fois.",
  condition: "very_good",
  brand: "Levi's",
  colors: ["Bleu"],
  category: "Vestes",
  size: "M",
  material: "Coton",
  price: 35,
  priceRange: { low: 30, high: 40 },
  priceConfidence: "medium",
  priceReasoning: "Prix observés sur des vestes similaires.",
  groundingSources: [],
};

const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function deps(overrides: Partial<SuggestDeps> = {}) {
  const send = vi.fn(
    async (_input: SuggestInput): Promise<Reply<ListingSuggestionDto>> => ({
      ok: true,
      data: SUGGESTION,
    }),
  );

  return {
    send,
    deps: {
      language: () => "it",
      downscale: async (file: Blob) =>
        `small:${file instanceof File ? file.name : ""}`,
      send,
      ...overrides,
    },
  };
}

describe("suggestListing", () => {
  it("sends the downscaled photos in the detected language", async () => {
    const { send, deps: suggestDeps } = deps();

    const reply = await suggestListing(
      [photo("a.jpg"), photo("b.jpg")],
      suggestDeps,
    );

    expect(send).toHaveBeenCalledWith({
      photos: ["small:a.jpg", "small:b.jpg"],
      language: "it",
    });
    expect(reply).toEqual({
      ok: true,
      data: { suggestion: SUGGESTION, droppedCount: 0, unreadableCount: 0 },
    });
  });

  it("still suggests when one photo cannot be read", async () => {
    const { send, deps: suggestDeps } = deps({
      downscale: async (file) =>
        file instanceof File && file.name === "b.heic"
          ? Promise.reject(new Error("decode failed"))
          : "small",
    });

    const reply = await suggestListing(
      [photo("a.jpg"), photo("b.heic")],
      suggestDeps,
    );

    expect(send).toHaveBeenCalledWith({ photos: ["small"], language: "it" });
    expect(reply.ok && reply.data.unreadableCount).toBe(1);
  });

  it("asks nothing from the server when no photo can be read", async () => {
    const { send, deps: suggestDeps } = deps({
      downscale: () => Promise.reject(new Error("decode failed")),
    });

    const reply = await suggestListing([photo("a.heic")], suggestDeps);

    expect(send).not.toHaveBeenCalled();
    expect(reply).toEqual({
      ok: false,
      failure: { kind: "local", message: UNREADABLE_PHOTO_MESSAGE },
    });
  });
});
