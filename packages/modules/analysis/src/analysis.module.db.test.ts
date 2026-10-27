import { beforeEach, describe, expect, it } from "bun:test";
import { type ILogger, RequestContext, Result } from "@packages/ddd-kit";
import { db } from "@packages/testing/clone-database";
import { mockInstrumentation } from "@packages/testing/instrumentation-mock";
import { mockPort } from "@packages/testing/port-mock";
import { sleep } from "bun";
import { eq } from "drizzle-orm";
import { container } from "inwire";
import { analyses, analysisOutbox } from "../schemas/analysis";
import { analysisModule } from "./analysis.module";
import type { IAnalysisRepository } from "./application/ports/analysis.repository.port";
import type { IListingFactsReader } from "./application/ports/listing-facts-reader.port";
import type { INegotiationWriter } from "./application/ports/negotiation-writer.port";
import { DrizzleAnalysisRepository } from "./infrastructure/repositories/drizzle-analysis.repository";
import {
  buildAnalysis,
  buildFacts,
  buildListing,
  buildListingDto,
  buildNegotiation,
} from "./testing/analysis.factory";
import { clearAnalyses, overwriteFacts, rowsFor } from "./testing/database";

const VINTED_ID = "4815162342";
const REQUEST_ID = "req-outbox-1";

class StatusMovedMeanwhileRepository extends DrizzleAnalysisRepository {
  override async updateStatus(
    ...args: Parameters<IAnalysisRepository["updateStatus"]>
  ): ReturnType<IAnalysisRepository["updateStatus"]> {
    await db
      .update(analyses)
      .set({ status: "BOUGHT" })
      .where(eq(analyses.vintedId, VINTED_ID));

    return super.updateStatus(...args);
  }
}

class RecreatedMeanwhileRepository extends DrizzleAnalysisRepository {
  readonly recreated = buildAnalysis({
    listing: buildListing({ vintedId: VINTED_ID }),
  });

  override async findByVintedId(
    ...args: Parameters<IAnalysisRepository["findByVintedId"]>
  ): ReturnType<IAnalysisRepository["findByVintedId"]> {
    const found = await super.findByVintedId(...args);
    await db.delete(analyses).where(eq(analyses.vintedId, VINTED_ID));
    await super.save(this.recreated);

    return found;
  }
}

function givenModule() {
  const logger = mockPort<ILogger>();
  const instrumentation = mockInstrumentation();
  const factsReader = mockPort<IListingFactsReader>();
  const negotiationWriter = mockPort<INegotiationWriter>();
  factsReader.read.mockResolvedValue(
    Result.ok({ facts: buildFacts(), groundingSources: [] }),
  );
  negotiationWriter.write.mockResolvedValue(Result.ok(buildNegotiation()));

  const build = () =>
    container()
      .add("db", () => db)
      .add("logger", () => logger)
      .add("IInstrumentation", () => instrumentation)
      .add("IListingFactsReader", () => factsReader)
      .add("INegotiationWriter", () => negotiationWriter)
      .addModule(analysisModule);

  return { build, negotiationWriter, logger, instrumentation };
}

type AnalysisUseCases = ReturnType<
  ReturnType<ReturnType<typeof givenModule>["build"]>["build"]
>;

function analyze(module: AnalysisUseCases, forceRefresh = false) {
  return module.AnalyzeListingUseCase.execute({
    listing: buildListingDto({ vintedId: VINTED_ID }),
    forceRefresh,
  });
}

function outboxRows() {
  return db
    .select()
    .from(analysisOutbox)
    .orderBy(analysisOutbox.occurredAt, analysisOutbox.id);
}

beforeEach(clearAnalyses);

