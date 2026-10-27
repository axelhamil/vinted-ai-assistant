import { toast } from "sonner";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { SuggestionRow } from "@/components/suggestions/SuggestionRow";
import { Button } from "@/components/ui/button";
import { CONFIDENCE_LABELS } from "@/lib/analysis-copy";
import type { Reply } from "@/lib/api/failure";
import { euros } from "@/lib/format";
import type { SuggestedListing } from "@/lib/photos/suggest-listing";
import {
  droppedPhotosNotice,
  unreadablePhotosNotice,
} from "@/lib/photos/suggestion-input";
import { useBackgroundMutation } from "@/lib/ui/query";
import type { ListingField } from "@/lib/vinted/listing-form";

export interface SuggestionsPanelProps {
  sources: File[];
  onSuggest: (sources: File[]) => Promise<Reply<SuggestedListing>>;
  onFill: (field: ListingField, value: string | number) => boolean;
}

const APPLIED: Record<ListingField, string> = {
  title: "Titre appliqué",
  description: "Description appliquée",
  price: "Prix appliqué",
};

export function SuggestionsPanel({
  sources,
  onSuggest,
  onFill,
}: SuggestionsPanelProps) {
  const request = useBackgroundMutation(onSuggest);
  const use = (field: ListingField, value: string | number) => {
    if (onFill(field, value)) {
      toast.success(APPLIED[field]);
      return;
    }

    toast.error(
      "Champ introuvable dans le formulaire Vinted. Copiez la suggestion à la main.",
    );
  };
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
        <p className="fact-note">{droppedPhotosNotice(result.droppedCount)}</p>
      )}
      {result && result.unreadableCount > 0 && (
        <p className="fact-note tone-loss">
          {unreadablePhotosNotice(result.unreadableCount)}
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
