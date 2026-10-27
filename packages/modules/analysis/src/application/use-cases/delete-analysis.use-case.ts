import {
  EventCollector,
  type IUnitOfWork,
  Result,
  type UseCase,
} from "@packages/ddd-kit";
import type { AnalysisLookup } from "../dto/analysis.dto";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import {
  findStoredAnalysis,
  type StoredAnalysisFailure,
} from "../services/stored-analysis";

export class DeleteAnalysisUseCase
  implements UseCase<AnalysisLookup, void, StoredAnalysisFailure>
{
  constructor(
    private readonly repository: IAnalysisRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute({
    vintedId,
  }: AnalysisLookup): Promise<Result<void, StoredAnalysisFailure>> {
    const found = await findStoredAnalysis(this.repository, vintedId);
    if (found.isFailure) return Result.fail(found.getError());

    const analysis = found.getValue();
    analysis.markDeleted();

    return this.unitOfWork.run(async () => {
      const deleted = await this.repository.delete(
        analysis.get("listing").vintedId,
      );
      EventCollector.collectFrom(analysis);

      return deleted;
    });
  }
}
