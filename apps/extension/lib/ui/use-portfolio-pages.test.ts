import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Reply } from "@/lib/api/failure";
import type { PortfolioDto, PortfolioQuery } from "@/lib/messaging/protocol";
import { queryWrapper } from "@/lib/ui/query-wrapper";
import { usePortfolioPages } from "./use-portfolio-pages";

function page(from: number, count: number, hasMore: boolean): PortfolioDto {
  return {
    items: Array.from({ length: count }, (_, index) => ({
      vintedId: String(from + index),
      url: `https://www.vinted.fr/items/${from + index}`,
      title: `Article ${from + index}`,
      price: 10,
      totalPrice: null,
      score: 7,
      marginPercent: 20,
      status: "WATCHING",
      imageUrl: null,
      analyzedAt: "2026-10-27T10:00:00.000Z",
    })),
    total: 60,
    hasMore,
  };
}

function renderPages(
  send: (query: PortfolioQuery) => Promise<Reply<PortfolioDto>>,
) {
  return renderHook(
    () =>
      usePortfolioPages({
        key: "watching",
        query: { status: "WATCHING" },
        send,
      }),
    { wrapper: queryWrapper() },
  );
}

describe("usePortfolioPages", () => {
  it("asks for the next 50 items once the user reaches the end of the list", async () => {
    const queries: PortfolioQuery[] = [];
    const send = async (
      query: PortfolioQuery,
    ): Promise<Reply<PortfolioDto>> => {
      queries.push(query);
      return {
        ok: true,
        data: query.offset === "0" ? page(0, 50, true) : page(50, 10, false),
      };
    };
    const { result } = renderPages(send);
    await waitFor(() => expect(result.current.items).toHaveLength(50));

    act(() => result.current.reached(10));
    expect(queries).toHaveLength(1);

    act(() => result.current.reached(49));
    await waitFor(() => expect(result.current.items).toHaveLength(60));

    act(() => result.current.reached(59));
    expect(queries).toEqual([
      { status: "WATCHING", limit: "50", offset: "0" },
      { status: "WATCHING", limit: "50", offset: "50" },
    ]);
  });

  it("keeps the loaded items and waits for a retry when the next page fails", async () => {
    const offsets: (string | string[] | undefined)[] = [];
    const send = async (
      query: PortfolioQuery,
    ): Promise<Reply<PortfolioDto>> => {
      offsets.push(query.offset);
      if (query.offset === "0") return { ok: true, data: page(0, 50, true) };

      return {
        ok: false,
        failure: { kind: "network", message: "Le serveur est injoignable." },
      };
    };
    const { result } = renderPages(send);
    await waitFor(() => expect(result.current.items).toHaveLength(50));

    act(() => result.current.reached(49));
    await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true));
    act(() => result.current.reached(49));

    expect(result.current.items).toHaveLength(50);
    expect(offsets).toEqual(["0", "50"]);
  });
});
