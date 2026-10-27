import { BaseDomainEvent } from "@packages/ddd-kit";
import type { AnalysisStatusValue } from "../../contract";

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
