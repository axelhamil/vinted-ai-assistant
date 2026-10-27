import {
  type IInstrumentation,
  type ILogger,
  Option,
  Result,
  UUID,
} from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import { resolveExecutor } from "@packages/drizzle/unit-of-work";
import {
  and,
  type Column,
  count,
  desc,
  eq,
  gte,
  type SQL,
  sql,
} from "drizzle-orm";
import { analyses } from "../../../schemas/analysis";
import type {
  AnalysisNotFound,
  AnalysisRecordIntegrityFailed,
  AnalysisStatusConflict,
  AnalysisStoreUnavailable,
  IAnalysisRepository,
  PortfolioPage,
  PortfolioQuery,
  PortfolioStats,
  SavedAnalysis,
} from "../../application/ports/analysis.repository.port";
import type { Analysis, Negotiation } from "../../domain/analysis.aggregate";
import { AnalysisId } from "../../domain/analysis-id";
import {
  ANALYSIS_STATUS,
  AnalysisStatus,
  OPPORTUNITY_STATUS,
} from "../../domain/value-objects/analysis-status.vo";
import type { VintedId } from "../../domain/value-objects/vinted-id.vo";
import {
  type AnalysisRecord,
  analysisToDomain,
  analysisToPersistence,
  negotiationToPersistence,
} from "../mappers/analysis.mapper";

const STORE_UNAVAILABLE: AnalysisStoreUnavailable =
  "ANALYSIS_STORE_UNAVAILABLE";
const INTEGRITY_FAILED: AnalysisRecordIntegrityFailed =
  "ANALYSIS_RECORD_INTEGRITY_FAILED";
const NOT_FOUND: AnalysisNotFound = "ANALYSIS_NOT_FOUND";
const STATUS_CONFLICT: AnalysisStatusConflict = "ANALYSIS_STATUS_CONFLICT";

function excluded(column: Column): SQL {
  return sql`excluded.${sql.identifier(column.name)}`;
}

function countWhere(condition: SQL): SQL<number> {
  return sql`count(*) filter (where ${condition})`.mapWith(Number);
}

export class DrizzleAnalysisRepository implements IAnalysisRepository {
  constructor(
    private readonly database: Db,
    private readonly logger: ILogger,
    private readonly instrumentation: IInstrumentation,
  ) {}

  private traced<T, E>(
    method: string,
    work: () => Promise<Result<T, E>>,
  ): Promise<Result<T, E | AnalysisStoreUnavailable>> {
    return this.instrumentation.startSpan(
      { name: `DrizzleAnalysisRepository > ${method}` },
      async (): Promise<Result<T, E | AnalysisStoreUnavailable>> => {
        try {
          return await work();
        } catch (error) {
          this.instrumentation.capture(error);

          return Result.fail(STORE_UNAVAILABLE);
        }
      },
    );
  }

  private readable(records: AnalysisRecord[]): Analysis[] {
    return records.flatMap((record) => {
      const mapped = analysisToDomain(record);
      if (mapped.isSuccess) return [mapped.getValue()];

      this.logger.error(
        {
          analysisId: record.id,
          vintedId: record.vintedId,
          error: mapped.getError(),
        },
        "[Analysis] unreadable row skipped",
      );
      return [];
    });
  }

  save(
    analysis: Analysis,
  ): Promise<
    Result<
      SavedAnalysis,
      AnalysisRecordIntegrityFailed | AnalysisStoreUnavailable
    >
  > {
    return this.traced(
      "save",
      async (): Promise<
        Result<
          SavedAnalysis,
          AnalysisRecordIntegrityFailed | AnalysisStoreUnavailable
        >
      > => {
        const [stored] = await resolveExecutor(this.database)
          .insert(analyses)
          .values(analysisToPersistence(analysis))
          .onConflictDoUpdate({
            target: analyses.vintedId,
            set: {
              url: excluded(analyses.url),
              title: excluded(analyses.title),
              description: excluded(analyses.description),
              brand: excluded(analyses.brand),
              size: excluded(analyses.size),
              condition: excluded(analyses.condition),
              language: excluded(analyses.language),
              priceCents: excluded(analyses.priceCents),
              totalPriceCents: excluded(analyses.totalPriceCents),
              shippingCostCents: excluded(analyses.shippingCostCents),
              listedAt: excluded(analyses.listedAt),
              photos: excluded(analyses.photos),
              seller: excluded(analyses.seller),
              facts: excluded(analyses.facts),
              groundingSources: excluded(analyses.groundingSources),
              negotiation: excluded(analyses.negotiation),
              opportunityScore: excluded(analyses.opportunityScore),
              marginCents: excluded(analyses.marginCents),
              marginPercent: excluded(analyses.marginPercent),
              suggestedOfferCents: excluded(analyses.suggestedOfferCents),
              resale: excluded(analyses.resale),
              analyzedAt: excluded(analyses.analyzedAt),
              updatedAt: sql`now()`,
            },
          })
          .returning({
            id: analyses.id,
            status: analyses.status,
            createdAt: analyses.createdAt,
          });
        if (!stored) return Result.fail(STORE_UNAVAILABLE);

        const status = AnalysisStatus.parse(stored.status);
        if (status.isFailure) {
          this.logger.error(
            { analysisId: stored.id, status: stored.status },
            "[Analysis] stored status unreadable after save",
          );
          return Result.fail(INTEGRITY_FAILED);
        }

        return Result.ok({
          id: AnalysisId.create(new UUID(stored.id)),
          status: status.getValue(),
          createdAt: stored.createdAt,
        });
      },
    );
  }

