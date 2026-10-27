import { OPPORTUNITY_MIN_SCORE } from "@packages/analysis/contract";
import type { PortfolioQuery } from "@/lib/messaging/protocol";

export interface PortfolioTab {
  id: "watching" | "bought" | "sold" | "opportunities";
  label: string;
  query: PortfolioQuery;
  empty: string;
}

export const PORTFOLIO_TABS: readonly PortfolioTab[] = [
  {
    id: "watching",
    label: "Surveillance",
    query: { status: "WATCHING" },
    empty:
      "Aucun article surveillé. Cliquez sur Surveiller depuis une annonce.",
  },
  {
    id: "bought",
    label: "Achats",
    query: { status: "BOUGHT" },
    empty: "Aucun achat. Marquez un article surveillé comme acheté.",
  },
  {
    id: "sold",
    label: "Ventes",
    query: { status: "SOLD" },
    empty: "Aucune vente. Marquez un achat comme vendu.",
  },
  {
    id: "opportunities",
    label: "Opportunités",
    query: { status: "ANALYZED", minScore: String(OPPORTUNITY_MIN_SCORE) },
    empty: `Aucune annonce analysée avec un score de ${OPPORTUNITY_MIN_SCORE} ou plus.`,
  },
];
