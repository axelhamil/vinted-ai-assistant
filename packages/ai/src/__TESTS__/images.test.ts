import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { crc32 } from "node:zlib";
import { fetch as networkFetch, serve, sleep } from "bun";
import sharp from "sharp";
import type { AiFailureCode } from "../failures";
import {
  fetchListingImage,
  fetchListingImages,
  isVintedImageHost,
  parseImageInput,
} from "../images";

const ELEVEN_MB = 11 * 1024 * 1024;
const CHUNK = new Uint8Array(1024 * 1024);

let photo: Uint8Array<ArrayBuffer>;
let smallPhoto: Uint8Array<ArrayBuffer>;
let server: ReturnType<typeof serve>;
let streamCancelled: Promise<void>;
let markStreamCancelled: () => void = () => undefined;
let streamedBytes = 0;

const local = {
  allowedHost: () => true,
  allowInsecure: true,
  fetch: networkFetch,
  timeoutMs: 200,
};

function url(path: string): string {
  return new URL(path, server.url).toString();
}

function endlessStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    pull(controller) {
      streamedBytes += CHUNK.byteLength;
      controller.enqueue(CHUNK);
    },
    cancel() {
      markStreamCancelled();
    },
  });
}

function stalledBody(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([0xff, 0xd8]));
    },
    pull: () => new Promise<void>(() => undefined),
  });
}

async function solidJpeg(width: number, height: number) {
  const jpeg = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "Seller", Artist: "Phone" } })
    .toBuffer();

  return new Uint8Array(jpeg);
}

