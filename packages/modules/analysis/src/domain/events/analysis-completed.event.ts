import { BaseDomainEvent } from "@packages/ddd-kit";

export interface AnalysisCompletedPayload {
  vintedId: string;
  score: number;
  marginPercent: number;
}

export class AnalysisCompletedEvent extends BaseDomainEvent<AnalysisCompletedPayload> {
  readonly eventType = "analysis.completed";

  constructor(
    readonly aggregateId: string,
    readonly payload: AnalysisCompletedPayload,
    dateOccurred: Date,
  ) {
    super(dateOccurred);
  }
}
