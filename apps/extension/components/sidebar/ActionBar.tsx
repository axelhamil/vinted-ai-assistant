import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STATUS_LABELS, statusActions } from "@/lib/analysis-copy";
import {
  type AnalysisDto,
  type AnalysisStatus,
  sendMessage,
} from "@/lib/messaging/protocol";
import { download } from "@/lib/ui/download";
import { type BackgroundFailure, useBackgroundMutation } from "@/lib/ui/query";

export interface ActionBarProps {
  analysis: AnalysisDto;
  onChange: (analysis: AnalysisDto) => void;
  onReanalyze: () => void;
  reanalyzing: boolean;
}

const showFailure = (error: BackgroundFailure) => toast.error(error.message);

async function copyOffer(script: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(script);
    toast.success("Message d'offre copié");
  } catch {
    toast.error(
      "Impossible de copier le message. Sélectionnez-le dans l'onglet Négocier.",
    );
  }
}

export function ActionBar({
  analysis,
  onChange,
  onReanalyze,
  reanalyzing,
}: ActionBarProps) {
  const { vintedId, status } = analysis;
  const changeStatus = useBackgroundMutation(
    (next: AnalysisStatus) =>
      sendMessage("changeStatus", { vintedId, status: next }),
    (updated) => {
      onChange(updated);
      toast.success(`Article ${STATUS_LABELS[updated.status].toLowerCase()}`);
    },
    showFailure,
  );
  const exportFile = useBackgroundMutation(
    (id: string) => sendMessage("exportAnalysis", id),
    download,
    showFailure,
  );

  return (
    <footer className="sidebar-actions flex flex-col gap-row p-gutter">
      <Button onClick={() => void copyOffer(analysis.negotiation.script)}>
        Copier le message d'offre
      </Button>
      <div className="flex items-center gap-row">
        {status !== "ANALYZED" && (
          <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>
        )}
        {statusActions(status).map((action) => (
          <Button
            key={action.status}
            variant="outline"
            size="sm"
            disabled={changeStatus.isPending}
            onClick={() => changeStatus.mutate(action.status)}
          >
            {action.label}
          </Button>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label="Réanalyser l'annonce"
              disabled={reanalyzing}
              onClick={onReanalyze}
            >
              <RefreshCwIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Réanalyser l'annonce</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Exporter l'analyse"
              disabled={exportFile.isPending}
              onClick={() => exportFile.mutate(vintedId)}
            >
              <DownloadIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exporter l'analyse en Markdown</TooltipContent>
        </Tooltip>
      </div>
    </footer>
  );
}
