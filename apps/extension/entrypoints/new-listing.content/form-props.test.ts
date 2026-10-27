import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { settings } from "@/lib/storage/settings";
import { readListingFormProps } from "./form-props";

describe("readListingFormProps", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("still opens the listing form when the assistant is disabled", async () => {
    await settings.setValue({
      backendUrl: "http://localhost:3000",
      autoOpenSidebar: true,
      enabled: false,
    });

    expect(await readListingFormProps()).toEqual({ autoOpen: true });
  });

  it("keeps the sidebar closed when auto open is off", async () => {
    await settings.setValue({
      backendUrl: "http://localhost:3000",
      autoOpenSidebar: false,
      enabled: true,
    });

    expect(await readListingFormProps()).toEqual({ autoOpen: false });
  });
});
