import {
  EventCollector,
  type ILogger,
  type IUnitOfWork,
  Result,
  type UseCase,
} from "@packages/ddd-kit";
import type { VintedId } from "../../domain/value-objects/vinted-id.vo";
import type { AnalysisLookup } from "../dto/analysis.dto";
import type {
  AnalysisNotFound,
  AnalysisStoreUnavailable,
  IAnalysisRepository,
} from "../ports/analysis.repository.port";
import {
  type AnalysisInputInvalid,
  parseVintedId,
} from "../services/analysis-input";

export type DeleteAnalysisFailure =
  | AnalysisInputInvalid
  | AnalysisNotFound
  | AnalysisStoreUnavailable;

export class DeleteAnalysisUseCase
  implements UseCase<AnalysisLookup, void, DeleteAnalysisFailure>
{
  constructor(
    private readonly repository: IAnalysisRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly logger: ILogger,
  ) {}

  async execute({
    vintedId: rawVintedId,
  }: AnalysisLookup): Promise<Result<void, DeleteAnalysisFailure>> {
    const vintedId = parseVintedId(rawVintedId);
    if (vintedId.isFailure) return Result.fail(vintedId.getError());

    const found = await this.repository.findByVintedId(vintedId.getValue());
    if (found.isFailure) {
      const error = found.getError();
      if (error !== "ANALYSIS_RECORD_INTEGRITY_FAILED")
        return Result.fail(error);

      return this.deleteUnreadable(vintedId.getValue());
    }

    const stored = found.getValue();
    if (stored.isNone()) return Result.fail("ANALYSIS_NOT_FOUND");

    const analysis = stored.unwrap();
    analysis.markDeleted();

    return this.unitOfWork.run(async () => {
      const deleted = await this.repository.delete(analysis.id);
      EventCollector.collectFrom(analysis);

      return deleted;
    });
  }

  private deleteUnreadable(
    vintedId: VintedId,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>> {
    this.logger.warn(
      { vintedId: vintedId.value, cause: "ANALYSIS_RECORD_INTEGRITY_FAILED" },
      "[Analysis] unreadable stored analysis deleted without a deleted event",
    );

    return this.unitOfWork.run(() =>
      this.repository.deleteByVintedId(vintedId),
    );
  }
}
