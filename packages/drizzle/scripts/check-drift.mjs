import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "vinted-drift-"));
const out = join(work, "migrations");
const tempConfig = join(work, "drizzle.drift.config.json");

function sqlFiles() {
  return readdirSync(out).filter((name) => name.endsWith(".sql")).length;
}

function finish(code, message) {
  rmSync(work, { recursive: true, force: true });
  (code === 0 ? process.stdout : process.stderr).write(`${message}\n`);
  process.exit(code);
}

function setting(source, key) {
  return source.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
}

function listSetting(source, key) {
  const value = source.match(
    new RegExp(`\\b${key}:\\s*(\\[[^\\]]*\\]|"[^"]+")`),
  )?.[1];
  const items = [...(value ?? "").matchAll(/"([^"]+)"/g)].map(
    ([, item]) => item,
  );

  return items.length > 0 ? items : undefined;
}

const source = readFileSync(join(root, "drizzle.config.ts"), "utf8");
const schema = listSetting(source, "schema");
const schemaFilter = listSetting(source, "schemaFilter");
const dialect = setting(source, "dialect");

if (
  !schema ||
  !schemaFilter ||
  !dialect ||
  setting(source, "out") !== "./migrations"
)
  finish(
    1,
    "Schema drift check: schema, schemaFilter, out or dialect was not found in drizzle.config.ts.",
  );

const migrations = join(root, "migrations");
const journal = JSON.parse(
  readFileSync(join(migrations, "meta", "_journal.json"), "utf8"),
);
const journalTags = journal.entries.map((entry) => entry.tag).sort();
const sqlTags = readdirSync(migrations)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => name.slice(0, -".sql".length))
  .sort();
const snapshots = readdirSync(join(migrations, "meta")).filter((name) =>
  name.endsWith("_snapshot.json"),
).length;

if (journalTags.join() !== sqlTags.join() || snapshots !== journalTags.length)
  finish(
    1,
    `Schema drift check: the journal (${journalTags.length} entries), the .sql files (${sqlTags.length}) and the snapshots (${snapshots}) of migrations/ do not match one to one. A migration was added or removed by hand.`,
  );

cpSync(migrations, out, { recursive: true });
writeFileSync(
  tempConfig,
  JSON.stringify({ schema, schemaFilter, dialect, out: relative(root, out) }),
);

const before = sqlFiles();
const run = spawnSync(
  "pnpm",
  ["exec", "drizzle-kit", "generate", `--config=${tempConfig}`],
  {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  },
);
const after = sqlFiles();
const output = `${run.stdout}${run.stderr}`;

if (run.error)
  finish(
    1,
    `Schema drift check: drizzle-kit did not finish in 60 s (${run.error.message}).`,
  );
if (run.status !== 0) finish(run.status ?? 1, output);
if (after !== before)
  finish(
    1,
    "Schema drift: the schema differs from the migrations. Run pnpm --filter @packages/drizzle db:generate and commit the migration.",
  );
if (!output.includes("nothing to migrate"))
  finish(
    1,
    `Schema drift check: drizzle-kit did not conclude (a rename question, or an error it reports with exit code 0). Run pnpm --filter @packages/drizzle db:generate in a terminal.\n${output}`,
  );

finish(0, "No schema drift.");
