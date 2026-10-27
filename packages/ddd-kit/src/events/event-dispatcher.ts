import type { IDomainEvent } from "../domain/domain-event";
import type { Result } from "../primitives/result";

export type EventHandlerFn<T extends IDomainEvent = IDomainEvent> = (
  event: T,
) => Promise<Result<void>> | Result<void>;

export type HandlerOutcome =
  | { name: string; ok: true }
  | { name: string; ok: false; error: string };

export interface IEventDispatcher {
  subscribe(
    eventType: string,
    name: string,
    handle: EventHandlerFn,
  ): Result<void>;

  deliver(
    event: IDomainEvent,
    delivered: ReadonlySet<string>,
  ): Promise<HandlerOutcome[]>;

  handlersOf(eventType: string): string[];
}
