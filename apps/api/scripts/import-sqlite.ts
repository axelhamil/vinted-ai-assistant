import type { Database } from "bun:sqlite";
import type { IAnalysisRepository } from "@packages/analysis/application/ports/analysis.repository.port";
import type { Analysis } from "@packages/analysis/domain/analysis.aggregate";
import { DrizzleAnalysisRepository } from "@packages/analysis/infrastructure/repositories/drizzle-analysis.repository";
import { createDb } from "@packages/drizzle/config";
import { parseDatabaseEnv } from "../common/env";
import { createJsonLogger } from "../common/logger";
import { createSentryInstrumentation } from "../src/adapters/instrumentation/sentry-instrumentation";
import { analysisFromLegacyRow, legacyVintedIdOf } from "./legacy-row";
import { readLegacyCopy } from "./legacy-source";

export interface ImportFailure {
  vintedId: string;
  reason: string;
}

export interface ImportReport {
  read: number;
  imported: number;
  skippedExisting: number;
  failed: ImportFailure[];
}

export interface ImportOptions {
  source: Database;
  repository: Pick<IAnalysisRepository, "findByVintedId" | "save">;
  dryRun: boolean;
}

const IMPORT_LOG_LEVEL = "warn";

type RowOutcome = "imported" | "skippedExisting" | ImportFailure;

async function importOne(
  analysis: Analysis,
  { repository, dryRun }: ImportOptions,
): Promise<RowOutcome> {
  const vintedId = analysis.get("listing").vintedId;
  const existing = await repository.findByVintedId(vintedId);
  if (existing.isFailure)
    return { vintedId: vintedId.value, reason: existing.getError() };
  if (existing.getValue().isSome()) return "skippedExisting";
  if (dryRun) return "imported";

  const saved = await repository.save(analysis);
  if (saved.isFailure)
    return { vintedId: vintedId.value, reason: saved.getError() };

  return "imported";
}

export async function importLegacy(
  options: ImportOptions,
): Promise<ImportReport> {
  const rows = options.source.query("SELECT * FROM analyses").all();
  const report: ImportReport = {
    read: rows.length,
    imported: 0,
    skippedExisting: 0,
    failed: [],
  };

  for (const row of rows) {
    const analysis = analysisFromLegacyRow(row);
    const outcome = analysis.isSuccess
      ? await importOne(analysis.getValue(), options)
      : { vintedId: legacyVintedIdOf(row), reason: analysis.getError() };

    if (outcome === "imported") report.imported += 1;
    else if (outcome === "skippedExisting") report.skippedExisting += 1;
    else report.failed.push(outcome);
  }

  return report;
}

async function main(args: string[]): Promise<number> {
  const path = args.find((arg) => !arg.startsWith("--"));
  if (!path) {
    process.stderr.write(
      "usage: bun scripts/import-sqlite.ts <legacy.db> [--dry-run]\n",
    );
    return 1;
  }

  const { readEnv } = await import("../common/read-env");
  const { DATABASE_URL } = readEnv(parseDatabaseEnv);
  const db = createDb(DATABASE_URL);
  const logger = createJsonLogger(IMPORT_LOG_LEVEL, process.stderr);
  const repository = new DrizzleAnalysisRepository(
    db,
    logger,
    createSentryInstrumentation(logger),
  );

  const imported = await readLegacyCopy(path, (source) =>
    importLegacy({ source, repository, dryRun: args.includes("--dry-run") }),
  ).finally(() => db.$client.end());
  if (imported.isFailure) {
    process.stderr.write(`import-sqlite: ${imported.getError()}\n`);

    return 1;
  }

  const report = imported.getValue();
  process.stdout.write(`${JSON.stringify(report)}\n`);

  return report.failed.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
