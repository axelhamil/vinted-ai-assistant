import { AsyncLocalStorage } from "node:async_hooks";
import {
  EventCollector,
  type IDomainEvent,
  type IUnitOfWork,
  Result,
} from "@packages/ddd-kit";
import { EventsWithoutOutbox } from "@packages/drizzle/unit-of-work";
import { mockPort, type PortMock } from "./port-mock";

export type UnitOfWorkOutcome = "not_started" | "committed" | "rolled_back";

export interface UnitOfWorkOptions {
  commit?: "succeeds" | "fails";
  outbox?: "present" | "absent";
}

export interface UnitOfWorkMock {
  unitOfWork: PortMock<IUnitOfWork>;
  outcome(): UnitOfWorkOutcome;
  writtenEvents(): IDomainEvent[];
}

export const COMMIT_FAILURE = "commit failed";

interface OutermostRun {
  rollbackOnly: boolean;
  failure?: unknown;
  pending: IDomainEvent[];
}

class NestedRollback extends Error {
  constructor(readonly result: unknown) {
    super("nested run failed");
  }
}

function isFailedResult(value: unknown): boolean {
  return value instanceof Result && value.isFailure;
}

export function mockUnitOfWork(
  options: UnitOfWorkOptions = {},
): UnitOfWorkMock {
  const unitOfWork = mockPort<IUnitOfWork>();
  const scope = new AsyncLocalStorage<OutermostRun>();
  let outcome: UnitOfWorkOutcome = "not_started";
  const written: IDomainEvent[] = [];

  unitOfWork.run.mockImplementation(async (work) => {
    const ambient = scope.getStore();
    if (ambient) {
      const result = await EventCollector.runWithContext(async () => {
        const nested = await work();
        if (!isFailedResult(nested))
          ambient.pending.push(...EventCollector.drain());

        return nested;
      });
      if (!isFailedResult(result)) return result;

      if (!ambient.rollbackOnly) {
        ambient.rollbackOnly = true;
        ambient.failure = result;
      }
      throw new NestedRollback(result);
    }

    const outermost: OutermostRun = { rollbackOnly: false, pending: [] };
    try {
      const result = await EventCollector.runWithContext(() =>
        scope.run(outermost, async () => {
          const done = await work();
          outermost.pending.push(...EventCollector.drain());

          return done;
        }),
      );
      if (isFailedResult(result)) {
        outcome = "rolled_back";

        return result;
      }
      if (outermost.rollbackOnly) {
        outcome = "rolled_back";

        return outermost.failure as typeof result;
      }
      if (options.outbox === "absent" && outermost.pending.length > 0)
        throw new EventsWithoutOutbox(outermost.pending);
      if (options.commit === "fails") throw new Error(COMMIT_FAILURE);

      outcome = "committed";
      written.push(...outermost.pending);

      return result;
    } catch (error) {
      outcome = "rolled_back";
      if (error instanceof NestedRollback) return error.result as never;

      throw error;
    }
  });

  return {
    unitOfWork,
    outcome: () => outcome,
    writtenEvents: () => [...written],
  };
}
