import { NEGOTIATION_TONES } from "@packages/analysis/contract";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TONE_LABELS } from "@/lib/analysis-copy";
import { euros } from "@/lib/format";
import {
  type AnalysisDto,
  type NegotiationTone,
  sendMessage,
} from "@/lib/messaging/protocol";
import { useBackgroundMutation } from "@/lib/ui/query";

export interface NegotiateTabProps {
  analysis: AnalysisDto;
  onChange: (analysis: AnalysisDto) => void;
}

export function NegotiateTab({ analysis, onChange }: NegotiateTabProps) {
  const { negotiation, vintedId } = analysis;
  const regenerate = useBackgroundMutation(
    (tone: NegotiationTone) =>
      sendMessage("regenerateNegotiation", { vintedId, tone }),
    onChange,
  );

  return (
    <div className="flex flex-col gap-section">
      <dl className="grid grid-cols-[1fr_auto] gap-x-stack">
        <dt className="fact-label">Offre conseillée</dt>
        <dd className="fact-value">{euros(negotiation.suggestedOffer)}</dd>
      </dl>
      <fieldset className="flex gap-row">
        <legend className="sr-only">Ton du message</legend>
        {NEGOTIATION_TONES.map((tone) => (
          <Button
            key={tone}
            size="sm"
            variant={tone === negotiation.tone ? "default" : "outline"}
            aria-pressed={tone === negotiation.tone}
            disabled={regenerate.isPending}
            onClick={() =>
              tone !== negotiation.tone &&
              regenerate.mutate(tone, {
                onError: (error) => toast.error(error.message),
              })
            }
          >
            {TONE_LABELS[tone]}
          </Button>
        ))}
      </fieldset>
      <p className="offer-script" aria-busy={regenerate.isPending}>
        {negotiation.script}
      </p>
      {negotiation.arguments.length > 0 && (
        <section className="flex flex-col gap-row">
          <h3 className="section-title">Arguments</h3>
          <ul className="flex flex-col gap-row">
            {negotiation.arguments.map((argument) => (
              <li key={argument}>{argument}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
