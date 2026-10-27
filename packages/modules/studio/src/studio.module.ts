import type { GeminiClient } from "@packages/ai/gemini-client";
import { parseImageInput } from "@packages/ai/images";
import type { ILogger } from "@packages/ddd-kit";
import { defineModule } from "inwire";
import type { IListingSuggester } from "./application/ports/listing-suggester.port";
import type { IPhotoEditor } from "./application/ports/photo-editor.port";
import { StudioService } from "./application/services/studio.service";
import { GeminiListingSuggester } from "./infrastructure/ai/gemini-listing-suggester";
import { GeminiPhotoEditor } from "./infrastructure/ai/gemini-photo-editor";

const readImage = (input: string) => parseImageInput(input);

export interface StudioAiPrerequisites {
  GeminiClient: GeminiClient;
  logger: ILogger;
}

export const studioAiModule = defineModule<StudioAiPrerequisites>()((b) =>
  b
    .add(
      "IPhotoEditor",
      (c): IPhotoEditor =>
        new GeminiPhotoEditor(c.GeminiClient, readImage, c.logger),
    )
    .add(
      "IListingSuggester",
      (c): IListingSuggester =>
        new GeminiListingSuggester(c.GeminiClient, readImage, c.logger),
    ),
);

export interface StudioPrerequisites {
  logger: ILogger;
  IPhotoEditor: IPhotoEditor;
  IListingSuggester: IListingSuggester;
}

export const studioModule = defineModule<StudioPrerequisites>()((b) =>
  b.add(
    "StudioService",
    (c) => new StudioService(c.IPhotoEditor, c.IListingSuggester, c.logger),
  ),
);