async function pngClaiming(width: number, height: number) {
  const png = Buffer.from(
    await sharp({
      create: { width: 1, height: 1, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  );
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);

  return png;
}

function sideOf(image: { base64: string }) {
  return sharp(Buffer.from(image.base64, "base64"))
    .metadata()
    .then(({ width, height }) => Math.max(width, height));
}

beforeAll(async () => {
  photo = await solidJpeg(3000, 2000);
  smallPhoto = await solidJpeg(800, 600);

  streamCancelled = new Promise((resolve) => {
    markStreamCancelled = resolve;
  });

  server = serve({
    hostname: "127.0.0.1",
    port: 0,
    routes: {
      "/photo.jpg": () =>
        new Response(photo, { headers: { "content-type": "image/jpeg" } }),
      "/small.jpg": () =>
        new Response(smallPhoto, { headers: { "content-type": "image/jpeg" } }),
      "/stalled.jpg": () =>
        new Response(stalledBody(), {
          headers: { "content-type": "image/jpeg" },
        }),
      "/missing.jpg": () => new Response("not found", { status: 404 }),
      "/huge.jpg": () =>
        new Response(endlessStream(), {
          headers: { "content-type": "image/jpeg" },
        }),
      "/page.jpg": () =>
        new Response("<!doctype html><html><body>Login</body></html>", {
          headers: { "content-type": "image/jpeg" },
        }),
      "/hang.jpg": () => new Promise<Response>(() => undefined),
    },
  });
});

afterAll(async () => {
  await server.stop(true);
});

function expectFailure(
  result: { isFailure: boolean; getError(): { code: AiFailureCode } },
  code: AiFailureCode,
) {
  expect(result.isFailure).toBe(true);
  expect(result.getError().code).toBe(code);
}

describe("isVintedImageHost", () => {
  it("accepts Vinted image subdomains only", () => {
    expect(isVintedImageHost("images1.vinted.net")).toBe(true);
    expect(isVintedImageHost("vinted.net.evil.com")).toBe(false);
    expect(isVintedImageHost(".vinted.net")).toBe(false);
  });
});

describe("fetchListingImage", () => {
  it.each([
    "http://169.254.169.254/latest",
    "http://localhost/x",
    "https://evil.com/a.jpg",
    "http://images1.vinted.net/a.jpg",
    "https://images1.vinted.net:6379/a.jpg",
    "https://images1.vinted.net@evil.com/a.jpg",
    "https://images1.vinted.net./a.jpg",
  ])("refuses %s without making a request", async (forbidden) => {
    const fetch = mock(networkFetch);

    const result = await fetchListingImage(forbidden, { fetch });

    expectFailure(result, "IMAGE_HOST_FORBIDDEN");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps https required when only the host check is injected", async () => {
    const fetch = mock(networkFetch);

    const result = await fetchListingImage("http://images1.vinted.net/a.jpg", {
      allowedHost: isVintedImageHost,
      fetch,
    });

    expectFailure(result, "IMAGE_HOST_FORBIDDEN");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("normalizes a photo to a WebP of at most 1600 px without EXIF", async () => {
    expect((await sharp(photo).metadata()).exif).toBeDefined();

    const result = await fetchListingImage(url("/photo.jpg"), local);

    expect(result.isSuccess).toBe(true);
    const image = result.getValue();
    expect(image.mimeType).toBe("image/webp");
    const metadata = await sharp(
      Buffer.from(image.base64, "base64"),
    ).metadata();
    expect(metadata.format).toBe("webp");
    expect(Math.max(metadata.width, metadata.height)).toBe(1600);
    expect(metadata.exif).toBeUndefined();
  });

  it("fails with the HTTP status when the photo is missing", async () => {
    const result = await fetchListingImage(url("/missing.jpg"), local);

    expectFailure(result, "IMAGE_FETCH_FAILED");
    expect(result.getError().status.unwrap()).toBe(404);
  });

  it("stops reading a body larger than 10 MB", async () => {
    const result = await fetchListingImage(url("/huge.jpg"), {
      ...local,
      timeoutMs: 10_000,
    });

    expectFailure(result, "IMAGE_TOO_LARGE");
    const stream = await Promise.race([
      streamCancelled.then(() => "cancelled"),
      sleep(100).then(() => "still streaming"),
    ]);
    expect(stream).toBe("cancelled");
    expect(streamedBytes).toBeLessThan(ELEVEN_MB * 2);
  });

  it("refuses a page that is not an image", async () => {
    const result = await fetchListingImage(url("/page.jpg"), local);

    expectFailure(result, "IMAGE_INVALID");
  });

  it("gives up on a server that never answers", async () => {
    const started = performance.now();

    const result = await fetchListingImage(url("/hang.jpg"), local);

    expectFailure(result, "IMAGE_FETCH_FAILED");
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("gives up on a server that stalls in the middle of the body", async () => {
    const started = performance.now();

    const result = await fetchListingImage(url("/stalled.jpg"), local);

    expectFailure(result, "IMAGE_FETCH_FAILED");
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});

describe("fetchListingImages", () => {
  it("refuses more than 10 photos", async () => {
    const fetch = mock(networkFetch);
    const urls = Array.from({ length: 11 }, () => url("/photo.jpg"));

    const result = await fetchListingImages(urls, { ...local, fetch });

    expectFailure(result, "IMAGE_INVALID");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails with the failure of the one broken photo", async () => {
    const urls = [url("/photo.jpg"), url("/missing.jpg"), url("/photo.jpg")];

    const result = await fetchListingImages(urls, local);

    expectFailure(result, "IMAGE_FETCH_FAILED");
    expect(result.getError().status.unwrap()).toBe(404);
  });

  it("checks every URL before downloading any photo", async () => {
    const fetch = mock(networkFetch);
    const urls = [
      url("/photo.jpg"),
      "https://evil.com/a.jpg",
      url("/small.jpg"),
    ];

    const result = await fetchListingImages(urls, {
      allowedHost: (host) => host === "127.0.0.1",
      allowInsecure: true,
      fetch,
    });

    expectFailure(result, "IMAGE_HOST_FORBIDDEN");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns every photo in order", async () => {
    const result = await fetchListingImages(
      [url("/small.jpg"), url("/photo.jpg")],
      local,
    );

    const sides = await Promise.all(result.getValue().map(sideOf));
    expect(sides).toEqual([800, 1600]);
  });
});

describe("parseImageInput", () => {
  it("normalizes a base64 data URL", async () => {
    const input = `data:image/jpeg;base64,${Buffer.from(photo).toString("base64")}`;

    const result = await parseImageInput(input);

    expect(result.getValue().mimeType).toBe("image/webp");
  });

  it("refuses a decompression bomb", async () => {
    const bomb = await pngClaiming(16_000, 16_000);
    expect(
      (await sharp(bomb, { limitInputPixels: false }).metadata()).width,
    ).toBe(16_000);

    const result = await parseImageInput(
      `data:image/png;base64,${bomb.toString("base64")}`,
    );

    expectFailure(result, "IMAGE_INVALID");
    expect(result.getError().detail).toContain("pixel limit");
  });

  it("refuses a data URL above 10 MB before decoding it", async () => {
    const payload = "A".repeat(14 * 1024 * 1024);

    const result = await parseImageInput(`data:image/jpeg;base64,${payload}`);

    expectFailure(result, "IMAGE_TOO_LARGE");
  });

  it("refuses raw base64 without a data URL prefix", async () => {
    const result = await parseImageInput(Buffer.from(photo).toString("base64"));

    expectFailure(result, "IMAGE_INVALID");
  });

  it("fetches an image URL with the same host rules", async () => {
    const fetch = mock(networkFetch);

    const refused = await parseImageInput("http://localhost/x", { fetch });
    const fetched = await parseImageInput(url("/photo.jpg"), local);

    expectFailure(refused, "IMAGE_HOST_FORBIDDEN");
    expect(fetch).not.toHaveBeenCalled();
    expect(fetched.getValue().mimeType).toBe("image/webp");
  });
});
