import type { PendingState } from "./drizzle-outbox.repository";
import type { DeadEvent, DrainObserver, DrainOutcome } from "./outbox-relay";

const FAILED_DRAIN_RETRY_MS = 2_000;
const EMPTY_DRAIN_FLOOR_MS = 50;

export interface DrainingRelay {
  readonly outbox: string;
  drainOnce(observer?: DrainObserver): Promise<DrainOutcome>;
  pendingState(): Promise<PendingState>;
}

export interface RelayWakeSource {
  subscribe(outbox: string, wake: () => void): () => void;
}

export interface RelayObserver {
  delivered(outbox: string, delaySeconds: number): void;
  died(outbox: string, event: DeadEvent): void;
  pendingAged(outbox: string, oldestPendingSeconds: number): void;
}

export interface RelayLoopOptions {
  fallbackIntervalMs: number;
  onError: (error: unknown) => void;
  wakeSource?: RelayWakeSource;
  observer?: RelayObserver;
}

export function startRelayLoop(
  relay: DrainingRelay,
  { fallbackIntervalMs, onError, wakeSource, observer }: RelayLoopOptions,
): () => Promise<void> {
  const { outbox } = relay;
  let stopped = false;
  let draining = false;
  let wakeRequested = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> = Promise.resolve();

  const drainThenPlanNextWake = async (): Promise<number> => {
    try {
      const { dispatched, ignored, failed } = await relay.drainOnce({
        delivered: (delaySeconds) => observer?.delivered(outbox, delaySeconds),
        died: (event) => observer?.died(outbox, event),
      });
      const { dueInMs, oldestPendingSeconds } = await relay.pendingState();
      observer?.pendingAged(outbox, oldestPendingSeconds);

      const floorMs =
        dispatched + ignored + failed === 0 ? EMPTY_DRAIN_FLOOR_MS : 0;
      const nextDueMs = Math.max(
        floorMs,
        Math.ceil(dueInMs.unwrapOr(fallbackIntervalMs)),
      );

      return Math.min(nextDueMs, fallbackIntervalMs);
    } catch (error) {
      onError(error);

      return Math.min(FAILED_DRAIN_RETRY_MS, fallbackIntervalMs);
    }
  };

  const drainUntilQuiet = async () => {
    let nextWakeMs = 0;

    do {
      wakeRequested = false;
      nextWakeMs = await drainThenPlanNextWake();
    } while (!stopped && (wakeRequested || nextWakeMs === 0));

    draining = false;
    if (!stopped) timer = setTimeout(wake, nextWakeMs);
  };

  const wake = () => {
    if (stopped) return;

    if (draining) {
      wakeRequested = true;
      return;
    }

    clearTimeout(timer);
    draining = true;
    inFlight = drainUntilQuiet();
  };

  const unsubscribe = wakeSource?.subscribe(outbox, wake);
  timer = setTimeout(wake, 0);

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe?.();

    return inFlight;
  };
}
