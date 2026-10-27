import { OPPORTUNITY_MIN_SCORE } from "@packages/analysis/contract";
import { useQuery } from "@tanstack/react-query";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { sendMessage } from "@/lib/messaging/protocol";
import { dailyCount } from "@/lib/storage/daily-count";
import { useBackground } from "@/lib/ui/query";

interface StatProps {
  label: string;
  value: number | undefined;
  pending: boolean;
}

function Stat({ label, value, pending }: StatProps) {
  return (
    <div className="flex flex-col">
      <dt className="fact-label">{label}</dt>
      <dd className="stat-value">
        {pending ? <Skeleton className="h-6 w-6" /> : value}
      </dd>
    </div>
  );
}

export function StatsRow() {
  const today = useQuery({
    queryKey: ["daily-count"],
    queryFn: () => dailyCount.current(),
  });
  const stats = useBackground({
    key: ["portfolio-stats"],
    request: () => sendMessage("portfolioStats", OPPORTUNITY_MIN_SCORE),
  });

  if (stats.isError && !stats.isFetching)
    return (
      <ErrorPanel
        message={stats.error.message}
        onRetry={() => void stats.refetch()}
      />
    );

  return (
    <dl className="flex justify-between px-gutter pb-stack">
      <Stat label="Aujourd'hui" value={today.data} pending={today.isPending} />
      <Stat
        label="Surveillance"
        value={stats.data?.watching}
        pending={stats.isPending}
      />
      <Stat
        label="Achats"
        value={stats.data?.bought}
        pending={stats.isPending}
      />
      <Stat
        label="Opportunités"
        value={stats.data?.opportunities}
        pending={stats.isPending}
      />
    </dl>
  );
}
