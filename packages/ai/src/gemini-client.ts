import {
  type GenerateContentParameters,
  type GenerateContentResponse,
  GoogleGenAI,
  type HttpRetryOptions,
} from "@google/genai";
import { Result } from "@packages/ddd-kit";
import { z } from "zod";
import { type AiFailure, aiFailure, toAiFailure } from "./failures";
import { TEXT_MODEL } from "./models";

export type GenAiModels = Pick<GoogleGenAI["models"], "generateContent">;

export interface InlineImage {
  mimeType: string;
  base64: string;
}

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

export interface GeminiClient {
  generateStructured<S extends z.ZodType>(
    request: StructuredRequest<S>,
  ): Promise<Result<StructuredAnswer<z.infer<S>>, AiFailure>>;
}

type GeminiClientOptions = { apiKey: string } | { models: GenAiModels };

const RETRY_OPTIONS = {
  attempts: 4,
  initialDelay: 1,
  maxDelay: 30,
  expBase: 2,
  jitter: 1,
  httpStatusCodes: [408, 429, 500, 502, 503, 504],
} satisfies HttpRetryOptions;

const TEXT_TIMEOUT_MS = 90_000;

function structuredParameters<S extends z.ZodType>(
  request: StructuredRequest<S>,
): GenerateContentParameters {
  const { $schema: _, ...responseJsonSchema } = z.toJSONSchema(request.schema);
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
      responseJsonSchema,
      ...(request.search ? { tools: [{ googleSearch: {} }] } : {}),
    },
  };
}

async function callModel(
  models: GenAiModels,
  parameters: GenerateContentParameters,
): Promise<Result<GenerateContentResponse, AiFailure>> {
  try {
    return Result.ok(await models.generateContent(parameters));
  } catch (error) {
    return Result.fail(toAiFailure(error));
  }
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

  if (text === "") {
    const reason =
      response.candidates?.[0]?.finishReason ??
      response.promptFeedback?.blockReason ??
      "UNKNOWN";

    return Result.fail(
      aiFailure(
        "AI_REJECTED",
        `The model returned no text (finish reason: ${reason}).`,
      ),
    );
  }

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

export function createGeminiClient(options: GeminiClientOptions): GeminiClient {
  const models =
    "models" in options
      ? options.models
      : new GoogleGenAI({
          apiKey: options.apiKey,
          httpOptions: {
            retryOptions: RETRY_OPTIONS,
            timeout: TEXT_TIMEOUT_MS,
          },
        }).models;

  return {
    async generateStructured(request) {
      const response = await callModel(models, structuredParameters(request));

      return response.flatMap((answer) =>
        readStructured(answer, request.schema),
      );
    },
  };
}
