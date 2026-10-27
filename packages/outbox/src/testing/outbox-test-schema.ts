import type { Db } from "@packages/drizzle/config";
import { sql } from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";
import { createOutboxTable } from "../outbox-table";

const TEST_OUTBOX_SCHEMAS = ["outbox_test", "outbox_test_notes"] as const;

export const clips = createOutboxTable(pgSchema("outbox_test"));
export const notes = createOutboxTable(pgSchema("outbox_test_notes"));

function outboxDdl(schema: string): string {
  return `
    create schema ${schema};
    create table ${schema}.outbox_event (
      id text primary key,
      event_type text not null,
      aggregate_id text not null,
      aggregate_type text not null,
      payload jsonb not null,
      metadata jsonb not null,
      occurred_at timestamp with time zone not null,
      dispatched_at timestamp with time zone,
      attempts integer not null default 0,
      last_error text,
      next_attempt_at timestamp with time zone,
      dead_at timestamp with time zone,
      deliveries jsonb not null default '{}'::jsonb,
      constraint outbox_event_deliveries_object check (jsonb_typeof(deliveries) = 'object')
    );
    create index outbox_event_pending_idx on ${schema}.outbox_event (occurred_at, id)
      where dispatched_at is null and dead_at is null;
    create index outbox_event_dead_retry_idx on ${schema}.outbox_event (next_attempt_at)
      where dispatched_at is null and dead_at is not null;
    create index outbox_event_dispatched_idx on ${schema}.outbox_event (dispatched_at)
      where dispatched_at is not null;
    create index outbox_event_dead_idx on ${schema}.outbox_event (dead_at)
      where dead_at is not null;
    create index outbox_event_aggregate_idx on ${schema}.outbox_event (aggregate_type, aggregate_id);
  `;
}

export async function createTestOutboxes(db: Db): Promise<void> {
  for (const schema of TEST_OUTBOX_SCHEMAS)
    await db.execute(sql.raw(outboxDdl(schema)));
}
