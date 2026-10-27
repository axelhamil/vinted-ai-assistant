import { Option, Result } from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import { and, eq, inArray, isNotNull, isNull, min, sql } from "drizzle-orm";
import {
  type OutboxDeliveries,
  type OutboxTable,
  outboxNameOf,
} from "./outbox-table";

export interface OutboxRecord {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: unknown;
  occurredAt: Date;
  attempts: number;
  deadAt: Option<Date>;
  deliveries: OutboxDeliveries;
}

export type OutboxLease = Pick<OutboxRecord, "id" | "attempts">;

export interface DeliveryFailure {
  lastError: string;
  retryAt: Date;
  deadSince: Option<Date>;
  deliveries: OutboxDeliveries;
}

export interface PendingState {
  dueInMs: Option<number>;
  oldestPendingSeconds: number;
}

export interface ClaimRequest {
  limit: number;
  eventTypes: readonly string[];
  leaseSeconds: number;
}

function unavailable(error: unknown): string {
  const cause = error instanceof Error ? error.message : String(error);

  return `outbox_unavailable: ${cause}`;
}

interface ClaimedRow extends Record<string, unknown> {
  id: string;
  event_type: string;
  aggregate_id: string;
  payload: unknown;
  occurred_at: Date | string;
  attempts: number;
  dead_at: Date | string | null;
  deliveries: OutboxDeliveries;
}

function toRecord(row: ClaimedRow): OutboxRecord {
  return {
    id: row.id,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at),
    attempts: Number(row.attempts),
    deadAt: Option.fromNullable(row.dead_at).map((at) => new Date(at)),
    deliveries: row.deliveries,
  };
}

export class DrizzleOutboxRepository {
  readonly outbox: string;

  constructor(
    private readonly db: Db,
    private readonly table: OutboxTable,
  ) {
    this.outbox = outboxNameOf(table);
  }

  async claim({
    limit,
    eventTypes,
    leaseSeconds,
  }: ClaimRequest): Promise<Result<OutboxRecord[]>> {
    if (eventTypes.length === 0) return Result.ok([]);

    const t = this.table;
    const types = sql.join(
      eventTypes.map((type) => sql`${type}`),
      sql`, `,
    );

    try {
      const { rows } = await this.db.execute<ClaimedRow>(sql`
        with live as (
          select id, dead_at, occurred_at from ${t}
          where dispatched_at is null and dead_at is null
            and event_type in (${types})
            and (next_attempt_at is null or next_attempt_at <= now())
          order by occurred_at, id
          limit ${limit}
          for update skip locked
        ), dead as (
          select id, dead_at, occurred_at from ${t}
          where dispatched_at is null and dead_at is not null
            and event_type in (${types})
            and next_attempt_at <= now()
          order by next_attempt_at
          limit ${limit}
          for update skip locked
        ), due as (
          select * from live
          union all
          select * from dead
          order by occurred_at, id
          limit ${limit}
        )
        update ${t} as leased
        set next_attempt_at = now() + make_interval(secs => ${leaseSeconds}),
          attempts = leased.attempts + 1,
          dead_at = null
        from due
        where leased.id = due.id
        returning leased.id, leased.event_type, leased.aggregate_id,
          leased.payload, leased.occurred_at, leased.attempts, due.dead_at,
          leased.deliveries`);

      return Result.ok(
        rows
          .map(toRecord)
          .sort(
            (a, b) =>
              a.occurredAt.getTime() - b.occurredAt.getTime() ||
              a.id.localeCompare(b.id),
          ),
      );
    } catch (error) {
      return Result.fail(unavailable(error));
    }
  }

  async pendingState(
    eventTypes: readonly string[],
  ): Promise<Result<PendingState>> {
    const t = this.table;
    const live = and(isNull(t.dispatchedAt), isNull(t.deadAt));

    try {
      const [next] =
        eventTypes.length === 0
          ? []
          : await this.db
              .select({
                dueInMs: sql<number>`greatest(0, extract(epoch from (min(coalesce(${t.nextAttemptAt}, clock_timestamp())) - clock_timestamp())) * 1000)`,
                waiting: sql<number>`count(*)`,
              })
              .from(t)
              .where(and(live, inArray(t.eventType, [...eventTypes])));
      const [dead] =
        eventTypes.length === 0
          ? []
          : await this.db
              .select({
                dueInMs: sql<
                  number | null
                >`extract(epoch from (${min(t.nextAttemptAt)} - clock_timestamp())) * 1000`,
              })
              .from(t)
              .where(
                and(
                  isNull(t.dispatchedAt),
                  isNotNull(t.deadAt),
                  inArray(t.eventType, [...eventTypes]),
                ),
              );
      const [oldest] = await this.db
        .select({
          seconds: sql<number>`coalesce(extract(epoch from (clock_timestamp() - min(${t.occurredAt}))), 0)`,
        })
        .from(t)
        .where(live);
      const liveDue =
        next && Number(next.waiting) > 0
          ? Option.some(Number(next.dueInMs))
          : Option.none<number>();
      const deadDue = Option.fromNullable(dead?.dueInMs).map((ms) =>
        Math.max(0, Number(ms)),
      );

      return Result.ok({
        dueInMs: liveDue
          .map((ms) => Math.min(ms, deadDue.unwrapOr(ms)))
          .or(deadDue),
        oldestPendingSeconds: Math.max(0, Number(oldest?.seconds ?? 0)),
      });
    } catch (error) {
      return Result.fail(unavailable(error));
    }
  }

  private merged(deliveries: OutboxDeliveries) {
    return sql`${this.table.deliveries} || ${JSON.stringify(deliveries)}::jsonb`;
  }

  private leased({ id, attempts }: OutboxLease) {
    const t = this.table;

    return and(eq(t.id, id), eq(t.attempts, attempts), isNull(t.dispatchedAt));
  }

  async markDelivered(
    lease: OutboxLease,
    deliveries: OutboxDeliveries,
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(this.table)
        .set({
          dispatchedAt: sql`now()`,
          nextAttemptAt: null,
          deadAt: null,
          deliveries: this.merged(deliveries),
        })
        .where(this.leased(lease));

      return Result.ok();
    } catch (error) {
      return Result.fail(unavailable(error));
    }
  }

  async markFailed(
    lease: OutboxLease,
    { lastError, retryAt, deadSince, deliveries }: DeliveryFailure,
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(this.table)
        .set({
          lastError,
          nextAttemptAt: retryAt,
          deadAt: deadSince.toNull(),
          deliveries: this.merged(deliveries),
        })
        .where(this.leased(lease));

      return Result.ok();
    } catch (error) {
      return Result.fail(unavailable(error));
    }
  }
}
