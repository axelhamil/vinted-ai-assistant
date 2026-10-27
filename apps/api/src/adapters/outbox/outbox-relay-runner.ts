import type { IInstrumentation, ILogger } from "@packages/ddd-kit";
import type { DeadEvent } from "@packages/outbox/outbox-relay";
import {
  type DrainingRelay,
  type RelayWakeSource,
  startRelayLoop,
} from "@packages/outbox/relay-loop";

export interface RelayListener extends RelayWakeSource {
  start(): void;
  close(): Promise<void>;
}

export interface OutboxRelayRunnerDeps {
  relay: DrainingRelay;
  listener: RelayListener;
  pollIntervalMs: number;
  logger: ILogger;
  instrumentation: IInstrumentation;
  startLoop?: typeof startRelayLoop;
}

export class OutboxRelayRunner {
  private stopLoop: (() => Promise<void>) | undefined;
  private failing = false;

  constructor(private readonly deps: OutboxRelayRunnerDeps) {}

  start(): void {
    if (this.stopLoop) return;

    const {
      relay,
      listener,
      pollIntervalMs,
      logger,
      startLoop = startRelayLoop,
    } = this.deps;

    listener.start();
    this.stopLoop = startLoop(relay, {
      fallbackIntervalMs: pollIntervalMs,
      wakeSource: listener,
      onError: (error) => this.drainFailed(error),
      observer: {
        delivered: () => {},
        died: (outbox, event) => this.eventDied(outbox, event),
        pendingAged: () => {
          this.failing = false;
        },
      },
    });

    logger.info(
      { outbox: relay.outbox, pollIntervalMs },
      "[Outbox] relay started",
    );
  }

  async stop(): Promise<void> {
    const stopLoop = this.stopLoop;
    if (!stopLoop) return;

    this.stopLoop = undefined;

    try {
      await stopLoop();
    } finally {
      await this.deps.listener.close();
    }
  }

  private drainFailed(error: unknown): void {
    this.deps.logger.error({ err: error }, "[Outbox] relay drain failed");
    if (this.failing) return;

    this.failing = true;
    this.deps.instrumentation.capture(error, {
      tags: { component: "outbox" },
    });
  }

  private eventDied(outbox: string, event: DeadEvent): void {
    this.deps.instrumentation.capture(
      new Error(
        `[Outbox] ${event.eventType} dead after ${event.attempts} attempts, retried every ${event.retryInSeconds / 3600} h: ${event.lastError}`,
      ),
      { tags: { component: "outbox", outbox, eventType: event.eventType } },
    );
  }
}
