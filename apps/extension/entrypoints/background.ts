import { browser, defineBackground } from "#imports";
import { createApiClient } from "@/lib/api/client";
import { createHandlers } from "@/lib/api/handlers";
import { analysisCache } from "@/lib/cache/analysis-cache";
import { onMessage } from "@/lib/messaging/protocol";
import { dailyCount } from "@/lib/storage/daily-count";
import { settings } from "@/lib/storage/settings";

function showCount(count: number): void {
  void browser.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

export default defineBackground(() => {
  const handlers = createHandlers({
    client: (baseUrl) => createApiClient(baseUrl),
    cache: analysisCache,
    settings,
    counter: dailyCount,
  });

  onMessage("analyze", ({ data }) => handlers.analyze(data));
  onMessage("getAnalysis", ({ data }) => handlers.getAnalysis(data));
  onMessage("changeStatus", ({ data }) => handlers.changeStatus(data));
  onMessage("regenerateNegotiation", ({ data }) =>
    handlers.regenerateNegotiation(data),
  );
  onMessage("deleteAnalysis", ({ data }) => handlers.deleteAnalysis(data));
  onMessage("exportAnalysis", ({ data }) => handlers.exportAnalysis(data));
  onMessage("listPortfolio", ({ data }) => handlers.listPortfolio(data));
  onMessage("portfolioStats", ({ data }) => handlers.portfolioStats(data));
  onMessage("listPresets", ({ data }) => handlers.listPresets(data));
  onMessage("editPhoto", ({ data }) => handlers.editPhoto(data));
  onMessage("suggestListing", ({ data }) => handlers.suggestListing(data));
  onMessage("checkBackend", ({ data }) => handlers.checkBackend(data));

  void dailyCount.current().then(showCount);
  dailyCount.watch(showCount);
});
