import { describe, expect, it } from "bun:test";
import { Option, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { mockUnitOfWork } from "@packages/testing/unit-of-work-mock";
import { buildAnalysis, buildListing } from "../../testing/analysis.factory";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import { DeleteAnalysisUseCase } from "./delete-analysis.use-case";

const VINTED_ID = "4815162342";

function given() {
  const repository = mockPort<IAnalysisRepository>();
  const transaction = mockUnitOfWork();
  const stored = buildAnalysis({
    listing: buildListing({ vintedId: VINTED_ID }),
  });

  repository.findByVintedId.mockResolvedValue(Result.ok(Option.some(stored)));
  repository.delete.mockResolvedValue(Result.ok());

  const remove = () =>
    new DeleteAnalysisUseCase(repository, transaction.unitOfWork).execute({
      vintedId: VINTED_ID,
    });

  return { repository, transaction, stored, remove };
}

describe("deleting an analysis", () => {
  it("deletes the stored analysis and writes analysis.deleted in the same transaction", async () => {
    const { transaction, stored, remove } = given();

    const result = await remove();

    expect(result.isSuccess).toBe(true);
    expect(transaction.outcome()).toBe("committed");
    expect(
      transaction
        .writtenEvents()
        .map(({ eventType, aggregateId, payload }) => ({
          eventType,
          aggregateId,
          payload,
        })),
    ).toEqual([
      {
        eventType: "analysis.deleted",
        aggregateId: String(stored.id.value),
        payload: { vintedId: VINTED_ID },
      },
    ]);
  });

  it("answers not found for an unknown listing and writes nothing", async () => {
    const { repository, transaction, remove } = given();
    repository.findByVintedId.mockResolvedValue(Result.ok(Option.none()));

    const result = await remove();

    expect(result.getError()).toBe("ANALYSIS_NOT_FOUND");
    expect(repository.delete).not.toHaveBeenCalled();
    expect(transaction.writtenEvents()).toEqual([]);
  });

  it("writes no event when another request deleted the analysis first", async () => {
    const { repository, transaction, remove } = given();
    repository.delete.mockResolvedValue(Result.fail("ANALYSIS_NOT_FOUND"));

    const result = await remove();

    expect(result.getError()).toBe("ANALYSIS_NOT_FOUND");
    expect(transaction.outcome()).toBe("rolled_back");
    expect(transaction.writtenEvents()).toEqual([]);
  });
});
