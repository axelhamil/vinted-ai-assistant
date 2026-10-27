import {
  type IDomainEvent,
  type IEventDispatcher,
  Option,
  type Result,
} from "@packages/ddd-kit";
import type {
  DrizzleOutboxRepository,
  OutboxRecord,
  PendingState,
} from "./drizzle-outbox.repository";
import type { OutboxDeliveries } from "./outbox-table";

export interface EventRoutes {
  handled: readonly string[];
  ignored: readonly string[];
}

export interface RelayLanes {
  concurrency: number;
  handlerBudgetSeconds: number;
}

export interface OutboxRelayOptions {
  batchSize?: number;
  maxAttempts?: number;
  leaseSeconds?: number;
  deadRetrySeconds?: number;
  lanes?: RelayLanes;
}

export interface DrainOutcome {
  dispatched: number;
  ignored: number;
  failed: number;
}

export interface DeadEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  attempts: number;
  lastError: string;
}

export interface DrainObserver {
  delivered(delaySeconds: number): void;
  died(event: DeadEvent): void;
}

interface Delivery {
  delivered: OutboxDeliveries;
  failures: string[];
}

interface NextAttempt {
  retryAt: Date;
  deadSince: Option<Date>;
}

const MAX_BACKOFF_SECONDS = 3600;
const DEAD_RETRY_SECONDS = 6 * 3600;

function toDomainEvent(record: OutboxRecord): IDomainEvent {
  return {
    eventId: record.id,
    eventType: record.eventType,
    aggregateId: record.aggregateId,
    payload: record.payload,
    dateOccurred: record.occurredAt,
  };
}

async function eachBounded<T>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lane = async () => {
    for (let item = items[next++]; item !== undefined; item = items[next++])
      await work(item);
  };
  const lanes = await Promise.allSettled(
    Array.from({ length: Math.min(limit, items.length) }, lane),
  );
  const failed = lanes.find((settled) => settled.status === "rejected");
  if (failed) throw failed.reason;
}

function claimLimitOf(
  batchSize: number,
  leaseSeconds: number,
  lanes: RelayLanes | undefined,
): number {
  if (!lanes) return batchSize;

  const roundsWithinLease = Math.max(
    1,
    Math.floor(leaseSeconds / lanes.handlerBudgetSeconds),
  );

  return Math.min(batchSize, roundsWithinLease * lanes.concurrency);
}

function unwrap<T>(result: Result<T>): T {
  if (result.isFailure) throw new Error(result.getError());

  return result.getValue();
}

export class OutboxRelay {
  readonly outbox: string;
  private readonly knownTypes: readonly string[];
  private readonly ignored: ReadonlySet<string>;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly leaseSeconds: number;
  private readonly deadRetrySeconds: number;
  private readonly concurrency: number;

  constructor(
    private readonly repository: DrizzleOutboxRepository,
    private readonly dispatcher: IEventDispatcher,
    routes: EventRoutes,
    {
      batchSize = 50,
      maxAttempts = 10,
      leaseSeconds = 120,
      deadRetrySeconds = DEAD_RETRY_SECONDS,
      lanes,
    }: OutboxRelayOptions = {},
  ) {
    this.outbox = repository.outbox;
    this.knownTypes = [...new Set([...routes.handled, ...routes.ignored])];
    this.ignored = new Set(routes.ignored);
    this.batchSize = claimLimitOf(batchSize, leaseSeconds, lanes);
    this.maxAttempts = maxAttempts;
    this.leaseSeconds = leaseSeconds;
    this.deadRetrySeconds = deadRetrySeconds;
    this.concurrency = Math.max(1, lanes?.concurrency ?? 1);
  }

  async drainOnce(observer?: DrainObserver): Promise<DrainOutcome> {
    const batch = unwrap(
      await this.repository.claim({
        limit: this.batchSize,
        eventTypes: this.knownTypes,
        leaseSeconds: this.leaseSeconds,
      }),
    );
    const outcome: DrainOutcome = { dispatched: 0, ignored: 0, failed: 0 };

    await eachBounded(batch, this.concurrency, (record) =>
      this.settle(record, outcome, observer),
    );

    return outcome;
  }

  async pendingState(): Promise<PendingState> {
    return unwrap(await this.repository.pendingState(this.knownTypes));
  }

  private async settle(
    record: OutboxRecord,
    outcome: DrainOutcome,
    observer?: DrainObserver,
  ): Promise<void> {
    if (this.ignored.has(record.eventType)) {
      unwrap(await this.repository.markDelivered(record, {}));
      outcome.ignored++;
      return;
    }

    const delivery = await this.deliver(record);

    if (delivery.failures.length === 0) {
      unwrap(await this.repository.markDelivered(record, delivery.delivered));
      outcome.dispatched++;
      observer?.delivered(
        Math.max(0, Date.now() - record.occurredAt.getTime()) / 1000,
      );
      return;
    }

    const lastError = delivery.failures.join("; ");
    const { retryAt, deadSince } = this.nextAttemptOf(record);

    unwrap(
      await this.repository.markFailed(record, {
        lastError,
        retryAt,
        deadSince,
        deliveries: delivery.delivered,
      }),
    );
    outcome.failed++;

    if (deadSince.isSome() && record.deadAt.isNone())
      observer?.died({
        id: record.id,
        eventType: record.eventType,
        aggregateId: record.aggregateId,
        attempts: record.attempts,
        lastError,
      });
  }

  private async deliver(record: OutboxRecord): Promise<Delivery> {
    const handlers = this.dispatcher.handlersOf(record.eventType);
    if (handlers.length === 0)
      return {
        delivered: {},
        failures: [`${record.eventType} has no subscriber in this process`],
      };

    const outcomes = await this.dispatcher.deliver(
      toDomainEvent(record),
      new Set(Object.keys(record.deliveries)),
    );
    const at = new Date().toISOString();

    return {
      delivered: Object.fromEntries(
        outcomes.filter(({ ok }) => ok).map(({ name }) => [name, at]),
      ),
      failures: outcomes.flatMap((handled) =>
        handled.ok ? [] : [`${handled.name}: ${handled.error}`],
      ),
    };
  }

  private nextAttemptOf(record: OutboxRecord): NextAttempt {
    const now = Date.now();
    const deadSince = record.deadAt.orElse(() =>
      record.attempts >= this.maxAttempts
        ? Option.some(new Date(now))
        : Option.none(),
    );
    const delaySeconds = deadSince.isSome()
      ? this.deadRetrySeconds
      : Math.min(2 ** record.attempts, MAX_BACKOFF_SECONDS);

    return { retryAt: new Date(now + delaySeconds * 1000), deadSince };
  }
}
