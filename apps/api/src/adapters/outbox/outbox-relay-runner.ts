import type {
  IEventDispatcher,
  IInstrumentation,
  ILogger,
} from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import { DrizzleOutboxRepository } from "@packages/outbox/drizzle-outbox.repository";
import { OutboxListener } from "@packages/outbox/outbox-listener";
import {
  type DeadEvent,
  type EventRoutes,
  OutboxRelay,
} from "@packages/outbox/outbox-relay";
import type { OutboxTable } from "@packages/outbox/outbox-table";
import { startRelayLoop } from "@packages/outbox/relay-loop";

const LANES = { concurrency: 4, handlerBudgetSeconds: 25 };

export interface OutboxRelayRunnerDeps {
  db: Db;
  table: OutboxTable;
  dispatcher: IEventDispatcher;
  routes: EventRoutes;
  listenUrl: string;
  pollIntervalMs: number;
  logger: ILogger;
  instrumentation: IInstrumentation;
}

interface Running {
  listener: OutboxListener;
  stopLoop: () => Promise<void>;
}

export class OutboxRelayRunner {
  private running: Running | undefined;

  constructor(private readonly deps: OutboxRelayRunnerDeps) {}

  start(): void {
    if (this.running) return;

    const { db, table, dispatcher, routes, listenUrl, pollIntervalMs, logger } =
      this.deps;
    const listener = new OutboxListener({
      connectionString: listenUrl,
      logger,
    });
    const repository = new DrizzleOutboxRepository(db, table);
    const relay = new OutboxRelay(repository, dispatcher, routes, {
      lanes: LANES,
    });

    listener.start();
    const stopLoop = startRelayLoop(relay, {
      fallbackIntervalMs: pollIntervalMs,
      wakeSource: listener,
      onError: (error) => this.relayFailed(error),
      observer: {
        delivered: () => {},
        died: (outbox, event) => this.eventDied(outbox, event),
        pendingAged: () => {},
      },
    });
    this.running = { listener, stopLoop };

    logger.info(
      { outbox: relay.outbox, pollIntervalMs },
      "[Outbox] relay started",
    );
  }

  async stop(): Promise<void> {
    const running = this.running;
    this.running = undefined;
    if (!running) return;

    await running.stopLoop();
    await running.listener.close();
  }

  private relayFailed(error: unknown): void {
    this.deps.instrumentation.capture(error, {
      tags: { component: "outbox" },
    });
  }

  private eventDied(outbox: string, event: DeadEvent): void {
    this.deps.instrumentation.capture(
      new Error(
        `[Outbox] ${event.eventType} dead after ${event.attempts} attempts, retried every 6 h: ${event.lastError}`,
      ),
      { tags: { component: "outbox", outbox, eventType: event.eventType } },
    );
  }
}
