import { describe, expect, it } from "bun:test";
import { EventCollector, Result } from "@packages/ddd-kit";
import { mockUnitOfWork } from "./unit-of-work-mock";

const listingSaved = {
  eventType: "listing.saved",
  aggregateId: "listing-1",
  dateOccurred: new Date("2026-10-27T00:00:00Z"),
  payload: {},
};

function raiseAnEvent() {
  return async () => {
    EventCollector.add(listingSaved);

    return Result.ok();
  };
}

describe("the unit of work mock", () => {
  it("commits the raised events when the run has an outbox", async () => {
    const { unitOfWork, outcome, writtenEvents } = mockUnitOfWork();

    await unitOfWork.run(raiseAnEvent());

    expect(outcome()).toBe("committed");
    expect(writtenEvents()).toEqual([listingSaved]);
  });

  it("rolls back and fails like the drizzle unit of work when events are raised without an outbox", async () => {
    const { unitOfWork, outcome, writtenEvents } = mockUnitOfWork({
      outbox: "absent",
    });

    await expect(unitOfWork.run(raiseAnEvent())).rejects.toThrow(
      "unit of work rolled back: listing.saved raised in a run that has no outbox would be lost",
    );
    expect(outcome()).toBe("rolled_back");
    expect(writtenEvents()).toEqual([]);
  });

  it("commits a run without an outbox when it raises no event", async () => {
    const { unitOfWork, outcome } = mockUnitOfWork({ outbox: "absent" });

    await unitOfWork.run(async () => Result.ok());

    expect(outcome()).toBe("committed");
  });

  it("rolls back and fails when a nested run throws and the outer work catches it", async () => {
    const { unitOfWork, outcome, writtenEvents } = mockUnitOfWork();

    const run = unitOfWork.run(async () => {
      EventCollector.add(listingSaved);
      try {
        await unitOfWork.run(async () => {
          throw new Error("nested work crashed");
        });
      } catch {}

      return Result.ok();
    });

    await expect(run).rejects.toThrow("nested work crashed");
    expect(outcome()).toBe("rolled_back");
    expect(writtenEvents()).toEqual([]);
  });
});
