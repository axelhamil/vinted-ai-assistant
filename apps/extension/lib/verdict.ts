import { scoreLevel } from "@packages/analysis/contract";
import { euros } from "@/lib/format";
import type { AnalysisDto } from "@/lib/messaging/protocol";

export const verdict = ({
  opportunity,
  marketPrice,
  negotiation,
}: AnalysisDto): string => {
  if (marketPrice.confidence === "low" && marketPrice.sources.length === 0)
    return "Pas assez de données pour estimer ce prix";

  if (opportunity.margin < 0)
    return `Trop cher de ${euros(Math.abs(opportunity.margin))}`;

  const offer = euros(negotiation.suggestedOffer);

  switch (scoreLevel(opportunity.score)) {
    case "high":
      return `Bonne affaire : offrez ${offer}`;
    case "medium":
      return `Prix correct : offrez ${offer}`;
    case "low":
      return `Peu d'intérêt : n'offrez pas plus de ${offer}`;
  }
};
