import type { LanguageCode } from "@packages/ai/languages";
import type { AnalyzeInput } from "@/lib/messaging/protocol";
import { firstMatch, firstText, textOf } from "./dom";
import { type JsonLdProduct, readJsonLdProduct } from "./json-ld";
import { detectLanguage } from "./language";
import { readPhotos } from "./photos";
import { parsePrice } from "./price";
import { readSellerStats, readSellerUsername } from "./seller";

type ArticleInput = Omit<AnalyzeInput, "forceRefresh" | "language"> & {
  language: LanguageCode;
};

type RelativeUnit = "minutes" | "hours" | "days" | "weeks" | "months";

const MIN_PRICE = 0.01;

const MAX_PRICE = 10_000_000;

export const UNKNOWN = "Unknown";

const LISTING_ID = /\/items\/(\d+)/;

const TITLES = [
  '[data-testid="item-title"]',
  '[itemprop="name"]',
  "h1.web_ui__Text__text",
  ".item-title h1",
  "h1",
];

const PRICES = [
  '[data-testid="item-price"]',
  '[itemprop="price"]',
  ".item-price",
  ".web_ui__Text__text.web_ui__Text__heading",
];

const DESCRIPTIONS = [
  '[data-testid="item-description"]',
  '[itemprop="description"]',
  ".item-description",
  ".item-page-description",
];

const DETAILS = [
  ".item-details",
  ".item-attributes",
  '[data-testid="item-details"]',
];

const BRANDS = [
  '[data-testid="item-brand"]',
  '[itemprop="brand"]',
  ".item-brand",
  'a[href*="/brand/"]',
];

const SIZES = ['[data-testid="item-size"]', '[itemprop="size"]', ".item-size"];

const CONDITIONS = ['[data-testid="item-condition"]', ".item-condition"];

const DATES = ['[data-testid="item-date"]', ".item-date", "time[datetime]"];

const SHIPPING = [
  '[data-testid="item-shipping-banner-price"]',
  '[data-testid="item-shipping-price"]',
  '[data-testid="shipping-price"]',
  ".item-shipping-info",
  ".item-shipping-price",
];

const TOTAL_PRICE_BUTTON = 'button[aria-label*="Protection acheteurs"]';

const SERVICE_FEE_TITLE = '[data-testid="service-fee-included-title"]';

const FREE_SHIPPING = [
  "gratuit",
  "free",
  "offert",
  "inclus",
  "livraison gratuite",
  "frais de port offerts",
  "envoi gratuit",
];

const DETAILS_SHIPPING = /(?:livraison|envoi|frais)\s*:?\s*(\d+[.,]?\d*)\s*€/i;

const SCHEMA_CONDITIONS: Record<string, string> = {
  "https://schema.org/NewCondition": "Neuf avec étiquette",
  "https://schema.org/UsedCondition": "Bon état",
  NewCondition: "Neuf avec étiquette",
  UsedCondition: "Bon état",
};

const RELATIVE_AGES: { pattern: RegExp; unit: RelativeUnit }[] = [
  { pattern: /il y a (\d+)\s*minute/i, unit: "minutes" },
  { pattern: /il y a (\d+)\s*heure/i, unit: "hours" },
  { pattern: /il y a (\d+)\s*jour/i, unit: "days" },
  { pattern: /il y a (\d+)\s*semaine/i, unit: "weeks" },
  { pattern: /il y a (\d+)\s*mois/i, unit: "months" },
];

const inRange = (amount: number | null, min: number): number | null =>
  amount !== null && amount >= min && amount <= MAX_PRICE ? amount : null;

const positive = (amount: number | null): number | null =>
  amount !== null && amount > 0 ? amount : null;

const detailsText = (doc: Document): string =>
  DETAILS.map((selector) => doc.querySelector(selector)?.textContent).find(
    Boolean,
  ) ?? "";

const fromDetails = (doc: Document, label: string): string | null =>
  detailsText(doc)
    .match(new RegExp(`${label}\\s*:?\\s*(.+?)(?:\\n|$)`, "i"))?.[1]
    ?.trim() || null;

const readPrice = (
  doc: Document,
  product: JsonLdProduct | null,
): number | null =>
  firstMatch(doc, PRICES, (element) =>
    positive(
      parsePrice(element.getAttribute("content") ?? textOf(element) ?? ""),
    ),
  ) ?? positive(parsePrice(product?.price ?? ""));

