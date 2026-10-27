import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Reply } from "@/lib/api/failure";
import { createQueryClient, useBackground } from "./query";

interface Deferred {
  vintedId: string;
  resolve: (reply: Reply<string>) => void;
}

describe("useBackground", () => {
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
});
