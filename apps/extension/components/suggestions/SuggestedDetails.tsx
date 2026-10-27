import type { ListingSuggestionDto } from "@/lib/messaging/protocol";

export interface SuggestedDetailsProps {
  suggestion: ListingSuggestionDto;
}

const CONDITION_LABELS: Record<ListingSuggestionDto["condition"], string> = {
  new_with_tags: "Neuf avec étiquette",
  new: "Neuf sans étiquette",
  very_good: "Très bon état",
  good: "Bon état",
  satisfactory: "Satisfaisant",
};

export function SuggestedDetails({ suggestion }: SuggestedDetailsProps) {
  const details: [string, string | null][] = [
    ["État", CONDITION_LABELS[suggestion.condition]],
    ["Marque", suggestion.brand],
    ["Couleurs", suggestion.colors.join(", ") || null],
    ["Catégorie", suggestion.category],
    ["Taille", suggestion.size],
    ["Matière", suggestion.material],
  ];

  return (
    <section className="flex flex-col gap-row">
      <h3 className="section-title">À renseigner sur Vinted</h3>
      <dl className="grid grid-cols-[1fr_auto] gap-x-stack gap-y-row">
        {details.flatMap(([label, value]) =>
          value
            ? [
                <dt key={`${label}-label`} className="fact-label">
                  {label}
                </dt>,
                <dd key={`${label}-value`} className="fact-value">
                  {value}
                </dd>,
              ]
            : [],
        )}
      </dl>
    </section>
  );
}
