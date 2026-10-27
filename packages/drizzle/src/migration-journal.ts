import { readFileSync } from "node:fs";

export interface ShippedMigration {
  tag: string;
  when: number;
}

const JOURNAL = new URL("../migrations/meta/_journal.json", import.meta.url);

function isShippedMigration(entry: unknown): entry is ShippedMigration {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof Reflect.get(entry, "tag") === "string" &&
    typeof Reflect.get(entry, "when") === "number"
  );
}

let shipped: readonly ShippedMigration[] | undefined;

export function shippedMigrations(): readonly ShippedMigration[] {
  if (shipped) return shipped;

  const journal: unknown = JSON.parse(readFileSync(JOURNAL, "utf8"));
  const entries: unknown =
    typeof journal === "object" && journal !== null
      ? Reflect.get(journal, "entries")
      : [];
  shipped = (Array.isArray(entries) ? entries : [])
    .filter(isShippedMigration)
    .map(({ tag, when }) => ({ tag, when }))
    .sort((left, right) => left.when - right.when);

  return shipped;
}
