import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./clone-database";

export function shortId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function databaseNow(): Promise<Date> {
  const { rows } = await db.execute<{ now: string }>(
    sql`select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as now`,
  );
  const [row] = rows;
  if (!row) throw new Error("now() returned no row");

  return new Date(row.now);
}

export function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

const LOCK_WAIT_ATTEMPTS = 200;
const LOCK_WAIT_DELAY_MS = 10;

export async function untilAStatementWaitsOnALock(): Promise<boolean> {
  for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt++) {
    const { rows } = await db.execute<{ waiting: number }>(
      sql`select count(*)::int as waiting from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`,
    );
    if ((rows[0]?.waiting ?? 0) > 0) return true;

    await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_DELAY_MS));
  }

  return false;
}
