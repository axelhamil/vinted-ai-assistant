import { BaseDomainEvent } from "@packages/ddd-kit";

export interface AnalysisDeletedPayload {
  vintedId: string;
}

export class AnalysisDeletedEvent extends BaseDomainEvent<AnalysisDeletedPayload> {
  readonly eventType = "analysis.deleted";

  constructor(
    readonly aggregateId: string,
    readonly payload: AnalysisDeletedPayload,
  ) {
    super();
  }
}
