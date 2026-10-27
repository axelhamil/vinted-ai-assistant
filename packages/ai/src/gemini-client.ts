import {
  FinishReason,
  type GenerateContentParameters,
  type GenerateContentResponse,
  GoogleGenAI,
  type HttpRetryOptions,
  Modality,
} from "@google/genai";
import { Result } from "@packages/ddd-kit";
import { z } from "zod";
import {
  type AiFailure,
  type AiFailureCode,
  aiFailure,
  errorReason,
  toAiFailure,
} from "./failures";
import type { InlineImage } from "./inline-image";
import { IMAGE_MODEL, TEXT_MODEL } from "./models";

export type GenAiModels = Pick<GoogleGenAI["models"], "generateContent">;

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface StructuredRequest<S extends z.ZodType> {
  system: string;
  prompt: string;
  images: InlineImage[];
  schema: S;
  search: boolean;
}

export interface StructuredAnswer<T> {
  data: T;
  sources: GroundingSource[];
}

export interface ImageEditRequest {
  source: InlineImage;
  instruction: string;
}

export interface GeneratedImage {
  mimeType: string;
  bytes: Uint8Array;
}

export interface GeminiClient {
  generateStructured<S extends z.ZodType>(
    request: StructuredRequest<S>,
  ): Promise<Result<StructuredAnswer<z.infer<S>>, AiFailure>>;
  editImage(
    request: ImageEditRequest,
  ): Promise<Result<GeneratedImage, AiFailure>>;
}

interface CallBudget {
  attemptMs: number;
  totalMs: number;
}

interface CallBudgets {
  text: CallBudget;
  image: CallBudget;
}

type GeminiClientOptions = ({ apiKey: string } | { models: GenAiModels }) & {
  budgets?: CallBudgets;
};

const RETRY_OPTIONS = {
  attempts: 4,
  initialDelay: 1,
  maxDelay: 30,
  expBase: 2,
  jitter: 1,
  httpStatusCodes: [408, 429, 500, 502, 503, 504],
} satisfies HttpRetryOptions;

const DEFAULT_BUDGETS: CallBudgets = {
  text: { attemptMs: 60_000, totalMs: 120_000 },
  image: { attemptMs: 90_000, totalMs: 150_000 },
};

const REJECTING_FINISH_REASONS = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.IMAGE_SAFETY,
  FinishReason.SPII,
  FinishReason.RECITATION,
]);

const PNG_MIME_TYPE = "image/png";

function responseJsonSchema(schema: z.ZodType): Result<unknown, AiFailure> {
  try {
    const { $schema: _, ...jsonSchema } = z.toJSONSchema(schema);

    return Result.ok(jsonSchema);
  } catch (error) {
    return Result.fail(
      aiFailure(
        "AI_INVALID_OUTPUT",
        `The answer schema has no JSON Schema form: ${errorReason(error)}`,
      ),
    );
  }
}

function structuredParameters<S extends z.ZodType>(
  request: StructuredRequest<S>,
  jsonSchema: unknown,
): GenerateContentParameters {
  const imageParts = request.images.map((image) => ({
    inlineData: { mimeType: image.mimeType, data: image.base64 },
  }));

  return {
    model: TEXT_MODEL,
    contents: [
      { role: "user", parts: [...imageParts, { text: request.prompt }] },
    ],
    config: {
      systemInstruction: request.system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      ...(request.search ? { tools: [{ googleSearch: {} }] } : {}),
    },
  };
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}

async function callModel(
  models: GenAiModels,
  parameters: GenerateContentParameters,
  budget: CallBudget,
): Promise<Result<GenerateContentResponse, AiFailure>> {
  const signal = AbortSignal.timeout(budget.totalMs);
  const answer = models.generateContent({
    ...parameters,
    config: {
      ...parameters.config,
      abortSignal: signal,
      httpOptions: { timeout: budget.attemptMs },
    },
  });

  try {
    return Result.ok(await Promise.race([answer, rejectOnAbort(signal)]));
  } catch (error) {
    return Result.fail(toAiFailure(error));
  }
}

