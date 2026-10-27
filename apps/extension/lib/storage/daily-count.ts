import { storage } from "#imports";

interface DailyCount {
  date: string;
  count: number;
}

const item = storage.defineItem<DailyCount>("local:vinted_ai_daily", {
  fallback: { date: "", count: 0 },
});

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function countFor(stored: DailyCount): number {
  return stored.date === today() ? stored.count : 0;
}

let lastIncrement: Promise<unknown> = Promise.resolve();

export const dailyCount = {
  async current(): Promise<number> {
    return countFor(await item.getValue());
  },

  increment(): Promise<number> {
    const increment = lastIncrement.then(async () => {
      const count = countFor(await item.getValue()) + 1;
      await item.setValue({ date: today(), count });

      return count;
    });
    lastIncrement = increment.catch(() => undefined);

    return increment;
  },

  watch(onChange: (count: number) => void): () => void {
    return item.watch((stored) => onChange(countFor(stored)));
  },
};

export type DailyCounter = Pick<typeof dailyCount, "increment">;
