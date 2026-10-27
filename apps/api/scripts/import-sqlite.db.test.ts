import { beforeEach, describe, expect, it } from "bun:test";
import { DrizzleAnalysisRepository } from "@packages/analysis/infrastructure/repositories/drizzle-analysis.repository";
import { analyses, analysisOutbox } from "@packages/analysis/schemas/analysis";
import { clearAnalyses } from "@packages/analysis/testing/database";
import type { ILogger } from "@packages/ddd-kit";
import { db } from "@packages/testing/clone-database";
import { mockInstrumentation } from "@packages/testing/instrumentation-mock";
import { mockPort } from "@packages/testing/port-mock";
import { asc, eq } from "drizzle-orm";
import {
  createLegacyDatabase,
  LEGACY_ANALYZED_AT_SECONDS,
  legacyRow,
} from "./fixtures/legacy-schema";
import { importLegacy } from "./import-sqlite";

const repository = new DrizzleAnalysisRepository(
  db,
  mockPort<ILogger>(),
  mockInstrumentation(),
);

const CORRUPT_ID = "4000000004";

function givenLegacyPortfolio() {
  return createLegacyDatabase([
    legacyRow({ vinted_id: "1000000001" }),
    legacyRow({
      vinted_id: "2000000002",
      status: "WATCHING",
      analyzed_at: LEGACY_ANALYZED_AT_SECONDS + 3600,
    }),
    legacyRow({ vinted_id: "3000000003", status: "SOLD" }),
    legacyRow({ vinted_id: CORRUPT_ID, photos: "[not json" }),
  ]);
}

async function storedRows() {
  return db
    .select({
      vintedId: analyses.vintedId,
      status: analyses.status,
      title: analyses.title,
      analyzedAt: analyses.analyzedAt,
    })
    .from(analyses)
    .orderBy(asc(analyses.vintedId));
}

describe("the one-shot sqlite portfolio import", () => {
  beforeEach(() => clearAnalyses());

  it("imports the valid rows with their status and date and reports the corrupt one", async () => {
    const report = await importLegacy({
      source: givenLegacyPortfolio(),
      repository,
      dryRun: false,
    });

    expect(report.read).toBe(4);
    expect(report.imported).toBe(3);
    expect(report.skippedExisting).toBe(0);
    expect(report.failed.map((failure) => failure.vintedId)).toEqual([
      CORRUPT_ID,
    ]);
    expect(await storedRows()).toEqual([
      {
        vintedId: "1000000001",
        status: "ANALYZED",
        title: "Veste en jean Levi's",
        analyzedAt: new Date(LEGACY_ANALYZED_AT_SECONDS * 1000),
      },
      {
        vintedId: "2000000002",
        status: "WATCHING",
        title: "Veste en jean Levi's",
        analyzedAt: new Date((LEGACY_ANALYZED_AT_SECONDS + 3600) * 1000),
      },
      {
        vintedId: "3000000003",
        status: "SOLD",
        title: "Veste en jean Levi's",
        analyzedAt: new Date(LEGACY_ANALYZED_AT_SECONDS * 1000),
      },
    ]);
    expect(await db.select().from(analysisOutbox)).toEqual([]);
  });

  it("skips what is already in postgres on a second run and keeps an edited row", async () => {
    await importLegacy({
      source: givenLegacyPortfolio(),
      repository,
      dryRun: false,
    });
    await db
      .update(analyses)
      .set({ title: "Edited after import", status: "BOUGHT" })
      .where(eq(analyses.vintedId, "2000000002"));

    const report = await importLegacy({
      source: givenLegacyPortfolio(),
      repository,
      dryRun: false,
    });

    expect(report.imported).toBe(0);
    expect(report.skippedExisting).toBe(3);
    expect(report.failed).toHaveLength(1);
    const rows = await storedRows();
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({
      title: "Edited after import",
      status: "BOUGHT",
    });
    expect(await db.select().from(analysisOutbox)).toEqual([]);
  });

  it("writes nothing on a dry run", async () => {
    const report = await importLegacy({
      source: givenLegacyPortfolio(),
      repository,
      dryRun: true,
    });

    expect(report.imported).toBe(3);
    expect(report.failed).toHaveLength(1);
    expect(await storedRows()).toEqual([]);
  });
});
