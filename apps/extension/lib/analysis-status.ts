import type { AnalysisStatus } from "@/lib/messaging/protocol";

export const NEXT_STATUSES: Record<AnalysisStatus, readonly AnalysisStatus[]> =
  {
    ANALYZED: ["WATCHING", "BOUGHT", "ARCHIVED"],
    WATCHING: ["BOUGHT", "ARCHIVED"],
    BOUGHT: ["SOLD", "ARCHIVED"],
    SOLD: ["ARCHIVED"],
    ARCHIVED: [],
  };

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  ANALYZED: "Analysé",
  WATCHING: "Surveillé",
  BOUGHT: "Acheté",
  SOLD: "Vendu",
  ARCHIVED: "Archivé",
};
