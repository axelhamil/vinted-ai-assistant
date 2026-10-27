import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { updateSettings } from "@/lib/storage/settings";
import { useSettings } from "./use-settings";

describe("useSettings", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("follows the extension being switched off and on from the popup", async () => {
    await updateSettings({ enabled: false });
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current?.enabled).toBe(false));

    await updateSettings({ enabled: true });

    await waitFor(() => expect(result.current?.enabled).toBe(true));
  });
});
