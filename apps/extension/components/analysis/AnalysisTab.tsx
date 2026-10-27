import {
  BACKGROUND_LABELS,
  CONFIDENCE_LABELS,
  LIGHTING_LABELS,
} from "@/lib/analysis-copy";
import { euros, percent, signedEuros } from "@/lib/format";
import type { AnalysisDto, AnalyzeInput } from "@/lib/messaging/protocol";
import { needsSellerCheck } from "@/lib/vinted/seller";

export interface AnalysisTabProps {
  analysis: AnalysisDto;
  seller: AnalyzeInput["seller"];
  shippingCost: number | null;
}

const RATING = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

type SignalType = AnalysisDto["opportunity"]["signals"][number]["type"];

const SIGNAL_TONES: Record<SignalType, string> = {
  positive: "tone-profit",
  negative: "tone-loss",
  neutral: "",
};

export function AnalysisTab({
  analysis,
  seller,
  shippingCost,
}: AnalysisTabProps) {
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
        {shippingCost !== null && (
          <>
            <dt className="fact-label">Frais de port</dt>
            <dd className="fact-value">{euros(shippingCost)}</dd>
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
        <dd className="fact-value">
          {authenticityCheck.score}/10, analyse{" "}
          {CONFIDENCE_LABELS[authenticityCheck.confidence]}
        </dd>
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
      <section className="flex flex-col gap-row">
        <h3 className="section-title">Photos</h3>
        <p className="fact-note">
          Lumière {LIGHTING_LABELS[photoQuality.lighting]}, fond{" "}
          {BACKGROUND_LABELS[photoQuality.background]},{" "}
          {photoQuality.hasModel ? "article porté" : "article non porté"}.
        </p>
        {photoQuality.issues.length > 0 && (
          <ul className="flex flex-col gap-row">
            {photoQuality.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-row">
        <h3 className="section-title">Vendeur</h3>
        <dl className="grid grid-cols-[1fr_auto] gap-x-stack gap-y-row">
          <dt className="fact-label">Pseudo</dt>
          <dd className="fact-value">{seller.username}</dd>
          <dt className="fact-label">Note</dt>
          <dd className="fact-value">
            {seller.rating === null
              ? "inconnue"
              : `${RATING.format(seller.rating)}/5`}
          </dd>
          <dt className="fact-label">Ventes</dt>
          <dd className="fact-value">{seller.salesCount ?? "inconnues"}</dd>
        </dl>
        {needsSellerCheck(seller) && (
          <p className="fact-note tone-loss">
            Vérifiez le profil du vendeur avant d'acheter : sa note ou son
            nombre de ventes ne suffit pas à juger sa fiabilité.
          </p>
        )}
      </section>
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
