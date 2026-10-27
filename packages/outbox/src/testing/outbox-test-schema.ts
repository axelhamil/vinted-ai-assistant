import type { Db } from "@packages/drizzle/config";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { sql } from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";
import { createOutboxTable } from "../outbox-table";

const clipsSchema = pgSchema("outbox_test");
const notesSchema = pgSchema("outbox_test_notes");

export const clips = createOutboxTable(clipsSchema);
export const notes = createOutboxTable(notesSchema);

export async function createTestOutboxes(db: Db): Promise<void> {
  const statements = await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson({ clipsSchema, notesSchema, clips, notes }),
  );

  for (const statement of statements) await db.execute(sql.raw(statement));
}
