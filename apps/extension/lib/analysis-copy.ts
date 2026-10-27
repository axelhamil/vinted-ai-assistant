import { NEXT_STATUSES } from "@packages/analysis/contract";
import type {
  AnalysisDto,
  AnalysisStatus,
  NegotiationTone,
} from "@/lib/messaging/protocol";

type Resale = AnalysisDto["resale"];
type Tip = Resale["tips"][number];
type Platform = Resale["platforms"][number];
type Confidence = AnalysisDto["marketPrice"]["confidence"];
type PhotoQuality = AnalysisDto["photoQuality"];

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

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  ANALYZED: "Analysé",
  WATCHING: "Surveillé",
  BOUGHT: "Acheté",
  SOLD: "Vendu",
  ARCHIVED: "Archivé",
};

const STATUS_ACTION_LABELS: Partial<Record<AnalysisStatus, string>> = {
  WATCHING: "Surveiller",
  BOUGHT: "Acheté",
  SOLD: "Vendu",
};

export interface StatusAction {
  status: AnalysisStatus;
  label: string;
}

export const statusActions = (status: AnalysisStatus): StatusAction[] =>
  NEXT_STATUSES[status].flatMap((next) => {
    const label = STATUS_ACTION_LABELS[next];

    return label ? [{ status: next, label }] : [];
  });

export const LIGHTING_LABELS: Record<PhotoQuality["lighting"], string> = {
  good: "bonne",
  average: "moyenne",
  poor: "faible",
};

export const BACKGROUND_LABELS: Record<PhotoQuality["background"], string> = {
  professional: "soigné",
  neutral: "neutre",
  messy: "encombré",
};
