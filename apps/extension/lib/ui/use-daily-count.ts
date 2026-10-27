import { useQuery } from "@tanstack/react-query";
import { dailyCount } from "@/lib/storage/daily-count";

export function useDailyCount() {
  return useQuery({
    queryKey: ["daily-count"],
    queryFn: () => dailyCount.current(),
  });
}
