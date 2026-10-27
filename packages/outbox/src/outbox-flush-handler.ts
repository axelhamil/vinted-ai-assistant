import {
  domainEventToOutboxRow,
  type IDomainEvent,
  RequestContext,
} from "@packages/ddd-kit";
import type { FlushHandler } from "@packages/drizzle/unit-of-work";
import { sql } from "drizzle-orm";
import { OUTBOX_CHANNEL, type OutboxTable, outboxNameOf } from "./outbox-table";

function aggregateTypeOf(eventType: string): string {
  return eventType.split(".")[0] ?? eventType;
}

function toRow(event: IDomainEvent, source: string) {
  const { organizationId: _tenantless, ...row } = domainEventToOutboxRow(
    event,
    {
      source,
      aggregateType: aggregateTypeOf(event.eventType),
      requestId: RequestContext.current()
        .map(({ requestId }) => requestId)
        .toUndefined(),
    },
  );

  return row;
}

export function createOutboxFlushHandler(
  table: OutboxTable,
  source: string,
): FlushHandler {
  const outbox = outboxNameOf(table);

  return async (events, tx) => {
    await tx
      .insert(table)
      .values(events.map((event) => toRow(event, source)))
      .onConflictDoNothing({ target: table.id });
    await tx.execute(sql`select pg_notify(${OUTBOX_CHANNEL}, ${outbox})`);
  };
}
