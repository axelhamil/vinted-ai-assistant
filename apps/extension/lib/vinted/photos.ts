import { readJsonLdProduct } from "./json-ld";

const SCRIPT_PHOTO =
  /"(?:full_size_url|url|image_url|photo_url|high_resolution\.url)"\s*:\s*"(https:\/\/[^"]*vinted\.net\/[^"]+)"/g;

const ESCAPED_AMPERSAND = /\\+u0026/g;

const ESCAPED_SLASH = /\\+\//g;

const ESCAPED_QUOTE = /\\+"/g;

const BACKGROUND_URL = /url\(["']?([^"')]+)["']?\)/;

const NOT_PHOTOS = ["avatar", "icon", "logo"];

const PHOTO_HOSTS = ["vinted.net", "vinted.com", "cloudfront", "cdn"];

const IMAGE_EXTENSION = /\.(jpg|jpeg|png|webp)/i;

const SIZE_PARAMS = ["w", "h"];

const GALLERY = [
  ".item-photos .item-thumbnail",
  ".item-thumbnail",
  '[data-testid="item-thumbnail"]',
  ".item-photos__thumbnails img",
  ".item-photos__thumbnail img",
  "section.item-photos__container",
  ".item-photos__container",
  ".item-photos",
  '[data-testid="item-photo-gallery"]',
  '[data-testid="item-photos"]',
  "figure.item-photo img.web_ui__Image__content",
  ".item-photo img.web_ui__Image__content",
  ".item-thumbnail img.web_ui__Image__content",
  '[data-testid^="item-photo-"] img',
];

const ANY_VINTED_IMAGE = 'img[src*="vinted"]';

const toPhoto = (raw: string): string | null => {
  if (!URL.canParse(raw)) return null;

  const url = new URL(raw);
  const isPhotoSource =
    PHOTO_HOSTS.some((host) => url.hostname.includes(host)) ||
    IMAGE_EXTENSION.test(url.pathname);
  const isPhoto =
    isPhotoSource && !NOT_PHOTOS.some((word) => url.pathname.includes(word));

  if (url.protocol !== "https:" || !isPhoto) return null;

  for (const param of SIZE_PARAMS) url.searchParams.delete(param);

  return url.href;
};

const unescapeScript = (content: string): string =>
  content
    .replace(ESCAPED_AMPERSAND, "&")
    .replace(ESCAPED_SLASH, "/")
    .replace(ESCAPED_QUOTE, '"');

const fromScripts = (doc: Document): string[] =>
  [...doc.querySelectorAll("script:not([src])")].flatMap((script) =>
    [
      ...unescapeScript(script.textContent ?? "").matchAll(SCRIPT_PHOTO),
    ].flatMap((match) => match[1] ?? []),
  );

const largestFromSrcset = (srcset: string | null): string | null => {
  const candidates = (srcset ?? "").split(",").map((entry) => {
    const [url = "", descriptor = ""] = entry.trim().split(/\s+/);

    return { url, width: Number.parseInt(descriptor, 10) || 1 };
  });
  const largest = candidates.sort((a, b) => b.width - a.width)[0];

  return largest?.url ? largest.url : null;
};

const sourcesOf = (image: Element): string[] =>
  [
    image.getAttribute("src"),
    image.getAttribute("data-src"),
    largestFromSrcset(image.getAttribute("srcset")),
  ].flatMap((source) => source ?? []);

const fromElement = (element: Element): string[] => {
  const images =
    element.tagName === "IMG"
      ? [element]
      : [...element.querySelectorAll("img")];
  const background = element.getAttribute("style")?.match(BACKGROUND_URL)?.[1];

  return [...images.flatMap(sourcesOf), ...(background ? [background] : [])];
};

const fromGallery = (doc: Document): string[] =>
  GALLERY.flatMap((selector) =>
    [...doc.querySelectorAll(selector)].flatMap(fromElement),
  );

const fromAnyImage = (doc: Document): string[] =>
  [...doc.querySelectorAll(ANY_VINTED_IMAGE)].flatMap(sourcesOf);

const uniquePhotos = (sources: string[]): string[] => [
  ...new Set(sources.flatMap((source) => toPhoto(source) ?? [])),
];

export const readPhotos = (doc: Document): string[] => {
  const photos = uniquePhotos([
    ...fromScripts(doc),
    ...(readJsonLdProduct(doc)?.images ?? []),
    ...fromGallery(doc),
  ]);

  return photos.length > 0 ? photos : uniquePhotos(fromAnyImage(doc));
};
