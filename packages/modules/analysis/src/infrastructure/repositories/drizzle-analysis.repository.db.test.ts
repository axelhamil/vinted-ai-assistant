import { beforeEach, describe, expect, it } from "bun:test";
import { type ILogger, Option } from "@packages/ddd-kit";
import { db } from "@packages/testing/clone-database";
import { mockInstrumentation } from "@packages/testing/instrumentation-mock";
import { mockPort } from "@packages/testing/port-mock";
import { Analysis } from "../../domain/analysis.aggregate";
import {
  AnalysisStatus,
  type AnalysisStatusValue,
} from "../../domain/value-objects/analysis-status.vo";
import { Margin } from "../../domain/value-objects/margin.vo";
import { Score } from "../../domain/value-objects/score.vo";
import { VintedId } from "../../domain/value-objects/vinted-id.vo";
import {
  ANALYZED_AT,
  analysisInput,
  buildAnalysis,
  buildListing,
  buildNegotiation,
  propsOf,
} from "../../testing/analysis.factory";
import { clearAnalyses, overwriteFacts, rowsFor } from "../../testing/database";
import { DrizzleAnalysisRepository } from "./drizzle-analysis.repository";

const logger = mockPort<ILogger>();
const repository = new DrizzleAnalysisRepository(
  db,
  logger,
  mockInstrumentation(),
);
const HOUR_MS = 3_600_000;

interface StoredOptions {
  vintedId: string;
  score?: number;
  status?: AnalysisStatusValue;
  hoursAgo?: number;
}

function analysisOf(options: StoredOptions): Analysis {
  const built = buildAnalysis({
    listing: buildListing({ vintedId: options.vintedId }),
    status: options.status,
  });
  const props = propsOf(built);

  return Analysis.reconstitute(
    {
      ...props,
      opportunityScore:
        options.score === undefined
          ? props.opportunityScore
          : Score.create(options.score).getValue(),
      analyzedAt: new Date(
        ANALYZED_AT.getTime() - (options.hoursAgo ?? 0) * HOUR_MS,
      ),
    },
    built.id,
  );
}

async function store(options: StoredOptions): Promise<Analysis> {
  const analysis = analysisOf(options);
  expect((await repository.save(analysis)).isSuccess).toBe(true);

  return analysis;
}

function status(value: AnalysisStatusValue): AnalysisStatus {
  return AnalysisStatus.create(value).getValue();
}

function vintedId(raw: string): VintedId {
  return VintedId.create(raw).getValue();
}

async function find(raw: string): Promise<Analysis> {
  const found = await repository.findByVintedId(vintedId(raw));

  return found.getValue().unwrap();
}

function vintedIdsOf(items: Analysis[]): string[] {
  return items.map((item) => item.get("listing").vintedId.value);
}

