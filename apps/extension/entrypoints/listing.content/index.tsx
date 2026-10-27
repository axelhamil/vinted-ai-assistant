import "@/assets/styles.css";
import { defineContentScript } from "#imports";
import { mountSidebar } from "@/lib/ui/mount-sidebar";
import { hostPatterns } from "@/lib/vinted/hosts";
import { App } from "./App";
import { createListingReader } from "./listing-reader";

const ITEM_PATH = /^\/items\/\d+/;

const onItemPaths = (patterns: string[]): string[] =>
  patterns.map((pattern) => pattern.replace(/\/\*$/, "/items/*"));

export default defineContentScript({
  matches: onItemPaths(hostPatterns(import.meta.env.MODE)),
  excludeMatches: onItemPaths(hostPatterns(import.meta.env.MODE)).map(
    (pattern) => pattern.replace(/\/items\/\*$/, "/items/new*"),
  ),
  allFrames: import.meta.env.MODE === "proof",
  cssInjectionMode: "ui",
  main(ctx) {
    mountSidebar(ctx, {
      id: "vinted-ai-sidebar",
      matches: (url) => ITEM_PATH.test(url.pathname),
      read: createListingReader({ doc: document }),
      App,
    });
  },
});
