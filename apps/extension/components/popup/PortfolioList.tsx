import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { PortfolioRow } from "@/components/popup/PortfolioRow";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { sendMessage } from "@/lib/messaging/protocol";
import type { PortfolioTab } from "@/lib/portfolio-tabs";
import { usePortfolioPages } from "@/lib/ui/use-portfolio-pages";

export interface PortfolioListProps {
  tab: PortfolioTab;
}

const ROW_HEIGHT = 80;

export function PortfolioList({ tab }: PortfolioListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const portfolio = usePortfolioPages({
    key: tab.id,
    query: tab.query,
    send: (query) => sendMessage("listPortfolio", query),
  });
  const { items, reached } = portfolio;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });
  const rows = virtualizer.getVirtualItems();
  const lastIndex = rows.at(-1)?.index;

  useEffect(() => {
    if (lastIndex !== undefined) reached(lastIndex);
  }, [lastIndex, reached]);

  if (portfolio.isPending)
    return (
      <div
        role="status"
        aria-label="Chargement"
        className="flex flex-col gap-row p-gutter"
      >
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  if (items.length === 0 && portfolio.isError)
    return (
      <ErrorPanel
        message={portfolio.error.message}
        onRetry={() => void portfolio.refetch()}
      />
    );

  if (items.length === 0)
    return <p className="popup-note p-gutter">{tab.empty}</p>;

  const pageError =
    portfolio.isError && !portfolio.isFetching ? portfolio.error : null;

  return (
    <>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {rows.map((row) => {
            const item = items[row.index];
            if (!item) return null;

            return (
              <li
                key={item.vintedId}
                className="absolute inset-x-0 top-0 h-20"
                style={{ transform: `translateY(${row.start}px)` }}
              >
                <PortfolioRow item={item} />
              </li>
            );
          })}
        </ul>
      </div>
      {pageError && (
        <ErrorPanel
          message={pageError.message}
          onRetry={() =>
            void (portfolio.isFetchNextPageError
              ? portfolio.fetchNextPage()
              : portfolio.refetch())
          }
        />
      )}
    </>
  );
}
