import { useInfiniteQuery } from "@tanstack/react-query";
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

  const reached = (index: number): void => {
    const atEnd = index >= items.length - 1;
    if (atEnd && pages.hasNextPage && !pages.isFetchingNextPage)
      void pages.fetchNextPage();
  };

  return { ...pages, items, reached };
}