describe("the analysis events in the module outbox", () => {
  it("writes analyze, status change and delete as three rows in order, with the analysis id and the request id", async () => {
    const { build } = givenModule();
    const module = build().build();

    const analysisId = await RequestContext.run(
      { requestId: REQUEST_ID },
      async () => {
        const analysis = (await analyze(module)).getValue();
        await module.ChangeAnalysisStatusUseCase.execute({
          vintedId: VINTED_ID,
          status: "WATCHING",
        });
        await module.DeleteAnalysisUseCase.execute({ vintedId: VINTED_ID });

        return String(analysis.id.value);
      },
    );

    const rows = await outboxRows();
    expect(
      rows.map(({ eventType, aggregateId, aggregateType, metadata }) => ({
        eventType,
        aggregateId,
        aggregateType,
        requestId: metadata.requestId,
        source: metadata.source,
      })),
    ).toEqual(
      ["analysis.completed", "analysis.status_changed", "analysis.deleted"].map(
        (eventType) => ({
          eventType,
          aggregateId: analysisId,
          aggregateType: "analysis",
          requestId: REQUEST_ID,
          source: "analysis",
        }),
      ),
    );
    expect(rows[1]?.payload).toEqual({
      vintedId: VINTED_ID,
      from: "ANALYZED",
      to: "WATCHING",
    });
    expect(await rowsFor(VINTED_ID)).toBe(0);
  });

  it("writes no status_changed row when a concurrent move fails the update after the event was collected", async () => {
    const { build, logger, instrumentation } = givenModule();
    await analyze(build().build());
    const module = build()
      .override(
        "IAnalysisRepository",
        (): IAnalysisRepository =>
          new StatusMovedMeanwhileRepository(db, logger, instrumentation),
      )
      .build();

    const result = await module.ChangeAnalysisStatusUseCase.execute({
      vintedId: VINTED_ID,
      status: "WATCHING",
    });

    expect(result.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
    expect((await outboxRows()).map(({ eventType }) => eventType)).toEqual([
      "analysis.completed",
    ]);
  });

  it("leaves an analysis recreated between the read and the delete in place, with no deleted event", async () => {
    const { build, logger, instrumentation } = givenModule();
    await analyze(build().build());
    const racing = new RecreatedMeanwhileRepository(
      db,
      logger,
      instrumentation,
    );
    const module = build()
      .override("IAnalysisRepository", (): IAnalysisRepository => racing)
      .build();

    const result = await module.DeleteAnalysisUseCase.execute({
      vintedId: VINTED_ID,
    });

    const [kept] = await db
      .select({ id: analyses.id })
      .from(analyses)
      .where(eq(analyses.vintedId, VINTED_ID));
    expect(result.getError()).toBe("ANALYSIS_NOT_FOUND");
    expect(kept?.id).toBe(String(racing.recreated.id.value));
    expect((await outboxRows()).map(({ eventType }) => eventType)).toEqual([
      "analysis.completed",
    ]);
  });

  it("deletes an analysis whose stored row no longer reads, without a deleted event", async () => {
    const { build } = givenModule();
    const module = build().build();
    await analyze(module);
    await overwriteFacts(VINTED_ID, { photoQuality: "unreadable" });

    const result = await module.DeleteAnalysisUseCase.execute({
      vintedId: VINTED_ID,
    });

    expect(result.isSuccess).toBe(true);
    expect(await rowsFor(VINTED_ID)).toBe(0);
    expect((await outboxRows()).map(({ eventType }) => eventType)).toEqual([
      "analysis.completed",
    ]);
  });

  it("answers a conflict when the listing is re-analysed while its negotiation is regenerated", async () => {
    const { build, negotiationWriter } = givenModule();
    const module = build().build();
    await analyze(module);
    negotiationWriter.write.mockImplementationOnce(async () => {
      await sleep(2);
      await analyze(module, true);

      return Result.ok(buildNegotiation({ script: "Je propose 17 €." }));
    });

    const result = await module.RegenerateNegotiationUseCase.execute({
      vintedId: VINTED_ID,
      tone: "urgent",
    });

    expect(result.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
  });
});
