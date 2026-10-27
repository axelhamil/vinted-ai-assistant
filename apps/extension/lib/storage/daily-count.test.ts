import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { dailyCount } from "./daily-count";

describe("daily count", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts again from zero on a new day", async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 23, 50));
    await dailyCount.increment();
    await dailyCount.increment();

    vi.setSystemTime(new Date(2026, 9, 28, 0, 10));

    expect(await dailyCount.current()).toBe(0);
    expect(await dailyCount.increment()).toBe(1);
  });

  it("counts every analysis that finishes at the same time", async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 12, 0));

    await Promise.all([dailyCount.increment(), dailyCount.increment()]);

    expect(await dailyCount.current()).toBe(2);
  });
});
