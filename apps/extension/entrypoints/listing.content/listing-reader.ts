import { parseArticle, UNKNOWN } from "@/lib/vinted/article";
import { memberProfilePath, readSellerProfilePath } from "@/lib/vinted/seller";
import type { SidebarProps } from "./App";

interface ListingReaderOptions {
  doc: Document;
  autoOpen: boolean;
}

const sellerProfilePath = (doc: Document, username: string): string | null =>
  readSellerProfilePath(doc) ??
  (username === UNKNOWN ? null : memberProfilePath(username));

export function createListingReader({ doc, autoOpen }: ListingReaderOptions) {
  let previous: SidebarProps | null = null;

  return (url: URL, lastAttempt: boolean): SidebarProps | null => {
    const article = parseArticle(doc, url);
    if (!article) return null;

    const previousPage =
      previous !== null &&
      previous.vintedId !== article.vintedId &&
      previous.listing.title === article.title &&
      previous.listing.photos[0] === article.photos[0];
    if (previousPage && !lastAttempt) return null;

    previous = {
      vintedId: article.vintedId,
      listing: { ...article, forceRefresh: false },
      sellerProfilePath: sellerProfilePath(doc, article.seller.username),
      autoOpen,
    };

    return previous;
  };
}
