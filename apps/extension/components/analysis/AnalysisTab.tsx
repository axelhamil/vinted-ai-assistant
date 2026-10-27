import { CONFIDENCE_LABELS } from "@/lib/analysis-copy";
import { euros, percent, signedEuros } from "@/lib/format";
import type { AnalysisDto } from "@/lib/messaging/protocol";

export interface AnalysisTabProps {
  analysis: AnalysisDto;
}

type SignalType = AnalysisDto["opportunity"]["signals"][number]["type"];

const SIGNAL_TONES: Record<SignalType, string> = {
  positive: "tone-profit",
  negative: "tone-loss",
  neutral: "",
};

export function AnalysisTab({ analysis }: AnalysisTabProps) {
  const { opportunity, marketPrice, authenticityCheck, photoQuality } =
    analysis;
  const marginTone = opportunity.margin < 0 ? "tone-loss" : "tone-profit";

  return (
    <div className="flex flex-col gap-section">
      <dl className="grid grid-cols-[1fr_auto] gap-x-stack gap-y-row">
        <dt className="fact-label">Prix affiché</dt>
        <dd className="fact-value">{euros(analysis.price)}</dd>
        {analysis.totalPrice !== null && (
          <>
            <dt className="fact-label">Prix avec frais</dt>
            <dd className="fact-value">{euros(analysis.totalPrice)}</dd>
          </>
        )}
        <dt className="fact-label">Prix du marché</dt>
        <dd className="fact-value">
          {euros(marketPrice.low)} à {euros(marketPrice.high)}
        </dd>
        <dt className="fact-label">Prix moyen</dt>
        <dd className="fact-value">{euros(marketPrice.average)}</dd>
        {marketPrice.retailPrice && (
          <>
            <dt className="fact-label">Prix neuf</dt>
            <dd className="fact-value">
              {euros(marketPrice.retailPrice.price)}
            </dd>
          </>
        )}
        <dt className="fact-label">Marge</dt>
        <dd className={`fact-value ${marginTone}`}>
          {signedEuros(opportunity.margin)} (
          {percent(opportunity.marginPercent)})
        </dd>
        <dt className="fact-label">Authenticité</dt>
        <dd className="fact-value">{authenticityCheck.score}/10</dd>
        <dt className="fact-label">Photos</dt>
        <dd className="fact-value">{photoQuality.score}/10</dd>
      </dl>
      <p className="fact-note">
        Estimation {CONFIDENCE_LABELS[marketPrice.confidence]} :{" "}
        {marketPrice.reasoning}
      </p>
      {opportunity.signals.length > 0 && (
        <ul className="flex flex-col gap-row">
          {opportunity.signals.map((signal) => (
            <li key={`${signal.label}-${signal.detail}`}>
              <p className={`section-title ${SIGNAL_TONES[signal.type]}`}>
                {signal.label}
              </p>
              <p className="fact-note">{signal.detail}</p>
            </li>
          ))}
        </ul>
      )}
      {authenticityCheck.flags.length > 0 && (
        <section className="flex flex-col gap-row">
          <h3 className="section-title tone-loss">Points de vigilance</h3>
          <ul className="flex flex-col gap-row">
            {authenticityCheck.flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
