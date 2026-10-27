import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Reply } from "@/lib/api/failure";
import type { PortfolioDto, PortfolioQuery } from "@/lib/messaging/protocol";
import { type BackgroundFailure, unwrap } from "@/lib/ui/query";

export const PORTFOLIO_PAGE_SIZE = 50;

interface PortfolioPagesInput {
  key: string;
  query: PortfolioQuery;
  send: (query: PortfolioQuery) => Promise<Reply<PortfolioDto>>;
}

type PortfolioItem = PortfolioDto["items"][number];

export function usePortfolioPages({ key, query, send }: PortfolioPagesInput) {
  const pages = useInfiniteQuery<
    PortfolioDto,
    BackgroundFailure,
    PortfolioItem[],
    string[],
    number
  >({
    queryKey: ["portfolio", key],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      unwrap(() =>
        send({
          ...query,
          limit: String(PORTFOLIO_PAGE_SIZE),
          offset: String(pageParam),
        }),
      ),
    getNextPageParam: (last, all) =>
      last.hasMore ? all.length * PORTFOLIO_PAGE_SIZE : undefined,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
  const items = pages.data ?? [];
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = pages;
  const count = items.length;

  const reached = useCallback(
    (index: number): void => {
      const atEnd = index >= count - 1;
      const canFetch =
        hasNextPage && !isFetchingNextPage && !isFetchNextPageError;
      if (atEnd && canFetch) void fetchNextPage();
    },
    [
      count,
      hasNextPage,
      isFetchingNextPage,
      isFetchNextPageError,
      fetchNextPage,
    ],
  );

  return { ...pages, items, reached };
}
