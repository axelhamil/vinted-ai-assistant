import { useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { settings } from "@/lib/storage/settings";
import { queryWrapper } from "./query-wrapper";
import { useSettings } from "./use-settings";

describe("useSettings", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("refetches what depends on the settings once they are saved", async () => {
    const readBackend = vi.fn(async () => "up");
    const { result } = renderHook(
      () => ({
        settings: useSettings(),
        backend: useQuery({ queryKey: ["backend"], queryFn: readBackend }),
      }),
      { wrapper: queryWrapper() },
    );
    await waitFor(() => expect(result.current.backend.isSuccess).toBe(true));
    await waitFor(() =>
      expect(result.current.settings.current.isSuccess).toBe(true),
    );

    await act(() =>
      result.current.settings.save.mutateAsync({
        backendUrl: "https://api.example.com",
      }),
    );

    await waitFor(() => expect(readBackend).toHaveBeenCalledTimes(2));
    expect(result.current.settings.current.data?.backendUrl).toBe(
      "https://api.example.com",
    );
    expect(await settings.getValue()).toMatchObject({
      backendUrl: "https://api.example.com",
    });
  });
});
