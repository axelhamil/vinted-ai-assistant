import { db } from "@packages/testing/clone-database";
import { count, eq } from "drizzle-orm";
import { analyses, analysisOutbox } from "../../schemas/analysis";

export async function clearAnalyses(): Promise<void> {
  await db.delete(analyses);
  await db.delete(analysisOutbox);
}

export async function rowsFor(vintedId: string): Promise<number> {
  const [row] = await db
    .select({ rows: count() })
    .from(analyses)
    .where(eq(analyses.vintedId, vintedId));

  return row?.rows ?? 0;
}

export async function overwriteFacts(
  vintedId: string,
  facts: unknown,
): Promise<void> {
  await db
    .update(analyses)
    .set({ facts })
    .where(eq(analyses.vintedId, vintedId));
}
