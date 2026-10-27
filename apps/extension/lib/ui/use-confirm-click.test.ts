import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIRM_WINDOW_MS, useConfirmClick } from "./use-confirm-click";

describe("useConfirmClick", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("confirms only on a second click within the window", () => {
    vi.useFakeTimers();
    const confirm = vi.fn();
    const { result } = renderHook(() => useConfirmClick(confirm));

    act(() => result.current.click());
    expect(result.current.armed).toBe(true);
    act(() => vi.advanceTimersByTime(CONFIRM_WINDOW_MS));
    expect(result.current.armed).toBe(false);
    act(() => result.current.click());
    expect(confirm).not.toHaveBeenCalled();

    act(() => result.current.click());

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(result.current.armed).toBe(false);
  });
});
