import { type IUnitOfWork, Result } from "@packages/ddd-kit";
import type { Analysis } from "../../domain/analysis.aggregate";
import type {
  AnalysisNotFound,
  AnalysisRecordIntegrityFailed,
  AnalysisStoreUnavailable,
  IAnalysisRepository,
} from "../ports/analysis.repository.port";
import { type AnalysisInputInvalid, parseVintedId } from "./analysis-input";

export type StoredAnalysisFailure =
  | AnalysisInputInvalid
  | AnalysisNotFound
  | AnalysisRecordIntegrityFailed
  | AnalysisStoreUnavailable;

export async function findStoredAnalysis(
  repository: IAnalysisRepository,
  rawVintedId: string,
): Promise<Result<Analysis, StoredAnalysisFailure>> {
  const vintedId = parseVintedId(rawVintedId);
  if (vintedId.isFailure) return Result.fail(vintedId.getError());

  const found = await repository.findByVintedId(vintedId.getValue());
  if (found.isFailure) return Result.fail(found.getError());

  return found.getValue().toResult<AnalysisNotFound>("ANALYSIS_NOT_FOUND");
}

export async function storeAnalysis(
  repository: IAnalysisRepository,
  unitOfWork: IUnitOfWork,
  analysis: Analysis,
): Promise<Result<Analysis, AnalysisStoreUnavailable>> {
  const saved = await unitOfWork.run(() => repository.save(analysis));

  return saved.map((id) => analysis.storedAs(id));
}
