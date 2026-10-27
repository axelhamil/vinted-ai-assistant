import type { IDomainEvent } from "../domain/domain-event";
import { Result } from "../primitives/result";
import type {
  EventHandlerFn,
  HandlerOutcome,
  IEventDispatcher,
} from "./event-dispatcher";

interface NamedHandler {
  name: string;
  handle: EventHandlerFn;
}

export interface EventDispatcherLogger {
  error(message: string, error?: unknown): void;
}

const HANDLER_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class InMemoryEventDispatcher implements IEventDispatcher {
  private handlers = new Map<string, NamedHandler[]>();
  private logger: EventDispatcherLogger | null = null;

  setLogger(logger: EventDispatcherLogger | null): void {
    this.logger = logger;
  }

  private log(message: string, error?: unknown): void {
    this.logger?.error(message, error);
  }

  subscribe(
    eventType: string,
    name: string,
    handle: EventHandlerFn,
  ): Result<void> {
    if (!HANDLER_NAME.test(name))
      return Result.fail(
        `handler name "${name}" for ${eventType} is not kebab case`,
      );

    const existing = this.handlers.get(eventType) ?? [];
    if (existing.some((named) => named.name === name))
      return Result.fail(
        `handler name "${name}" is subscribed twice to ${eventType}`,
      );

    this.handlers.set(eventType, [...existing, { name, handle }]);

    return Result.ok();
  }

  handlersOf(eventType: string): string[] {
    return (this.handlers.get(eventType) ?? []).map(({ name }) => name);
  }

  async deliver(
    event: IDomainEvent,
    delivered: ReadonlySet<string>,
  ): Promise<HandlerOutcome[]> {
    const pending = (this.handlers.get(event.eventType) ?? []).filter(
      ({ name }) => !delivered.has(name),
    );
    const outcomes: HandlerOutcome[] = [];

    for (const { name, handle } of pending)
      outcomes.push(await this.run(name, handle, event));

    return outcomes;
  }

  private async run(
    name: string,
    handle: EventHandlerFn,
    event: IDomainEvent,
  ): Promise<HandlerOutcome> {
    try {
      const result = await handle(event);
      if (result.isSuccess) return { name, ok: true };

      this.log(`Event handler ${name} failed: ${result.getError()}`);

      return { name, ok: false, error: String(result.getError()) };
    } catch (error) {
      this.log(`Event handler ${name} threw exception:`, error);

      return {
        name,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
