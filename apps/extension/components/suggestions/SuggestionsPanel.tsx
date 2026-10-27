import { toast } from "sonner";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { SuggestionRow } from "@/components/suggestions/SuggestionRow";
import { Button } from "@/components/ui/button";
import { CONFIDENCE_LABELS } from "@/lib/analysis-copy";
import type { Reply } from "@/lib/api/failure";
import { euros } from "@/lib/format";
import {
  type ListingSuggestionDto,
  sendMessage,
} from "@/lib/messaging/protocol";
import { downscale } from "@/lib/photos/downscale";
import { UNREADABLE_PHOTO_MESSAGE } from "@/lib/photos/edit-queue";
import {
  buildSuggestionInput,
  MAX_SUGGESTION_PHOTOS,
} from "@/lib/photos/suggestion-input";
import { useBackgroundMutation } from "@/lib/ui/query";
import { detectLanguage } from "@/lib/vinted/language";
import { fillField, type ListingField } from "@/lib/vinted/listing-form";

export interface SuggestionsPanelProps {
  sources: File[];
}

interface Suggested {
  suggestion: ListingSuggestionDto;
  droppedCount: number;
  unreadableCount: number;
}

const APPLIED: Record<ListingField, string> = {
  title: "Titre appliqué",
  description: "Description appliquée",
  price: "Prix appliqué",
};

async function suggest(sources: File[]): Promise<Reply<Suggested>> {
  const built = await buildSuggestionInput(sources, {
    language: detectLanguage({
      hostname: window.location.hostname,
      htmlLang: document.documentElement.lang,
      browserLang: navigator.language,
    }),
    downscale,
  });
  if (!built.input)
    return {
      ok: false,
      failure: { kind: "local", message: UNREADABLE_PHOTO_MESSAGE },
    };

  const reply = await sendMessage("suggestListing", built.input);
  if (!reply.ok) return reply;

  return {
    ok: true,
    data: {
      suggestion: reply.data,
      droppedCount: built.droppedCount,
      unreadableCount: built.unreadableCount,
    },
  };
}

function use(field: ListingField, value: string | number): void {
  if (fillField(document, field, value)) {
    toast.success(APPLIED[field]);
    return;
  }

  toast.error(
    "Champ introuvable dans le formulaire Vinted. Copiez la suggestion à la main.",
  );
}

const photos = (count: number): string =>
  count > 1 ? `${count} photos` : `${count} photo`;

export function SuggestionsPanel({ sources }: SuggestionsPanelProps) {
  const request = useBackgroundMutation(suggest);
  const result = request.data;

  if (request.error)
    return (
      <ErrorPanel
        message={request.error.message}
        onRetry={() => request.mutate(sources)}
      />
    );

  return (
    <div className="flex flex-col gap-section">
      <Button
        disabled={sources.length === 0 || request.isPending}
        onClick={() => request.mutate(sources)}
      >
        {request.isPending
          ? "Suggestions en cours"
          : "Proposer titre, description et prix"}
      </Button>
      {sources.length === 0 && (
        <p className="fact-note">
          Choisissez des photos ci-dessus pour obtenir des suggestions.
        </p>
      )}
      {result && result.droppedCount > 0 && (
        <p className="fact-note">
          {photos(result.droppedCount)} non envoyées : {MAX_SUGGESTION_PHOTOS}{" "}
          photos au maximum.
        </p>
      )}
      {result && result.unreadableCount > 0 && (
        <p className="fact-note tone-loss">
          {photos(result.unreadableCount)} ignorées :{" "}
          {UNREADABLE_PHOTO_MESSAGE.toLowerCase()}.
        </p>
      )}
      {result && (
        <ul className="flex flex-col gap-section">
          <SuggestionRow
            label="Titre"
            value={result.suggestion.title}
            onUse={() => use("title", result.suggestion.title)}
          />
          <SuggestionRow
            label="Description"
            value={result.suggestion.description}
            onUse={() => use("description", result.suggestion.description)}
          />
          <SuggestionRow
            label="Prix"
            value={euros(result.suggestion.price)}
            onUse={() => use("price", result.suggestion.price)}
          >
            <dl className="grid grid-cols-[1fr_auto] gap-x-stack gap-y-row">
              <dt className="fact-label">Fourchette</dt>
              <dd className="fact-value">
                {euros(result.suggestion.priceRange.low)} à{" "}
                {euros(result.suggestion.priceRange.high)}
              </dd>
            </dl>
            <p className="fact-note">
              Estimation {CONFIDENCE_LABELS[result.suggestion.priceConfidence]}{" "}
              : {result.suggestion.priceReasoning}
            </p>
          </SuggestionRow>
        </ul>
      )}
    </div>
  );
}
