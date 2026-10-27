import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import {
  DEFAULT_SETTINGS,
  enabledSettings,
  normalizeBackendUrl,
  settings,
} from "./settings";

describe("settings", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("drops scoreThreshold from the legacy settings", async () => {
    await fakeBrowser.storage.local.set({
      vinted_ai_settings: {
        backendUrl: "http://x:1",
        scoreThreshold: 7,
        autoOpenSidebar: false,
        enabled: true,
      },
    });

    await settings.migrate();

    expect(await settings.getValue()).toEqual({
      backendUrl: "http://x:1",
      autoOpenSidebar: false,
      enabled: true,
    });
  });

  it.each([{}, { backendUrl: 42, enabled: "yes" }])(
    "falls back to the defaults for missing or invalid legacy fields in %o",
    async (legacy) => {
      await fakeBrowser.storage.local.set({ vinted_ai_settings: legacy });

      await settings.migrate();

      expect(await settings.getValue()).toEqual(DEFAULT_SETTINGS);
    },
  );

  it.each([
    ["localhost:3000/", null],
    ["http://localhost:3010/", "http://localhost:3010"],
    ["  https://api.example.com//  ", "https://api.example.com"],
    ["ftp://x", null],
  ])("normalizes the backend url %s to %s", (raw, expected) => {
    expect(normalizeBackendUrl(raw)).toBe(expected);
  });

  it("gives the sidebars nothing to mount when the assistant is disabled", async () => {
    await settings.setValue({ ...DEFAULT_SETTINGS, enabled: false });

    expect(await enabledSettings()).toBeNull();
  });

  it("gives the sidebars the stored settings when the assistant is enabled", async () => {
    await settings.setValue({ ...DEFAULT_SETTINGS, autoOpenSidebar: false });

    expect(await enabledSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      autoOpenSidebar: false,
    });
  });
});