describe("DrizzleAnalysisRepository", () => {
  beforeEach(async () => {
    await clearAnalyses();
    logger.error.mockClear();
  });

  it("gives back the analysis it saved", async () => {
    const analysis = await store({ vintedId: "1001", status: "WATCHING" });

    const found = await find("1001");

    expect(String(found.id.value)).toBe(String(analysis.id.value));
    expect(propsOf(found)).toEqual(propsOf(analysis));
  });

  it("finds nothing for an unknown listing", async () => {
    const found = await repository.findByVintedId(vintedId("404"));

    expect(found.getValue().isNone()).toBe(true);
  });

  it("stores a margin percent far beyond any fixed precision", async () => {
    const built = analysisOf({ vintedId: "1004" });
    const analysis = Analysis.reconstitute(
      {
        ...propsOf(built),
        margin: Margin.create({
          amountCents: 1_999_999_900,
          percent: 2_000_000,
        }).getValue(),
      },
      built.id,
    );

    expect((await repository.save(analysis)).isSuccess).toBe(true);
    const found = await find("1004");

    expect(found.margin().value.percent).toBe(2_000_000);
  });

  it("keeps the id, the status and the creation date when a re-analysis of the listing is saved", async () => {
    const first = await store({ vintedId: "1002" });
    const moved = await repository.updateStatus(
      first.id,
      status("ANALYZED"),
      status("BOUGHT"),
    );
    expect(moved.isSuccess).toBe(true);
    const later = new Date(ANALYZED_AT.getTime() + 2 * HOUR_MS);
    const reanalysis = Analysis.create(
      analysisInput({
        listing: buildListing({ vintedId: "1002", priceCents: 2500 }),
        now: later,
      }),
    ).getValue();

    const saved = await repository.save(reanalysis);
    const found = await find("1002");

    expect(String(saved.getValue().id.value)).toBe(String(first.id.value));
    expect(saved.getValue().status.value).toBe("BOUGHT");
    expect(String(found.id.value)).toBe(String(first.id.value));
    expect(found.get("status").value).toBe("BOUGHT");
    expect(found.get("createdAt")).toEqual(first.get("createdAt"));
    expect(found.get("listing").priceCents.value).toBe(2500);
    expect(found.get("analyzedAt")).toEqual(later);
  });

  it("ends with one row, and gives both callers its id, when two first analyses of a listing are saved at once", async () => {
    const [left, right] = await Promise.all([
      repository.save(analysisOf({ vintedId: "1003" })),
      repository.save(analysisOf({ vintedId: "1003" })),
    ]);
    const stored = await find("1003");

    expect(await rowsFor("1003")).toBe(1);
    expect(String(left?.getValue().id.value)).toBe(String(stored.id.value));
    expect(String(right?.getValue().id.value)).toBe(String(stored.id.value));
  });

  it("lets only one of two concurrent status changes from the same status through", async () => {
    const watched = await store({ vintedId: "1005", status: "WATCHING" });

    const outcomes = await Promise.all([
      repository.updateStatus(
        watched.id,
        status("WATCHING"),
        status("ARCHIVED"),
      ),
      repository.updateStatus(watched.id, status("WATCHING"), status("BOUGHT")),
    ]);
    const winner = outcomes.findIndex((outcome) => outcome.isSuccess);
    const found = await find("1005");

    expect(outcomes.filter((outcome) => outcome.isSuccess)).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.isFailure)?.getError()).toBe(
      "ANALYSIS_STATUS_CONFLICT",
    );
    expect(found.get("status").value).toBe(
      winner === 0 ? "ARCHIVED" : "BOUGHT",
    );
  });

  it("lists the newest analyses first, filtered by minimum score and status, with the total", async () => {
    await store({ vintedId: "2001", score: 8, hoursAgo: 3 });
    await store({ vintedId: "2002", score: 9, hoursAgo: 1 });
    await store({ vintedId: "2003", score: 7, hoursAgo: 2 });
    await store({ vintedId: "2004", score: 5, hoursAgo: 0 });
    await store({ vintedId: "2005", score: 9, status: "SOLD", hoursAgo: 4 });

    const firstPage = await repository.list({
      limit: 2,
      offset: 0,
      minScore: Option.some(7),
      status: Option.some(AnalysisStatus.create("ANALYZED").getValue()),
    });
    const secondPage = await repository.list({
      limit: 2,
      offset: 2,
      minScore: Option.some(7),
      status: Option.some(AnalysisStatus.create("ANALYZED").getValue()),
    });
    const everything = await repository.list({
      limit: 10,
      offset: 0,
      minScore: Option.none(),
      status: Option.none(),
    });

    expect(vintedIdsOf(firstPage.getValue().items)).toEqual(["2002", "2003"]);
    expect(firstPage.getValue().total).toBe(3);
    expect(vintedIdsOf(secondPage.getValue().items)).toEqual(["2001"]);
    expect(vintedIdsOf(everything.getValue().items)).toEqual([
      "2004",
      "2002",
      "2003",
      "2001",
      "2005",
    ]);
    expect(everything.getValue().total).toBe(5);
  });

  it("skips a row whose facts no longer read in the list, and reports it as an integrity failure on find", async () => {
    await store({ vintedId: "3001", hoursAgo: 1 });
    await store({ vintedId: "3002", hoursAgo: 0 });
    await overwriteFacts("3002", { photoQuality: "unreadable" });

    const listed = await repository.list({
      limit: 10,
      offset: 0,
      minScore: Option.none(),
      status: Option.none(),
    });
    const found = await repository.findByVintedId(vintedId("3002"));

    expect(vintedIdsOf(listed.getValue().items)).toEqual(["3001"]);
    expect(logger.error).toHaveBeenCalled();
    expect(found.isFailure).toBe(true);
    expect(found.getError()).toBe("ANALYSIS_RECORD_INTEGRITY_FAILED");
  });

  it("counts the portfolio per status and the opportunities that are not archived", async () => {
    await store({ vintedId: "4001", score: 8, status: "WATCHING" });
    await store({ vintedId: "4002", score: 5, status: "BOUGHT" });
    await store({ vintedId: "4003", score: 9, status: "SOLD" });
    await store({ vintedId: "4004", score: 9.5, status: "ARCHIVED" });
    await store({ vintedId: "4005", score: 7 });
    await store({ vintedId: "4006", score: 6.9 });

    const stats = await repository.stats(7);

    expect(stats.getValue()).toEqual({
      watching: 1,
      bought: 1,
      sold: 1,
      opportunities: 3,
    });
  });

  it("changes nothing and answers a conflict when the stored status is no longer the one read", async () => {
    const bought = await store({ vintedId: "5001", status: "BOUGHT" });

    const updated = await repository.updateStatus(
      bought.id,
      status("WATCHING"),
      status("ARCHIVED"),
    );

    expect(updated.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
    expect((await find("5001")).get("status").value).toBe("BOUGHT");
  });

  it("rewrites only the negotiation of the analysis it read", async () => {
    const stored = await store({ vintedId: "7001" });

    const updated = await repository.updateNegotiation(
      stored.id,
      stored.get("analyzedAt"),
      buildNegotiation({ script: "Je propose 17 €.", tone: "urgent" }),
    );

    const found = await find("7001");
    expect(updated.isSuccess).toBe(true);
    expect(found.get("negotiation").script).toBe("Je propose 17 €.");
    expect(found.get("negotiation").tone.value).toBe("urgent");
    expect(found.get("analyzedAt")).toEqual(stored.get("analyzedAt"));
  });

  it("answers a conflict and keeps the re-analysis when one was saved since the analysis was read", async () => {
    const stale = await store({ vintedId: "7002", hoursAgo: 2 });
    const refreshed = analysisOf({ vintedId: "7002" });
    await repository.save(refreshed);

    const updated = await repository.updateNegotiation(
      stale.id,
      stale.get("analyzedAt"),
      buildNegotiation({ script: "Je propose 17 €.", tone: "urgent" }),
    );

    const found = await find("7002");
    expect(updated.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
    expect(found.get("negotiation").script).toBe(
      refreshed.get("negotiation").script,
    );
    expect(found.get("analyzedAt")).toEqual(ANALYZED_AT);
  });

  it("deletes a stored analysis, and answers not found for a missing one", async () => {
    const stored = await store({ vintedId: "6001" });

    const deleted = await repository.delete(stored.id);
    const missing = await repository.delete(stored.id);

    expect(deleted.isSuccess).toBe(true);
    expect(await rowsFor("6001")).toBe(0);
    expect(missing.getError()).toBe("ANALYSIS_NOT_FOUND");
  });
});
