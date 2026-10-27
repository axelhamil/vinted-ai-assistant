import "@/assets/styles.css";
import { defineContentScript } from "#imports";
import { enabledSettings } from "@/lib/storage/settings";
import { mountSidebar } from "@/lib/ui/mount-sidebar";
import { hostPatterns } from "@/lib/vinted/hosts";
import { App } from "./App";

const NEW_LISTING_PATHS = [
  "/items/new*",
  "/member/items/new*",
  "/members/*/items/new*",
];

const NEW_LISTING_PATH = /^(\/member|\/members\/[^/]+)?\/items\/new/;

const onNewListingPaths = (patterns: string[]): string[] =>
  patterns.flatMap((pattern) =>
    NEW_LISTING_PATHS.map((path) => pattern.replace(/\/\*$/, path)),
  );

export default defineContentScript({
  matches: onNewListingPaths(hostPatterns(import.meta.env.MODE)),
  allFrames: import.meta.env.MODE === "proof",
  cssInjectionMode: "ui",
  async main(ctx) {
    const current = await enabledSettings();
    if (!current) return;

    mountSidebar(ctx, {
      id: "vinted-ai-listing-form",
      matches: (url) => NEW_LISTING_PATH.test(url.pathname),
      read: () => ({ autoOpen: current.autoOpenSidebar }),
      App,
    });
  },
});
