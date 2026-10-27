import { describe, expect, it } from "bun:test";
import { type ILogger, Option, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import type { ListingSuggestionFacts } from "../../domain/listing-suggestion";
import type { IListingSuggester } from "../ports/listing-suggester.port";
import type { IPhotoEditor } from "../ports/photo-editor.port";
import { StudioService } from "./studio.service";

const PHOTO = "https://images1.vinted.net/t/photo.webp";
const EDITED = { mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) };

function buildFacts(
  overrides: Partial<ListingSuggestionFacts> = {},
): ListingSuggestionFacts {
  return {
    title: "Veste en jean Levi's",
    description: "Veste en jean bleu, très peu portée.",
    condition: "very_good",
    brand: Option.some("Levi's"),
    colors: ["blue"],
    category: Option.some("Jackets"),
    size: Option.some("M"),
    material: Option.some("Denim"),
    priceCents: 4000,
    priceConfidence: "medium",
    priceReasoning: "Similar jackets sell around 40 €.",
    ...overrides,
  };
}

function given(facts: ListingSuggestionFacts = buildFacts()) {
  const photoEditor = mockPort<IPhotoEditor>();
  const listingSuggester = mockPort<IListingSuggester>();
  const logger = mockPort<ILogger>();

  photoEditor.edit.mockResolvedValue(Result.ok(EDITED));
  listingSuggester.suggest.mockResolvedValue(
    Result.ok({ facts, groundingSources: [] }),
  );

  const studio = new StudioService(photoEditor, listingSuggester, logger);

  return { studio, photoEditor, listingSuggester, logger };
}

describe("studio presets", () => {
  it("lists the system presets by sort order", () => {
    const { studio } = given();

    const orders = studio.listPresets().map(({ sortOrder }) => sortOrder);

    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("editing a photo", () => {
  it("answers preset not found for an unknown preset, without calling the editor", async () => {
    const { studio, photoEditor } = given();

    const result = await studio.editWithPreset({
      image: PHOTO,
      presetId: "preset-unknown",
    });

    expect(result.getError()).toBe("STUDIO_PRESET_NOT_FOUND");
    expect(photoEditor.edit).not.toHaveBeenCalled();
  });

  it("refuses an instruction of 9 characters", async () => {
    const { studio, photoEditor } = given();

    const result = await studio.editWithInstruction({
      image: PHOTO,
      instruction: "Blue sky.",
    });

    expect(result.getError()).toBe("STUDIO_INPUT_INVALID");
    expect(photoEditor.edit).not.toHaveBeenCalled();
  });

  it("passes the editor failure code through", async () => {
    const { studio, photoEditor } = given();
    photoEditor.edit.mockResolvedValue(Result.fail("STUDIO_AI_TIMEOUT"));

    const result = await studio.editWithPreset({
      image: PHOTO,
      presetId: "preset-minimalist",
    });

    expect(result.getError()).toBe("STUDIO_AI_TIMEOUT");
  });
});

describe("suggesting a listing", () => {
  const suggest = (studio: StudioService, language = "fr") =>
    studio.suggestListing({ photos: [PHOTO], language });

  it("cuts a 70 character title to 50 characters at most, on a whole word", async () => {
    const longTitle =
      "Veste en jean Levi's Trucker bleu délavé coupe ample taille M très bon";
    const { studio } = given(buildFacts({ title: longTitle }));

    const result = await suggest(studio);

    const title = result.getValue().suggestion.get("title").value;
    expect(longTitle).toHaveLength(70);
    expect(title.length).toBeLessThanOrEqual(50);
    expect(longTitle.startsWith(`${title} `)).toBe(true);
  });

  it("frames a 40 € price between 32 € and 48 €", async () => {
    const { studio } = given(buildFacts({ priceCents: 4000 }));

    const result = await suggest(studio);

    expect(result.getValue().suggestion.get("price").range()).toEqual({
      lowCents: 3200,
      highCents: 4800,
    });
  });

  it("answers a provider failure when the model suggests a price of 0", async () => {
    const { studio, logger } = given(buildFacts({ priceCents: 0 }));

    const result = await suggest(studio);

    expect(result.getError()).toBe("STUDIO_AI_PROVIDER_FAILURE");
    expect(logger.warn).toHaveBeenCalled();
  });

  it("refuses an unsupported language before calling the model", async () => {
    const { studio, listingSuggester } = given();

    const result = await suggest(studio, "ja");

    expect(result.getError()).toBe("STUDIO_INPUT_INVALID");
    expect(listingSuggester.suggest).not.toHaveBeenCalled();
  });
});
