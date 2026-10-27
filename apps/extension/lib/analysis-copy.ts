import type { AnalysisDto, NegotiationTone } from "@/lib/messaging/protocol";

type Resale = AnalysisDto["resale"];
type Tip = Resale["tips"][number];
type Platform = Resale["platforms"][number];
type Confidence = AnalysisDto["marketPrice"]["confidence"];

export const TIP_LABELS: Record<Tip, string> = {
  HIGH_MARGIN: "La marge est confortable : vous pouvez revendre vite.",
  HIGHLIGHT_BRAND: "Mettez la marque en avant dans le titre.",
  RETAKE_PHOTOS: "Reprenez les photos en lumière naturelle.",
  DETAILED_DESCRIPTION: "Détaillez l'état, les mesures et la matière.",
};

export const PLATFORM_LABELS: Record<Platform["name"], string> = {
  vinted: "Vinted",
  leboncoin: "Leboncoin",
  "vestiaire-collective": "Vestiaire Collective",
};

export const RELEVANCE_LABELS: Record<Platform["relevance"], string> = {
  high: "très adaptée",
  medium: "adaptée",
  low: "peu adaptée",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "fiable",
  medium: "à confirmer",
  low: "incertaine",
};

export const TONE_LABELS: Record<NegotiationTone, string> = {
  friendly: "Amical",
  direct: "Direct",
  urgent: "Pressé",
};

export const TONES: readonly NegotiationTone[] = [
  "friendly",
  "direct",
  "urgent",
];
