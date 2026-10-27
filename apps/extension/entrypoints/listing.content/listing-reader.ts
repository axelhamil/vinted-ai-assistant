import type { AnalyzeInput } from "@/lib/messaging/protocol";
import { parseArticle, UNKNOWN } from "@/lib/vinted/article";
import { memberProfilePath, readSellerProfilePath } from "@/lib/vinted/seller";

export type ListingPage =
  | { kind: "ready"; listing: AnalyzeInput; sellerProfilePath: string | null }
  | { kind: "stale" };

export interface SidebarProps {
  vintedId: string;
  page: ListingPage;
}

interface ListingReaderOptions {
  doc: Document;
}

const sellerProfilePath = (doc: Document, username: string): string | null =>
  readSellerProfilePath(doc) ??
  (username === UNKNOWN ? null : memberProfilePath(username));

const showsSameListing = (
  previous: AnalyzeInput,
  current: AnalyzeInput,
): boolean =>
  previous.title === current.title &&
  previous.price === current.price &&
  previous.description === current.description;

export function createListingReader({ doc }: ListingReaderOptions) {
  let previous: AnalyzeInput | null = null;

  return (url: URL, lastAttempt: boolean): SidebarProps | null => {
    const article = parseArticle(doc, url);
    if (!article) return null;

    const listing = { ...article, forceRefresh: false };
    const stale =
      previous !== null &&
      previous.vintedId !== listing.vintedId &&
      showsSameListing(previous, listing);
    if (stale)
      return lastAttempt
        ? { vintedId: listing.vintedId, page: { kind: "stale" } }
        : null;

    previous = listing;

    return {
      vintedId: listing.vintedId,
      page: {
        kind: "ready",
        listing,
        sellerProfilePath: sellerProfilePath(doc, listing.seller.username),
      },
    };
  };
}
