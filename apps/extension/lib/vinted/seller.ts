import { firstMatch, firstText, textOf } from "./dom";
import { languageForHost } from "./hosts";
import { parsePrice } from "./price";

interface SellerStats {
  rating: number | null;
  salesCount: number | null;
}

interface ProfileRequest {
  host: string;
  profilePath: string;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
}

const PROFILE_TIMEOUT_MS = 3000;

const MAX_RATING = 5;

const NO_STATS: SellerStats = { rating: null, salesCount: null };

const SELLER_CARD = ".web_ui__Card__card";

const SELLER_LINK = 'a[href*="/member/"]';

const USERNAMES = [
  `${SELLER_CARD} ${SELLER_LINK} [data-testid="profile-username"]`,
  '[data-testid="seller-username"]',
  '[data-testid="profile-username"]',
  ".user-info__name a",
];

const RATING_VALUES = [
  '[data-testid="user-rating"]',
  '[itemprop="ratingValue"]',
  ".user-rating",
  `${SELLER_LINK} .web_ui__Rating__rating .web_ui__Rating__label span`,
];

const RATING_LABELS = [`${SELLER_LINK} .web_ui__Rating__rating`];

const SALES = [
  '[data-testid="seller-sales-count"]',
  ".user-sales-count",
  ".sales-count",
  SELLER_CARD,
];

const PROFILE_PATH = /^\/member\/[^/?#]+$/;

const RATED_OUT_OF = /(\d+(?:[.,]\d+)?)\s*sur\s*\d+/i;

const SALES_COUNT = /(\d+)\s*vente/i;

const toRating = (text: string | null | undefined): number | null => {
  const rating = text ? parsePrice(text) : null;

  return rating !== null && rating <= MAX_RATING ? rating : null;
};

const readRating = (root: ParentNode): number | null =>
  firstMatch(root, RATING_VALUES, (element) =>
    toRating(element.getAttribute("content") ?? textOf(element)),
  ) ??
  firstMatch(root, RATING_LABELS, (element) =>
    toRating(element.getAttribute("aria-label")?.match(RATED_OUT_OF)?.[1]),
  );

const readSalesCount = (root: ParentNode): number | null =>
  firstMatch(root, SALES, (element) => {
    const count = textOf(element)?.match(SALES_COUNT)?.[1];

    return count ? Number.parseInt(count, 10) : null;
  });

export const readSellerStats = (root: ParentNode): SellerStats => ({
  rating: readRating(root),
  salesCount: readSalesCount(root),
});

export const readSellerUsername = (doc: Document): string | null =>
  firstText(doc, USERNAMES);

const profilePathOf = (link: Element | null): string | null => {
  const href = link?.getAttribute("href");
  if (!href) return null;

  const { pathname } = new URL(href, "https://www.vinted.fr");

  return PROFILE_PATH.test(pathname) ? pathname : null;
};

export const readSellerProfilePath = (doc: Document): string | null =>
  profilePathOf(doc.querySelector(`${SELLER_CARD} ${SELLER_LINK}`)) ??
  profilePathOf(doc.querySelector(SELLER_LINK));

export const memberProfilePath = (username: string): string =>
  `/member/${encodeURIComponent(username)}`;

export const fetchSellerProfile = async ({
  host,
  profilePath,
  fetchImpl,
  timeoutMs = PROFILE_TIMEOUT_MS,
}: ProfileRequest): Promise<SellerStats> => {
  if (languageForHost(host) === null || !PROFILE_PATH.test(profilePath))
    return NO_STATS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`https://${host}${profilePath}`, {
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) return NO_STATS;

    const html = await response.text();

    return readSellerStats(new DOMParser().parseFromString(html, "text/html"));
  } catch {
    return NO_STATS;
  } finally {
    clearTimeout(timer);
  }
};
