import type { AppError } from "../application/error-code";
import type { IDomainEvent } from "../domain/domain-event";
import { Result } from "../primitives/result";
import type { IEventDispatcher } from "./event-dispatcher";

export interface IEventHandler<T extends IDomainEvent = IDomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<Result<void>>;
}

export type PayloadParser<TPayload> = (payload: unknown) => Result<TPayload>;

export type HandlerFailure = string | AppError;

function describeFailure(failure: HandlerFailure): string {
  return typeof failure === "string"
    ? failure
    : `${failure.code}: ${failure.message}`;
}

export abstract class DomainEventHandler<TPayload> implements IEventHandler {
  abstract readonly eventType: string;
  abstract readonly handlerName: string;
  protected abstract readonly payload: PayloadParser<TPayload>;

  protected abstract react(
    payload: TPayload,
    event: IDomainEvent,
  ): Promise<Result<void, HandlerFailure>>;

  async handle(event: IDomainEvent): Promise<Result<void>> {
    const payload = this.payload(event.payload);
    if (payload.isFailure)
      return Result.fail(`${this.eventType} has a malformed payload`);

    const reacted = await this.react(payload.getValue(), event);

    return reacted.mapError(describeFailure);
  }

  subscribeTo(dispatcher: IEventDispatcher): Result<void> {
    return dispatcher.subscribe(this.eventType, this.handlerName, (event) =>
      this.handle(event),
    );
  }
}
