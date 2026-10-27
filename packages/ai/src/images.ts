import { Option, Result } from "@packages/ddd-kit";
import sharp from "sharp";
import { type AiFailure, aiFailure } from "./failures";
import type { InlineImage } from "./gemini-client";

export type FetchImage = (url: URL, init: RequestInit) => Promise<Response>;

export interface ImageIntakeOptions {
  allowedHost?: (host: string) => boolean;
  fetch?: FetchImage;
  timeoutMs?: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGES = 10;
const LONGEST_SIDE_PX = 1600;
const WEBP_QUALITY = 85;
const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/i;
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

export function isVintedImageHost(host: string): boolean {
  return host.toLowerCase().endsWith(".vinted.net");
}

function parseUrl(input: string): Option<URL> {
  return Option.fromNullable(URL.parse(input));
}

function isAllowed(url: URL, options: ImageIntakeOptions): boolean {
  if (!WEB_PROTOCOLS.has(url.protocol)) return false;
  if (options.allowedHost) return options.allowedHost(url.hostname);

  return url.protocol === "https:" && isVintedImageHost(url.hostname);
}

async function normalize(
  bytes: Uint8Array,
): Promise<Result<InlineImage, AiFailure>> {
  try {
    const webp = await sharp(bytes)
      .rotate()
      .resize({
        width: LONGEST_SIDE_PX,
        height: LONGEST_SIDE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    return Result.ok({
      mimeType: "image/webp",
      base64: webp.toString("base64"),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return Result.fail(
      aiFailure("IMAGE_INVALID", `The photo could not be decoded: ${reason}`),
    );
  }
}

async function readCapped(
  body: ReadableStream<Uint8Array>,
  host: string,
): Promise<Result<Uint8Array, AiFailure>> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Result.ok(Buffer.concat(chunks, total));

    total += value.byteLength;

    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();

      return Result.fail(
        aiFailure(
          "IMAGE_TOO_LARGE",
          `The photo from ${host} exceeds ${MAX_IMAGE_BYTES} bytes.`,
        ),
      );
    }

    chunks.push(value);
  }
}

async function download(
  url: URL,
  options: ImageIntakeOptions,
): Promise<Result<Uint8Array, AiFailure>> {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const fetchImage = options.fetch ?? fetch;

  try {
    const response = await fetchImage(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    });

    if (!response.ok) {
      await response.body?.cancel();

      return Result.fail(
        aiFailure(
          "IMAGE_FETCH_FAILED",
          `${url.hostname} answered HTTP ${response.status}.`,
          Option.some(response.status),
        ),
      );
    }

    if (!response.body)
      return Result.fail(
        aiFailure("IMAGE_INVALID", `${url.hostname} answered an empty body.`),
      );

    return await readCapped(response.body, url.hostname);
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? `no answer within ${timeoutMs} ms`
        : error instanceof Error
          ? error.message
          : String(error);

    return Result.fail(
      aiFailure(
        "IMAGE_FETCH_FAILED",
        `The photo from ${url.hostname} could not be downloaded: ${reason}`,
      ),
    );
  }
}

export async function fetchListingImage(
  input: string,
  options: ImageIntakeOptions = {},
): Promise<Result<InlineImage, AiFailure>> {
  const url = parseUrl(input);
  if (url.isNone())
    return Result.fail(
      aiFailure("IMAGE_INVALID", "The photo URL is not a URL."),
    );

  const target = url.unwrap();
  if (!isAllowed(target, options))
    return Result.fail(
      aiFailure(
        "IMAGE_HOST_FORBIDDEN",
        `Refused ${target.protocol}//${target.hostname}: not an https Vinted image host.`,
      ),
    );

  const bytes = await download(target, options);
  if (bytes.isFailure) return Result.fail(bytes.getError());

  return normalize(bytes.getValue());
}

async function decodeDataUrl(
  input: string,
): Promise<Result<InlineImage, AiFailure>> {
  const payload = DATA_URL.exec(input)?.[1];
  if (payload === undefined)
    return Result.fail(
      aiFailure("IMAGE_INVALID", "The data URL is not a base64 image."),
    );

  const bytes = Buffer.from(payload, "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES)
    return Result.fail(
      aiFailure(
        "IMAGE_TOO_LARGE",
        `The data URL photo exceeds ${MAX_IMAGE_BYTES} bytes.`,
      ),
    );

  return normalize(bytes);
}

export function parseImageInput(
  input: string,
  options: ImageIntakeOptions = {},
): Promise<Result<InlineImage, AiFailure>> {
  if (input.startsWith("data:")) return decodeDataUrl(input);

  return fetchListingImage(input, options);
}

export async function fetchListingImages(
  urls: string[],
  options: ImageIntakeOptions = {},
): Promise<Result<InlineImage[], AiFailure>> {
  if (urls.length > MAX_IMAGES)
    return Result.fail(
      aiFailure(
        "IMAGE_INVALID",
        `${urls.length} photos sent, at most ${MAX_IMAGES} are analysed.`,
      ),
    );

  const results = await Promise.all(
    urls.map((url) => fetchListingImage(url, options)),
  );
  const images: InlineImage[] = [];

  for (const result of results) {
    if (result.isFailure) return Result.fail(result.getError());

    images.push(result.getValue());
  }

  return Result.ok(images);
}
