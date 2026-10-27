import { BaseDomainEvent } from "@packages/ddd-kit";
import type { AnalysisStatusValue } from "../value-objects/analysis-status.vo";

export interface AnalysisStatusChangedPayload {
  vintedId: string;
  from: AnalysisStatusValue;
  to: AnalysisStatusValue;
}

export class AnalysisStatusChangedEvent extends BaseDomainEvent<AnalysisStatusChangedPayload> {
  readonly eventType = "analysis.status_changed";

  constructor(
    readonly aggregateId: string,
    readonly payload: AnalysisStatusChangedPayload,
  ) {
    super();
  }
}
