import type { IDomainEvent } from "./domain-event";
import { type AnyId, Entity } from "./entity";

export interface IAggregate {
  readonly domainEvents: IDomainEvent[];
  clearEvents(): void;
}

export interface IEventSource {
  pullDomainEvents(): IDomainEvent[];
}

export abstract class Aggregate<T, Id extends AnyId = AnyId>
  extends Entity<T, Id>
  implements IAggregate, IEventSource
{
  private _domainEvents: IDomainEvent[] = [];

  protected addEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  protected addEvents(events: IDomainEvent[]): void {
    for (const event of events) {
      this.addEvent(event);
    }
  }

  public pullDomainEvents(): IDomainEvent[] {
    const drained = [...this._domainEvents];
    this._domainEvents = [];
    return drained;
  }

  public get domainEvents(): IDomainEvent[] {
    return [...this._domainEvents];
  }

  public hasEvents(): boolean {
    return this._domainEvents.length > 0;
  }

  public getEventCount(): number {
    return this._domainEvents.length;
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
