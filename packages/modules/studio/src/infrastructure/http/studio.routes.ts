import { zValidator } from "@hono/zod-validator";
import { AppErrorException, type Result } from "@packages/ddd-kit";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  toEditedPhotoDto,
  toListingSuggestionDto,
  toPresetsDto,
} from "../../application/dto/studio.presenter";
import type { StudioService } from "../../application/services/studio.service";
import { STUDIO_ERROR_MESSAGES, type StudioErrorCode } from "../../errors";

export interface StudioRoutesDeps {
  StudioService: StudioService;
}

const MB = 1024 * 1024;
const EDIT_BODY_LIMIT_MB = 15;
const SUGGESTION_BODY_LIMIT_MB = 40;

const image = z.string().min(1);

const editBodySchema = z.union([
  z.strictObject({ image, presetId: z.string() }),
  z.strictObject({ image, instruction: z.string() }),
]);

const suggestionBodySchema = z.object({
  photos: z.array(z.string()),
  language: z.string(),
  existingTitle: z.string().optional(),
});

function failure(code: StudioErrorCode): AppErrorException {
  return new AppErrorException({
    code,
    message: STUDIO_ERROR_MESSAGES[code],
  });
}

function succeeded<T>(result: Result<T, StudioErrorCode>): T {
  if (result.isFailure) throw failure(result.getError());

  return result.getValue();
}

function validatedJson<T extends z.ZodType>(schema: T) {
  return zValidator("json", schema, (result) => {
    if (!result.success) throw failure("STUDIO_INPUT_INVALID");
  });
}

function limitedTo(megabytes: number) {
  return bodyLimit({
    maxSize: megabytes * MB,
    onError: () => {
      throw new HTTPException(413, {
        message: `The request body exceeds ${megabytes} MB`,
      });
    },
  });
}

export function createStudioRoutes(deps: StudioRoutesDeps) {
  return new Hono()
    .get("/presets", (c) =>
      c.json(toPresetsDto(deps.StudioService.listPresets())),
    )
    .post(
      "/edits",
      limitedTo(EDIT_BODY_LIMIT_MB),
      validatedJson(editBodySchema),
      async (c) => {
        const body = c.req.valid("json");
        const edited = succeeded(
          "presetId" in body
            ? await deps.StudioService.editWithPreset(body)
            : await deps.StudioService.editWithInstruction(body),
        );

        return c.json(toEditedPhotoDto(edited));
      },
    )
    .post(
      "/listing-suggestions",
      limitedTo(SUGGESTION_BODY_LIMIT_MB),
      validatedJson(suggestionBodySchema),
      async (c) => {
        const suggested = succeeded(
          await deps.StudioService.suggestListing(c.req.valid("json")),
        );

        return c.json(toListingSuggestionDto(suggested));
      },
    );
}
