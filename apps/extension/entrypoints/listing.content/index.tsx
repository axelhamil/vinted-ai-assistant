import "@/assets/styles.css";
import { defineContentScript } from "#imports";
import { DEFAULT_SETTINGS, settings } from "@/lib/storage/settings";
import { mountSidebar } from "@/lib/ui/mount-sidebar";
import { parseArticle, UNKNOWN } from "@/lib/vinted/article";
import { hostPatterns } from "@/lib/vinted/hosts";
import { memberProfilePath, readSellerProfilePath } from "@/lib/vinted/seller";
import { App, type SidebarProps } from "./App";

const ITEM_PATH = /^\/items\/\d+/;

const onItemPaths = (patterns: string[]): string[] =>
  patterns.map((pattern) => pattern.replace(/\/\*$/, "/items/*"));

const sellerProfilePath = (doc: Document, username: string): string | null =>
  readSellerProfilePath(doc) ??
  (username === UNKNOWN ? null : memberProfilePath(username));

export default defineContentScript({
  matches: onItemPaths(hostPatterns(import.meta.env.MODE)),
  excludeMatches: onItemPaths(hostPatterns(import.meta.env.MODE)).map(
    (pattern) => pattern.replace(/\/items\/\*$/, "/items/new*"),
  ),
  allFrames: import.meta.env.MODE === "proof",
  cssInjectionMode: "ui",
  async main(ctx) {
    const current = await settings.getValue().catch(() => DEFAULT_SETTINGS);
    if (!current.enabled) return;

    let previous: SidebarProps | null = null;

    const read = (url: URL): SidebarProps | null => {
      const article = parseArticle(document, url);
      if (!article) return null;

      const unchangedPage =
        previous !== null &&
        previous.vintedId !== article.vintedId &&
        previous.listing.title === article.title &&
        previous.listing.photos[0] === article.photos[0];
      if (unchangedPage) return null;

      previous = {
        vintedId: article.vintedId,
        listing: { ...article, forceRefresh: false },
        sellerProfilePath: sellerProfilePath(document, article.seller.username),
        autoOpen: current.autoOpenSidebar,
      };

      return previous;
    };

    mountSidebar(ctx, {
      id: "vinted-ai-sidebar",
      matches: (url) => ITEM_PATH.test(url.pathname),
      read,
      App,
    });
  },
});
