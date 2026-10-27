import { AsyncLocalStorage } from "node:async_hooks";
import type { IDomainEvent } from "../domain/domain-event";

interface UnitOfWorkScope {
  tx: unknown;
  events: IDomainEvent[];
  closed: boolean;
}

const storage = new AsyncLocalStorage<UnitOfWorkScope>();

export const UnitOfWorkContext = {
  async run<T>(tx: unknown, callback: () => Promise<T>): Promise<T> {
    const scope: UnitOfWorkScope = { tx, events: [], closed: false };

    try {
      return await storage.run(scope, callback);
    } finally {
      scope.closed = true;
    }
  },

  current(): UnitOfWorkScope | undefined {
    return storage.getStore();
  },

  transaction<TTx>(): TTx | undefined {
    const scope = storage.getStore();
    if (!scope || scope.closed) return undefined;

    return scope.tx as TTx | undefined;
  },
};
