import { Option, Result } from "@packages/ddd-kit";
import sharp from "sharp";
import { type AiFailure, aiFailure, errorReason } from "./failures";
import type { InlineImage } from "./inline-image";

export type FetchImage = (url: URL, init: RequestInit) => Promise<Response>;

export interface ImageIntakeOptions {
  allowedHost?: (host: string) => boolean;
  allowInsecure?: boolean;
  fetch?: FetchImage;
  timeoutMs?: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGES = 10;
const LONGEST_SIDE_PX = 1600;
const WEBP_QUALITY = 85;
const MAX_INPUT_PIXELS = 40_000_000;
const VINTED_IMAGE_HOST = /^([a-z0-9-]+\.)+vinted\.net$/i;
const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/i;
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

export function isVintedImageHost(host: string): boolean {
  return VINTED_IMAGE_HOST.test(host);
}

function isAllowed(url: URL, options: ImageIntakeOptions): boolean {
  const allowedHost = options.allowedHost ?? isVintedImageHost;
  if (url.username !== "" || url.password !== "") return false;
  if (!allowedHost(url.hostname)) return false;
  if (options.allowInsecure) return WEB_PROTOCOLS.has(url.protocol);

  return url.protocol === "https:" && url.port === "";
}

function checkedUrl(
  input: string,
  options: ImageIntakeOptions,
): Result<URL, AiFailure> {
  const url = URL.parse(input);
  if (!url)
    return Result.fail(
      aiFailure("IMAGE_INVALID", "The photo URL is not a URL."),
    );

  if (!isAllowed(url, options))
    return Result.fail(
      aiFailure(
        "IMAGE_HOST_FORBIDDEN",
        `Refused ${url.protocol}//${url.host}: not an https Vinted image host.`,
      ),
    );

  return Result.ok(url);
}

async function normalize(
  bytes: Uint8Array,
): Promise<Result<InlineImage, AiFailure>> {
  try {
    const webp = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
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
    return Result.fail(
      aiFailure(
        "IMAGE_INVALID",
        `The photo could not be decoded: ${errorReason(error)}`,
      ),
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
        : errorReason(error);

    return Result.fail(
      aiFailure(
        "IMAGE_FETCH_FAILED",
        `The photo from ${url.hostname} could not be downloaded: ${reason}`,
      ),
    );
  }
}

async function downloadImage(
  url: URL,
  options: ImageIntakeOptions,
): Promise<Result<InlineImage, AiFailure>> {
  const bytes = await download(url, options);
  if (bytes.isFailure) return Result.fail(bytes.getError());

  return normalize(bytes.getValue());
}

export async function fetchListingImage(
  input: string,
  options: ImageIntakeOptions = {},
): Promise<Result<InlineImage, AiFailure>> {
  const url = checkedUrl(input, options);
  if (url.isFailure) return Result.fail(url.getError());

  return downloadImage(url.getValue(), options);
}

async function decodeDataUrl(
  input: string,
): Promise<Result<InlineImage, AiFailure>> {
  const payload = DATA_URL.exec(input)?.[1];
  if (payload === undefined)
    return Result.fail(
      aiFailure("IMAGE_INVALID", "The data URL is not a base64 image."),
    );

  if ((payload.length * 3) / 4 > MAX_IMAGE_BYTES)
    return Result.fail(
      aiFailure(
        "IMAGE_TOO_LARGE",
        `The data URL photo exceeds ${MAX_IMAGE_BYTES} bytes.`,
      ),
    );

  return normalize(Buffer.from(payload, "base64"));
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

  const checked = Result.all(urls.map((url) => checkedUrl(url, options)));
  if (checked.isFailure) return Result.fail(checked.getError());

  const images = await Promise.all(
    checked.getValue().map((url) => downloadImage(url, options)),
  );

  return Result.all(images);
}