  findByVintedId(
    vintedId: VintedId,
  ): Promise<
    Result<
      Option<Analysis>,
      AnalysisRecordIntegrityFailed | AnalysisStoreUnavailable
    >
  > {
    return this.traced(
      "findByVintedId",
      async (): Promise<
        Result<Option<Analysis>, AnalysisRecordIntegrityFailed>
      > => {
        const [record] = await resolveExecutor(this.database)
          .select()
          .from(analyses)
          .where(eq(analyses.vintedId, vintedId.value))
          .limit(1);
        if (!record) return Result.ok(Option.none());

        const mapped = analysisToDomain(record);
        if (mapped.isSuccess) return Result.ok(Option.some(mapped.getValue()));

        this.logger.error(
          {
            analysisId: record.id,
            vintedId: record.vintedId,
            error: mapped.getError(),
          },
          "[Analysis] unreadable row",
        );
        return Result.fail(INTEGRITY_FAILED);
      },
    );
  }

  list(
    query: PortfolioQuery,
  ): Promise<Result<PortfolioPage, AnalysisStoreUnavailable>> {
    return this.traced("list", async () => {
      const filter = and(
        query.minScore
          .map((minScore) => gte(analyses.opportunityScore, minScore))
          .toUndefined(),
        query.status
          .map((status) => eq(analyses.status, status.value))
          .toUndefined(),
      );
      const executor = resolveExecutor(this.database);
      const records = await executor
        .select()
        .from(analyses)
        .where(filter)
        .orderBy(desc(analyses.analyzedAt), desc(analyses.id))
        .limit(query.limit)
        .offset(query.offset);
      const [counted] = await executor
        .select({ total: count() })
        .from(analyses)
        .where(filter);

      return Result.ok({
        items: this.readable(records),
        total: counted?.total ?? 0,
      });
    });
  }

  stats(
    minScore: number,
  ): Promise<Result<PortfolioStats, AnalysisStoreUnavailable>> {
    return this.traced("stats", async () => {
      const [row] = await resolveExecutor(this.database)
        .select({
          watching: countWhere(eq(analyses.status, ANALYSIS_STATUS.WATCHING)),
          bought: countWhere(eq(analyses.status, ANALYSIS_STATUS.BOUGHT)),
          sold: countWhere(eq(analyses.status, ANALYSIS_STATUS.SOLD)),
          opportunities: countWhere(
            sql`${gte(analyses.opportunityScore, minScore)} and ${eq(analyses.status, OPPORTUNITY_STATUS)}`,
          ),
        })
        .from(analyses);

      return Result.ok(
        row ?? { watching: 0, bought: 0, sold: 0, opportunities: 0 },
      );
    });
  }

  updateStatus(
    id: AnalysisId,
    from: AnalysisStatus,
    to: AnalysisStatus,
  ): Promise<Result<void, AnalysisStatusConflict | AnalysisStoreUnavailable>> {
    return this.traced(
      "updateStatus",
      async (): Promise<Result<void, AnalysisStatusConflict>> => {
        const updated = await resolveExecutor(this.database)
          .update(analyses)
          .set({ status: to.value, updatedAt: sql`now()` })
          .where(
            and(
              eq(analyses.id, String(id.value)),
              eq(analyses.status, from.value),
            ),
          )
          .returning({ id: analyses.id });
        if (updated.length === 0) return Result.fail(STATUS_CONFLICT);

        return Result.ok();
      },
    );
  }

  updateNegotiation(
    id: AnalysisId,
    expectedAnalyzedAt: Date,
    negotiation: Negotiation,
  ): Promise<Result<void, AnalysisStatusConflict | AnalysisStoreUnavailable>> {
    return this.traced(
      "updateNegotiation",
      async (): Promise<Result<void, AnalysisStatusConflict>> => {
        const updated = await resolveExecutor(this.database)
          .update(analyses)
          .set({
            negotiation: negotiationToPersistence(negotiation),
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(analyses.id, String(id.value)),
              eq(analyses.analyzedAt, expectedAnalyzedAt),
            ),
          )
          .returning({ id: analyses.id });
        if (updated.length === 0) return Result.fail(STATUS_CONFLICT);

        return Result.ok();
      },
    );
  }

  delete(
    id: AnalysisId,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>> {
    return this.traced("delete", () =>
      this.deleteWhere(eq(analyses.id, String(id.value))),
    );
  }

  deleteByVintedId(
    vintedId: VintedId,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>> {
    return this.traced("deleteByVintedId", () =>
      this.deleteWhere(eq(analyses.vintedId, vintedId.value)),
    );
  }

  private async deleteWhere(
    condition: SQL,
  ): Promise<Result<void, AnalysisNotFound>> {
    const deleted = await resolveExecutor(this.database)
      .delete(analyses)
      .where(condition)
      .returning({ id: analyses.id });
    if (deleted.length === 0) return Result.fail(NOT_FOUND);

    return Result.ok();
  }
}
