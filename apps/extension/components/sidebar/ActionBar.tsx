import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type AnalysisDto, sendMessage } from "@/lib/messaging/protocol";
import { download } from "@/lib/ui/download";
import { type BackgroundFailure, useBackgroundMutation } from "@/lib/ui/query";

export interface ActionBarProps {
  analysis: AnalysisDto;
  onChange: (analysis: AnalysisDto) => void;
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

export function ActionBar({ analysis, onChange }: ActionBarProps) {
  const watch = useBackgroundMutation(
    (vintedId: string) =>
      sendMessage("changeStatus", { vintedId, status: "WATCHING" }),
    (updated) => {
      onChange(updated);
      toast.success("Article surveillé");
    },
  );
  const exportFile = useBackgroundMutation(
    (vintedId: string) => sendMessage("exportAnalysis", vintedId),
    download,
  );
  const watching = analysis.status === "WATCHING";

  return (
    <footer className="sidebar-actions flex items-center gap-row p-gutter">
      <Button
        className="flex-1"
        onClick={() => void copyOffer(analysis.negotiation.script)}
      >
        Copier le message d'offre
      </Button>
      <Button
        variant="outline"
        disabled={watching || watch.isPending}
        onClick={() =>
          watch.mutate(analysis.vintedId, { onError: showFailure })
        }
      >
        {watching ? "Surveillé" : "Surveiller"}
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Exporter l'analyse"
            disabled={exportFile.isPending}
            onClick={() =>
              exportFile.mutate(analysis.vintedId, { onError: showFailure })
            }
          >
            <DownloadIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exporter l'analyse en Markdown</TooltipContent>
      </Tooltip>
    </footer>
  );
}
