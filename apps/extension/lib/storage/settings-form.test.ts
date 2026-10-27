import { describe, expect, it } from "vitest";
import { parseSettingsForm } from "./settings-form";

describe("parseSettingsForm", () => {
  it("rejects a server address that is not http or https", () => {
    const result = parseSettingsForm({
      backendUrl: "ftp://x",
      autoOpenSidebar: true,
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Saisissez une adresse http ou https, par exemple http://localhost:3000.",
    });
  });

  it("keeps the address without its trailing slash", () => {
    const result = parseSettingsForm({
      backendUrl: " http://localhost:3010/ ",
      autoOpenSidebar: false,
    });

    expect(result).toEqual({
      ok: true,
      value: { backendUrl: "http://localhost:3010", autoOpenSidebar: false },
    });
  });
});
