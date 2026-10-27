import { describe, expect, it } from "bun:test";
import { Option, Result } from "@packages/ddd-kit";
import type { IListingSuggester } from "@packages/studio/application/ports/listing-suggester.port";
import type { IPhotoEditor } from "@packages/studio/application/ports/photo-editor.port";
import type { ListingSuggestionFacts } from "@packages/studio/domain/listing-suggestion";
import { createStudioRoutes } from "@packages/studio/infrastructure/http/studio.routes";
import { studioModule } from "@packages/studio/studio.module";
import { mockPort } from "@packages/testing/port-mock";
import { container } from "inwire";
import { silentLogger } from "../../../common/logger";
import { createApp } from "../../composition/app";
import type { IDatabaseProbe } from "../../ports/database-probe.port";

const MB = 1024 * 1024;
const PHOTO = "https://images1.vinted.net/t/01_abc/f800/1.jpeg";
const EDITED_BYTES = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

const facts: ListingSuggestionFacts = {
  title: "Veste en jean Levi's",
  description: "Veste en jean bleu, très peu portée.",
  condition: "very_good",
  brand: Option.some("Levi's"),
  colors: ["blue"],
  category: Option.some("Jackets"),
  size: Option.none(),
  material: Option.some("Denim"),
  priceCents: 4250,
  priceConfidence: "medium",
  priceReasoning: "Similar jackets sell around 40 €.",
};

const groundingSources = [{ title: "Vinted", uri: "https://www.vinted.fr" }];

function givenApi() {
  const photoEditor = mockPort<IPhotoEditor>();
  photoEditor.edit.mockResolvedValue(
    Result.ok({ mimeType: "image/png", bytes: EDITED_BYTES }),
  );
  const listingSuggester = mockPort<IListingSuggester>();
  listingSuggester.suggest.mockResolvedValue(
    Result.ok({ facts, groundingSources }),
  );

  const studio = container()
    .add("logger", () => silentLogger)
    .add("IPhotoEditor", () => photoEditor)
    .add("IListingSuggester", () => listingSuggester)
    .addModule(studioModule)
    .build();

  const api = createApp({
    env: { NODE_ENV: "test" },
    logger: silentLogger,
    report: () => {},
    databaseProbe: mockPort<IDatabaseProbe>(),
  }).route("/api/studio", createStudioRoutes(studio));

  return { api, photoEditor, listingSuggester };
}

function post(path: string, body: unknown) {
  return givenApi().api.request(`/api/studio${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dataUrlOf(bytes: number): string {
  return `data:image/jpeg;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;
}

describe("the studio routes", () => {
  it("lists the 5 system presets without their prompt background", async () => {
    const response = await givenApi().api.request("/api/studio/presets");
    const { presets } = await response.json();

    expect(response.status).toBe(200);
    expect(presets).toHaveLength(5);
    expect(presets[0]).toEqual({
      id: "preset-white-studio",
      name: "White Studio",
      description:
        "Clean white table with subtle texture and soft lighting. Perfect for e-commerce.",
    });
  });

  it("answers 404 with a typed body for an unknown preset", async () => {
    const response = await post("/edits", {
      image: PHOTO,
      presetId: "preset-unknown",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "STUDIO_PRESET_NOT_FOUND",
        message: expect.stringContaining("Reload the preset list"),
        requestId: expect.any(String),
      },
    });
  });

  it("answers 400 for an instruction shorter than 10 characters", async () => {
    const response = await post("/edits", {
      image: PHOTO,
      instruction: "white",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("STUDIO_INPUT_INVALID");
  });

  it("answers 400 for a body with neither a preset nor an instruction", async () => {
    const response = await post("/edits", { image: PHOTO });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("STUDIO_INPUT_INVALID");
  });

  it("returns the edited bytes untouched, in base64", async () => {
    const response = await post("/edits", {
      image: PHOTO,
      instruction: "Put the jacket on a light oak table",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mimeType: "image/png",
      imageBase64: Buffer.from(EDITED_BYTES).toString("base64"),
    });
  });

  it("lets a 10 MB data url photo through the edit body limit", async () => {
    const response = await post("/edits", {
      image: dataUrlOf(10 * MB),
      presetId: "preset-minimalist",
    });

    expect(response.status).toBe(200);
  });

  it("answers 413 with a typed body for an edit body over 15 MB", async () => {
    const { api, photoEditor } = givenApi();
    const response = await api.request("/api/studio/edits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: dataUrlOf(12 * MB),
        presetId: "preset-minimalist",
      }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: {
        code: "REQUEST_TOO_LARGE",
        message:
          "The request body exceeds 15 MB. Send a smaller request body and retry.",
        requestId: expect.any(String),
      },
    });
    expect(photoEditor.edit).not.toHaveBeenCalled();
  });

  it("answers the suggestion in euros with the range computed by the domain", async () => {
    const response = await post("/listing-suggestions", {
      photos: [PHOTO],
      language: "fr",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      title: "Veste en jean Levi's",
      description: "Veste en jean bleu, très peu portée.",
      condition: "very_good",
      brand: "Levi's",
      colors: ["blue"],
      category: "Jackets",
      size: null,
      material: "Denim",
      price: 42.5,
      priceRange: { low: 34, high: 51 },
      priceConfidence: "medium",
      priceReasoning: "Similar jackets sell around 40 €.",
      groundingSources,
    });
  });
});
