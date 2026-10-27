import { Option, Result } from "@packages/ddd-kit";
import { z } from "zod";
import { OPPORTUNITY_MIN_SCORE } from "../../contract";
import type { Analysis } from "../../domain/analysis.aggregate";
import { AnalysisStatus } from "../../domain/value-objects/analysis-status.vo";
import { Score } from "../../domain/value-objects/score.vo";
import type {
  AnalysisLookup,
  MarkdownExport,
  PortfolioListInput,
  PortfolioListing,
  PortfolioStatsInput,
} from "../dto/analysis.dto";
import type {
  AnalysisStoreUnavailable,
  IAnalysisRepository,
  PortfolioQuery,
  PortfolioStats,
} from "../ports/analysis.repository.port";
import { type AnalysisInputInvalid, INPUT_INVALID } from "./analysis-input";
import { exportAnalysisMarkdown } from "./analysis-markdown";
import {
  findStoredAnalysis,
  type StoredAnalysisFailure,
} from "./stored-analysis";

const pageSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

type ListFailure = AnalysisInputInvalid | AnalysisStoreUnavailable;

function optionalScore(
  raw: number | undefined,
): Result<Option<number>, AnalysisInputInvalid> {
  return Option.fromNullable(raw)
    .tryMap((value) => Score.create(value).map((score) => score.value))
    .mapError(() => INPUT_INVALID);
}

function optionalStatus(
  raw: string | undefined,
): Result<Option<AnalysisStatus>, AnalysisInputInvalid> {
  return Option.fromNullable(raw)
    .tryMap((value) => AnalysisStatus.parse(value))
    .mapError(() => INPUT_INVALID);
}

function toQuery(
  input: PortfolioListInput,
): Result<PortfolioQuery, AnalysisInputInvalid> {
  const page = pageSchema.safeParse({
    limit: input.limit,
    offset: input.offset,
  });
  if (!page.success) return Result.fail(INPUT_INVALID);

  const filters = Result.all([
    optionalScore(input.minScore),
    optionalStatus(input.status),
  ]);
  if (filters.isFailure) return Result.fail(filters.getError());

  const [minScore, status] = filters.getValue();

  return Result.ok({ ...page.data, minScore, status });
}

export class PortfolioService {
  constructor(private readonly repository: IAnalysisRepository) {}

  get({
    vintedId,
  }: AnalysisLookup): Promise<Result<Analysis, StoredAnalysisFailure>> {
    return findStoredAnalysis(this.repository, vintedId);
  }

  async list(
    input: PortfolioListInput,
  ): Promise<Result<PortfolioListing, ListFailure>> {
    const query = toQuery(input);
    if (query.isFailure) return Result.fail(query.getError());

    const { limit, offset } = query.getValue();
    const page = await this.repository.list(query.getValue());
    if (page.isFailure) return Result.fail(page.getError());

    const { items, total } = page.getValue();

    return Result.ok({ items, total, hasMore: offset + limit < total });
  }

  async stats(
    input: PortfolioStatsInput,
  ): Promise<Result<PortfolioStats, ListFailure>> {
    const minScore = Score.create(input.minScore ?? OPPORTUNITY_MIN_SCORE);
    if (minScore.isFailure) return Result.fail(INPUT_INVALID);

    return this.repository.stats(minScore.getValue().value);
  }

  async exportMarkdown({
    vintedId,
  }: AnalysisLookup): Promise<Result<MarkdownExport, StoredAnalysisFailure>> {
    const found = await findStoredAnalysis(this.repository, vintedId);

    return found.map(exportAnalysisMarkdown);
  }
}
