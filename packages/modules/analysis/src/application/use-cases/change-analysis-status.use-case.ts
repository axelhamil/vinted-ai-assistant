import {
  EventCollector,
  type IUnitOfWork,
  Result,
  type UseCase,
} from "@packages/ddd-kit";
import type { Analysis } from "../../domain/analysis.aggregate";
import { AnalysisStatus } from "../../domain/value-objects/analysis-status.vo";
import type { ChangeAnalysisStatusInput } from "../dto/analysis.dto";
import type {
  AnalysisStatusConflict,
  IAnalysisRepository,
} from "../ports/analysis.repository.port";
import { INPUT_INVALID } from "../services/analysis-input";
import {
  findStoredAnalysis,
  type StoredAnalysisFailure,
} from "../services/stored-analysis";

export type ChangeAnalysisStatusFailure =
  | StoredAnalysisFailure
  | AnalysisStatusConflict;

export class ChangeAnalysisStatusUseCase
  implements
    UseCase<ChangeAnalysisStatusInput, Analysis, ChangeAnalysisStatusFailure>
{
  constructor(
    private readonly repository: IAnalysisRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: ChangeAnalysisStatusInput,
  ): Promise<Result<Analysis, ChangeAnalysisStatusFailure>> {
    const next = AnalysisStatus.parse(input.status);
    if (next.isFailure) return Result.fail(INPUT_INVALID);

    const found = await findStoredAnalysis(this.repository, input.vintedId);
    if (found.isFailure) return Result.fail(found.getError());

    const analysis = found.getValue();
    const from = analysis.get("status");
    const moved = analysis.changeStatus(next.getValue());
    if (moved.isFailure) return Result.fail(moved.getError());

    const updated = await this.unitOfWork.run(async () => {
      const written = await this.repository.updateStatus(
        analysis.id,
        from,
        next.getValue(),
      );
      EventCollector.collectFrom(analysis);

      return written;
    });
    if (updated.isFailure) return Result.fail(updated.getError());

    return Result.ok(analysis);
  }
}
