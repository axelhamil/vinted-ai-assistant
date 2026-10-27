import type { Analysis } from "../../domain/analysis.aggregate";
import type { SignalType } from "../../domain/listing-facts";
import type { AnalysisStatusValue } from "../../domain/value-objects/analysis-status.vo";
import type {
  ResaleTip,
  ResaleValue,
} from "../../domain/value-objects/resale.vo";
import type { MarkdownExport } from "../dto/analysis.dto";

type PlatformName = ResaleValue["platforms"][number]["name"];

const STATUS_LABELS: Record<AnalysisStatusValue, string> = {
  ANALYZED: "Analysé",
  WATCHING: "Surveillé",
  BOUGHT: "Acheté",
  SOLD: "Vendu",
  ARCHIVED: "Archivé",
};

const SIGNAL_MARKS: Record<SignalType, string> = {
  positive: "✅",
  negative: "❌",
  neutral: "ℹ️",
};

const TIP_LABELS: Record<ResaleTip, string> = {
  HIGH_MARGIN: "Excellente marge, revente rapide possible",
  HIGHLIGHT_BRAND: "Mentionner la marque dans le titre",
  RETAKE_PHOTOS: "Prendre des photos avec lumière naturelle",
  DETAILED_DESCRIPTION: "Décrire précisément l'état et les défauts",
};

const PLATFORM_LABELS: Record<PlatformName, string> = {
  vinted: "Vinted",
  leboncoin: "Leboncoin",
  "vestiaire-collective": "Vestiaire Collective",
};

const SLUG_LENGTH = 30;

function euros(cents: number): string {
  const amount =
    cents % 100 === 0
      ? String(cents / 100)
      : (cents / 100).toFixed(2).replace(".", ",");

  return `${amount} €`;
}

function signedEuros(cents: number): string {
  return cents >= 0 ? `+${euros(cents)}` : `-${euros(-cents)}`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_LENGTH);
}

function analyzedOn(date: Date): string {
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function filenameOf(analysis: Analysis): string {
  const listing = analysis.get("listing");
  const brand = listing.brand.map(slug).unwrapOr("unknown");
  const day = analysis.get("analyzedAt").toISOString().slice(0, 10);

  return `${brand}_${slug(listing.title)}_${day}.md`;
}

function markdownOf(analysis: Analysis): string {
  const listing = analysis.get("listing");
  const facts = analysis.get("facts");
  const negotiation = analysis.get("negotiation");
  const resale = analysis.resale().value;
  const margin = analysis.margin().value;
  const notSpecified = "Non spécifiée";
  const rating = listing.seller.rating.map(String).unwrapOr("N/A");
  const sales = listing.seller.salesCount.unwrapOr(0);

  return [
    `# ${listing.title}`,
    "",
    "## Infos Article",
    `- **URL:** ${listing.url}`,
    `- **Prix demandé:** ${euros(listing.priceCents.value)}`,
    `- **Marque:** ${listing.brand.unwrapOr(notSpecified)}`,
    `- **Taille:** ${listing.size.unwrapOr(notSpecified)}`,
    `- **État:** ${listing.condition}`,
    `- **Vendeur:** ${listing.seller.username} (${rating}⭐, ${sales} ventes)`,
    `- **Statut:** ${STATUS_LABELS[analysis.get("status").value]}`,
    "",
    "## Analyse IA",
    "",
    `### Score Opportunité: ${analysis.opportunityScore().value}/10`,
    "",
    "### Prix Marché",
    `- Fourchette: ${euros(facts.market.lowCents)} à ${euros(facts.market.highCents)}`,
    `- Moyenne: ${euros(facts.market.averageCents)}`,
    `- Marge potentielle: ${signedEuros(margin.amountCents)} (${String(margin.percent).replace(".", ",")} %)`,
    "",
    "### Signaux",
    ...facts.signals.map(
      (signal) =>
        `- ${SIGNAL_MARKS[signal.type]} **${signal.label}**: ${signal.detail}`,
    ),
    "",
    "### Authenticité",
    `Score: ${facts.authenticity.score}/10`,
    ...(facts.authenticity.flags.length > 0
      ? [
          "⚠️ Points d'attention:",
          ...facts.authenticity.flags.map((flag) => `- ${flag}`),
        ]
      : []),
    "",
    "## Négociation",
    "",
    `**Offre suggérée:** ${euros(analysis.suggestedOfferCents().value)}`,
    "",
    "**Script:**",
    `> ${negotiation.script}`,
    "",
    "**Arguments:**",
    ...negotiation.arguments.map((argument) => `- ${argument}`),
    "",
    "## Revente",
    "",
    `- **Prix recommandé:** ${euros(resale.recommendedPriceCents)}`,
    `- **Délai estimé:** ${resale.estimatedDays} jours`,
    `- **Plateformes:** ${resale.platforms.map(({ name }) => PLATFORM_LABELS[name]).join(", ")}`,
    "",
    "**Tips:**",
    ...resale.tips.map((tip) => `- ${TIP_LABELS[tip]}`),
    "",
    "---",
    `*Analysé le ${analyzedOn(analysis.get("analyzedAt"))} par Vinted AI Assistant*`,
  ].join("\n");
}

export function exportAnalysisMarkdown(analysis: Analysis): MarkdownExport {
  return { filename: filenameOf(analysis), markdown: markdownOf(analysis) };
}
