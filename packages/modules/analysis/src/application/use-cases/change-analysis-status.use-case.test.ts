import { describe, expect, it } from "bun:test";
import { Option, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import { mockUnitOfWork } from "@packages/testing/unit-of-work-mock";
import type { AnalysisStatusValue } from "../../domain/value-objects/analysis-status.vo";
import { buildAnalysis } from "../../testing/analysis.factory";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import { ChangeAnalysisStatusUseCase } from "./change-analysis-status.use-case";

function given(current: AnalysisStatusValue) {
  const repository = mockPort<IAnalysisRepository>();
  const transaction = mockUnitOfWork();

  repository.findByVintedId.mockResolvedValue(
    Result.ok(Option.some(buildAnalysis({ status: current }))),
  );
  repository.updateStatus.mockResolvedValue(Result.ok());

  const change = (status: AnalysisStatusValue) =>
    new ChangeAnalysisStatusUseCase(repository, transaction.unitOfWork).execute(
      { vintedId: "4815162342", status },
    );

  return { repository, transaction, change };
}

describe("changing the portfolio status of an analysis", () => {
  it("moves a watched listing to bought", async () => {
    const { transaction, change } = given("WATCHING");

    const result = await change("BOUGHT");

    expect(result.getValue().get("status").value).toBe("BOUGHT");
    expect(transaction.outcome()).toBe("committed");
  });

  it.each([
    { from: "ARCHIVED", to: "WATCHING" },
    { from: "BOUGHT", to: "BOUGHT" },
  ] satisfies { from: AnalysisStatusValue; to: AnalysisStatusValue }[])(
    "refuses $from to $to as a status conflict and writes nothing",
    async ({ from, to }) => {
      const { repository, transaction, change } = given(from);

      const result = await change(to);

      expect(result.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
      expect(repository.updateStatus).not.toHaveBeenCalled();
      expect(transaction.outcome()).toBe("not_started");
    },
  );

  it("answers a status conflict when another request moved the status first", async () => {
    const { repository, transaction, change } = given("ANALYZED");
    repository.updateStatus.mockResolvedValue(
      Result.fail("ANALYSIS_STATUS_CONFLICT"),
    );

    const result = await change("WATCHING");

    expect(result.getError()).toBe("ANALYSIS_STATUS_CONFLICT");
    expect(transaction.outcome()).toBe("rolled_back");
  });

  it("answers not found for an unknown listing", async () => {
    const { repository, change } = given("ANALYZED");
    repository.findByVintedId.mockResolvedValue(Result.ok(Option.none()));

    const result = await change("WATCHING");

    expect(result.getError()).toBe("ANALYSIS_NOT_FOUND");
  });
});
