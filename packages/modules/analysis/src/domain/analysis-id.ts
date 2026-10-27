import { UUID } from "@packages/ddd-kit";

export class AnalysisId extends UUID<string | number> {
  protected [Symbol.toStringTag] = "AnalysisId";

  private constructor(id: UUID<string | number>) {
    super(id.value);
  }

  static create(id: UUID<string | number>): AnalysisId {
    return new AnalysisId(id);
  }
}