function emptyAnswerFailure(
  response: GenerateContentResponse,
  otherwise: AiFailureCode,
  missing: string,
): AiFailure {
  const finishReason = response.candidates?.[0]?.finishReason;
  const blockReason = response.promptFeedback?.blockReason;
  const rejected =
    blockReason !== undefined ||
    (finishReason !== undefined && REJECTING_FINISH_REASONS.has(finishReason));
  const reason = finishReason ?? blockReason ?? "UNKNOWN";

  return aiFailure(
    rejected ? "AI_REJECTED" : otherwise,
    `The model returned no ${missing} (finish reason: ${reason}).`,
  );
}

function parseJson(text: string): Result<unknown, AiFailure> {
  try {
    return Result.ok(JSON.parse(text));
  } catch {
    return Result.fail(
      aiFailure(
        "AI_INVALID_OUTPUT",
        "The model answered with text that is not JSON.",
      ),
    );
  }
}

function groundingSources(
  response: GenerateContentResponse,
): GroundingSource[] {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const byUri = new Map<string, GroundingSource>();

  for (const { web } of chunks) {
    const uri = web?.uri;
    if (!uri || byUri.has(uri)) continue;

    byUri.set(uri, { title: web.title ?? uri, uri });
  }

  return [...byUri.values()];
}

function readStructured<S extends z.ZodType>(
  response: GenerateContentResponse,
  schema: S,
): Result<StructuredAnswer<z.infer<S>>, AiFailure> {
  const text = response.text?.trim() ?? "";

  if (text === "")
    return Result.fail(
      emptyAnswerFailure(response, "AI_INVALID_OUTPUT", "text"),
    );

  return parseJson(text).flatMap((json) => {
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      const paths = parsed.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ");

      return Result.fail(
        aiFailure(
          "AI_INVALID_OUTPUT",
          `The model output does not match the schema at: ${paths}.`,
        ),
      );
    }

    return Result.ok({
      data: parsed.data,
      sources: groundingSources(response),
    });
  });
}

function imageEditParameters(
  request: ImageEditRequest,
): GenerateContentParameters {
  return {
    model: IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: request.source.mimeType,
              data: request.source.base64,
            },
          },
          { text: request.instruction },
        ],
      },
    ],
    config: { responseModalities: [Modality.IMAGE] },
  };
}

function readImage(
  response: GenerateContentResponse,
): Result<GeneratedImage, AiFailure> {
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  for (const { inlineData } of parts) {
    if (!inlineData?.data) continue;

    return Result.ok({
      mimeType: inlineData.mimeType ?? PNG_MIME_TYPE,
      bytes: Uint8Array.from(Buffer.from(inlineData.data, "base64")),
    });
  }

  const text = response.text?.trim() || "(none)";

  return Result.fail(
    emptyAnswerFailure(response, "AI_NO_IMAGE", `image, text: ${text}`),
  );
}

export function createGeminiClient(options: GeminiClientOptions): GeminiClient {
  const budgets = options.budgets ?? DEFAULT_BUDGETS;
  const models =
    "models" in options
      ? options.models
      : new GoogleGenAI({
          apiKey: options.apiKey,
          httpOptions: { retryOptions: RETRY_OPTIONS },
        }).models;

  return {
    async generateStructured(request) {
      const jsonSchema = responseJsonSchema(request.schema);
      if (jsonSchema.isFailure) return Result.fail(jsonSchema.getError());

      const response = await callModel(
        models,
        structuredParameters(request, jsonSchema.getValue()),
        budgets.text,
      );

      return response.flatMap((answer) =>
        readStructured(answer, request.schema),
      );
    },

    async editImage(request) {
      const response = await callModel(
        models,
        imageEditParameters(request),
        budgets.image,
      );

      return response.flatMap(readImage);
    },
  };
}
