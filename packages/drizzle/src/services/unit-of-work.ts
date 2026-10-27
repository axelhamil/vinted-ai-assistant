import {
  EventCollector,
  type IDomainEvent,
  type IUnitOfWork,
  Result,
  UnitOfWorkContext,
} from "@packages/ddd-kit";
import { sql } from "drizzle-orm";
import type { Db, Transaction } from "../config";

export type FlushHandler = (
  events: IDomainEvent[],
  tx: Transaction,
) => Promise<void>;

class FailedResultRollback extends Error {
  constructor(readonly result: unknown) {
    super("unit of work rolled back: the work returned a failed Result");
  }
}

export class EventsWithoutOutbox extends Error {
  constructor(events: IDomainEvent[]) {
    super(
      `unit of work rolled back: ${events.map((e) => e.eventType).join(", ")} raised in a run that has no outbox would be lost`,
    );
  }
}

type EventsByFlushHandler = Map<FlushHandler | undefined, IDomainEvent[]>;

interface OutermostRun {
  rollbackOnly: boolean;
  failure?: unknown;
  pending: EventsByFlushHandler;
}

const outermostRuns = new WeakMap<Transaction, OutermostRun>();

export function resolveExecutor(database: Db): Db | Transaction {
  return UnitOfWorkContext.transaction<Transaction>() ?? database;
}

function isFailedResult(value: unknown): boolean {
  return value instanceof Result && value.isFailure;
}

function markRollbackOnly(
  outermost: OutermostRun | undefined,
  failure: unknown,
): void {
  if (!outermost || outermost.rollbackOnly) return;

  outermost.rollbackOnly = true;
  outermost.failure = failure;
}

function rollbackOf(failure: unknown): unknown {
  if (isFailedResult(failure)) return new FailedResultRollback(failure);

  return failure;
}

export class DrizzleUnitOfWork implements IUnitOfWork {
  constructor(
    private readonly database: Db,
    private readonly flushHandler?: FlushHandler,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const ambient = UnitOfWorkContext.transaction<Transaction>();
    if (ambient)
      return UnitOfWorkContext.run(ambient, () =>
        this.runNested(ambient, work),
      );

    try {
      return await this.database.transaction((tx) =>
        UnitOfWorkContext.run(tx, () => this.runOutermost(tx, work)),
      );
    } catch (error) {
      if (error instanceof FailedResultRollback) return error.result as T;

      throw error;
    }
  }

  private async runNested<T>(
    tx: Transaction,
    work: () => Promise<T>,
  ): Promise<T> {
    const outermost = outermostRuns.get(tx);
    let result: T;
    try {
      result = await work();
    } catch (error) {
      markRollbackOnly(outermost, error);
      throw error;
    }

    if (!isFailedResult(result)) {
      if (outermost) this.collect(outermost.pending);

      return result;
    }

    markRollbackOnly(outermost, result);
    throw new FailedResultRollback(result);
  }

  private async runOutermost<T>(
    tx: Transaction,
    work: () => Promise<T>,
  ): Promise<T> {
    const outermost: OutermostRun = { rollbackOnly: false, pending: new Map() };
    outermostRuns.set(tx, outermost);

    const result = await work();
    if (isFailedResult(result)) throw new FailedResultRollback(result);
    if (outermost.rollbackOnly) throw rollbackOf(outermost.failure);

    await tx.execute(sql`select 1`);
    this.collect(outermost.pending);
    await flush(outermost.pending, tx);

    return result;
  }

  private collect(pending: EventsByFlushHandler): void {
    const drained = EventCollector.drain();
    if (drained.length === 0) return;

    pending.set(this.flushHandler, [
      ...(pending.get(this.flushHandler) ?? []),
      ...drained,
    ]);
  }
}

async function flush(
  pending: EventsByFlushHandler,
  tx: Transaction,
): Promise<void> {
  for (const [flushHandler, events] of pending) {
    if (events.length === 0) continue;
    if (!flushHandler) throw new EventsWithoutOutbox(events);

    await flushHandler(events, tx);
  }
}
