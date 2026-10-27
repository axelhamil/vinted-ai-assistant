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

  const statusMoves = () =>
    repository.updateStatus.mock.calls.map(([id, from, to]) => ({
      id: id.value,
      from: from.value,
      to: to.value,
    }));

  const change = (status: AnalysisStatusValue) =>
    new ChangeAnalysisStatusUseCase(repository, transaction.unitOfWork).execute(
      { vintedId: "4815162342", status },
    );

  return { repository, transaction, change, statusMoves };
}

describe("changing the portfolio status of an analysis", () => {
  it("moves a watched listing to bought", async () => {
    const { transaction, change, statusMoves } = given("WATCHING");

    const result = await change("BOUGHT");

    const analysis = result.getValue();
    expect(analysis.get("status").value).toBe("BOUGHT");
    expect(statusMoves()).toEqual([
      { id: analysis.id.value, from: "WATCHING", to: "BOUGHT" },
    ]);
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
