import { Fragment } from "react";
import {
  PLATFORM_LABELS,
  RELEVANCE_LABELS,
  TIP_LABELS,
} from "@/lib/analysis-copy";
import { euros } from "@/lib/format";
import type { AnalysisDto } from "@/lib/messaging/protocol";

export interface ResaleTabProps {
  analysis: AnalysisDto;
}

export function ResaleTab({ analysis }: ResaleTabProps) {
  const { resale } = analysis;

  return (
    <div className="flex flex-col gap-section">
      <dl className="grid grid-cols-[1fr_auto] gap-x-stack gap-y-row">
        <dt className="fact-label">Prix de revente conseillé</dt>
        <dd className="fact-value">{euros(resale.recommendedPrice)}</dd>
        <dt className="fact-label">Délai de vente estimé</dt>
        <dd className="fact-value">environ {resale.estimatedDays} jours</dd>
        {resale.platforms.map((platform) => (
          <Fragment key={platform.name}>
            <dt className="fact-label">{PLATFORM_LABELS[platform.name]}</dt>
            <dd className="fact-value">
              {RELEVANCE_LABELS[platform.relevance]}
            </dd>
          </Fragment>
        ))}
      </dl>
      {resale.tips.length > 0 && (
        <section className="flex flex-col gap-row">
          <h3 className="section-title">Pour bien revendre</h3>
          <ul className="flex flex-col gap-row">
            {resale.tips.map((tip) => (
              <li key={tip}>{TIP_LABELS[tip]}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