const readTotalPrice = (doc: Document): number | null => {
  const label = doc
    .querySelector(TOTAL_PRICE_BUTTON)
    ?.getAttribute("aria-label");
  const feeTitle = doc
    .querySelector(SERVICE_FEE_TITLE)
    ?.closest("button")
    ?.querySelector(".web_ui__Text__title");

  return parsePrice(label ?? "") ?? parsePrice(textOf(feeTitle) ?? "");
};

const isFree = (text: string): boolean =>
  FREE_SHIPPING.some((keyword) => text.toLowerCase().includes(keyword));

const readShippingCost = (doc: Document): number | null => {
  const banner = firstText(doc, SHIPPING);

  if (banner) return isFree(banner) ? null : parsePrice(banner);

  const details = detailsText(doc);
  const cost = details.match(DETAILS_SHIPPING)?.[1];

  return cost ? parsePrice(cost) : null;
};

const readCondition = (
  doc: Document,
  product: JsonLdProduct | null,
): string => {
  const schemaCondition = product?.condition;

  return (
    firstText(doc, CONDITIONS) ??
    (schemaCondition
      ? (SCHEMA_CONDITIONS[schemaCondition] ?? schemaCondition)
      : null) ??
    fromDetails(doc, "État") ??
    UNKNOWN
  );
};

const subtractAge = (now: Date, unit: RelativeUnit, value: number): Date => {
  const date = new Date(now);

  switch (unit) {
    case "minutes":
      date.setUTCMinutes(date.getUTCMinutes() - value);
      break;
    case "hours":
      date.setUTCHours(date.getUTCHours() - value);
      break;
    case "days":
      date.setUTCDate(date.getUTCDate() - value);
      break;
    case "weeks":
      date.setUTCDate(date.getUTCDate() - value * 7);
      break;
    case "months":
      date.setUTCMonth(date.getUTCMonth() - value);
      break;
  }

  return date;
};

const parseRelativeAge = (text: string): Date | null => {
  for (const { pattern, unit } of RELATIVE_AGES) {
    const value = text.match(pattern)?.[1];

    if (value) return subtractAge(new Date(), unit, Number.parseInt(value, 10));
  }

  return null;
};

const toIso = (date: Date | null): string | null =>
  date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;

const readListedAt = (
  doc: Document,
  product: JsonLdProduct | null,
): string | null => {
  const posted = product?.datePosted;
  const postedAt = posted ? toIso(new Date(posted)) : null;

  return (
    postedAt ??
    firstMatch(doc, DATES, (element) => {
      const datetime = element.getAttribute("datetime");

      return toIso(
        datetime ? new Date(datetime) : parseRelativeAge(textOf(element) ?? ""),
      );
    })
  );
};

export const parseArticle = (doc: Document, url: URL): ArticleInput | null => {
  const vintedId = url.pathname.match(LISTING_ID)?.[1];
  const product = readJsonLdProduct(doc);
  const title = firstText(doc, TITLES);
  const price = inRange(readPrice(doc, product), MIN_PRICE);
  const photos = vintedId ? readPhotos(doc, vintedId) : [];

  if (!vintedId || !title || price === null || photos.length === 0) return null;

  return {
    vintedId,
    url: `${url.origin}${url.pathname}`,
    title,
    description: firstText(doc, DESCRIPTIONS) ?? product?.description ?? "",
    price,
    totalPrice: inRange(readTotalPrice(doc), MIN_PRICE),
    shippingCost: inRange(readShippingCost(doc), 0),
    brand:
      firstText(doc, BRANDS) ?? product?.brand ?? fromDetails(doc, "Marque"),
    size: firstText(doc, SIZES) ?? fromDetails(doc, "Taille"),
    condition: readCondition(doc, product),
    photos,
    listedAt: readListedAt(doc, product),
    seller: {
      username: readSellerUsername(doc) ?? UNKNOWN,
      ...readSellerStats(doc),
    },
    language: detectLanguage({
      hostname: url.hostname,
      htmlLang: doc.documentElement.lang,
      browserLang: doc.defaultView?.navigator.language ?? navigator.language,
    }),
  };
};
