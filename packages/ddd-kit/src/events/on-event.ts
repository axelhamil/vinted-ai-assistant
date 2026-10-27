import type { IDomainEvent } from "../domain/domain-event";
import { Result } from "../primitives/result";
import type { IEventHandler } from "./event-handler";

export const EVENT_HANDLER_SYMBOL = Symbol.for("clean-stack/event-handler");

export type EventHandler<T extends IDomainEvent = IDomainEvent> =
  IEventHandler<T> & {
    readonly [EVENT_HANDLER_SYMBOL]: true;
  };

export function onEvent<T extends IDomainEvent, TDeps>(
  eventType: string,
  factory: (deps: TDeps) => (event: T) => Promise<void>,
): (deps: TDeps) => EventHandler<T> {
  return (deps) => {
    const react = factory(deps);

    return {
      [EVENT_HANDLER_SYMBOL]: true as const,
      eventType,
      handle: async (event) => {
        await react(event);

        return Result.ok();
      },
    };
  };
}

export function isEventHandler(value: unknown): value is EventHandler {
  return (
    typeof value === "object" &&
    value !== null &&
    EVENT_HANDLER_SYMBOL in value &&
    (value as EventHandler)[EVENT_HANDLER_SYMBOL] === true
  );
}
