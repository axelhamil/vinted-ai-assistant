import { AsyncLocalStorage } from "node:async_hooks";
import { Option } from "../primitives/option";

export interface RequestScope {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestScope>();

export const RequestContext = {
  run<T>(scope: RequestScope, callback: () => T): T {
    return storage.run(scope, callback);
  },

  current(): Option<RequestScope> {
    return Option.fromNullable(storage.getStore());
  },
};
