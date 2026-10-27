import { sql } from "drizzle-orm";
import {
  check,
  getTableConfig,
  index,
  integer,
  jsonb,
  type PgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export interface OutboxEventMetadata {
  specversion: "1.0";
  source: string;
  subject?: string;
  traceparent?: string;
  requestId?: string;
  datacontenttype: "application/json";
}

export type OutboxDeliveries = Readonly<Record<string, string>>;

export function createOutboxTable(schema: PgSchema) {
  return schema.table(
    "outbox_event",
    {
      id: text("id").primaryKey(),
      eventType: text("event_type").notNull(),
      aggregateId: text("aggregate_id").notNull(),
      aggregateType: text("aggregate_type").notNull(),
      payload: jsonb("payload").$type<unknown>().notNull(),
      metadata: jsonb("metadata").$type<OutboxEventMetadata>().notNull(),
      occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
      dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
      attempts: integer("attempts").notNull().default(0),
      lastError: text("last_error"),
      nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
      deadAt: timestamp("dead_at", { withTimezone: true }),
      deliveries: jsonb("deliveries")
        .$type<OutboxDeliveries>()
        .notNull()
        .default({}),
    },
    (table) => [
      check(
        "outbox_event_deliveries_object",
        sql`jsonb_typeof(${table.deliveries}) = 'object'`,
      ),
      index("outbox_event_pending_idx")
        .on(table.occurredAt, table.id)
        .where(sql`${table.dispatchedAt} is null and ${table.deadAt} is null`),
      index("outbox_event_dead_retry_idx")
        .on(table.nextAttemptAt)
        .where(
          sql`${table.dispatchedAt} is null and ${table.deadAt} is not null`,
        ),
      index("outbox_event_dispatched_idx")
        .on(table.dispatchedAt)
        .where(sql`${table.dispatchedAt} is not null`),
      index("outbox_event_dead_idx")
        .on(table.deadAt)
        .where(sql`${table.deadAt} is not null`),
      index("outbox_event_aggregate_idx").on(
        table.aggregateType,
        table.aggregateId,
      ),
    ],
  );
}

export type OutboxTable = ReturnType<typeof createOutboxTable>;

export const OUTBOX_CHANNEL = "vinted_outbox";

export function outboxNameOf(table: OutboxTable): string {
  return getTableConfig(table).schema ?? "public";
}
