import { ANALYSIS_FRESH_FOR_MS } from "@packages/analysis/contract";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Reply } from "@/lib/api/failure";
import { createQueryClient, useBackground } from "./query";

interface Deferred {
  vintedId: string;
  resolve: (reply: Reply<string>) => void;
}

describe("useBackground", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("never shows the previous item once the item changes", async () => {
    const pending: Deferred[] = [];
    const send = (vintedId: string) =>
      new Promise<Reply<string>>((resolve) => {
        pending.push({ vintedId, resolve });
      });
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const { result, rerender } = renderHook(
      ({ vintedId }: { vintedId: string }) =>
        useBackground({
          key: ["analysis", vintedId],
          request: () => send(vintedId),
        }),
      { wrapper, initialProps: { vintedId: "1" } },
    );
    await waitFor(() => expect(pending).toHaveLength(1));
    pending[0]?.resolve({ ok: true, data: "analysis of 1" });
    await waitFor(() => expect(result.current.data).toBe("analysis of 1"));

    rerender({ vintedId: "2" });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[1]?.resolve({ ok: true, data: "analysis of 2" });
    await waitFor(() => expect(result.current.data).toBe("analysis of 2"));
  });

  it("turns a failed reply into the failure to show", async () => {
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(
      () =>
        useBackground<string>({
          key: ["analysis", "1"],
          request: () => Promise.reject(new Error("context invalidated")),
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.failure.kind).toBe("local");
  });

  it("asks again for an item seen longer ago than the analysis lifetime", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    let requests = 0;
    const client = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const render = () =>
      renderHook(
        () =>
          useBackground<number>({
            key: ["analysis", "1"],
            request: async () => {
              requests += 1;
              return { ok: true, data: requests };
            },
          }),
        { wrapper },
      );

    const first = render();
    await waitFor(() => expect(first.result.current.data).toBe(1));
    first.unmount();
    vi.advanceTimersByTime(ANALYSIS_FRESH_FOR_MS - 1);
    const fresh = render();
    expect(fresh.result.current.data).toBe(1);
    fresh.unmount();
    vi.advanceTimersByTime(2);
    const later = render();

    await waitFor(() => expect(later.result.current.data).toBe(2));
  });
});
