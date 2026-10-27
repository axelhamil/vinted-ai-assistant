import { useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ScoreSticker } from "@/components/sidebar/ScoreSticker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEXT_STATUSES, STATUS_LABELS } from "@/lib/analysis-status";
import { euros, percent } from "@/lib/format";
import {
  type AnalysisStatus,
  type PortfolioDto,
  sendMessage,
} from "@/lib/messaging/protocol";
import { download } from "@/lib/ui/download";
import { type BackgroundFailure, useBackgroundMutation } from "@/lib/ui/query";
import { useConfirmClick } from "@/lib/ui/use-confirm-click";

export interface PortfolioRowProps {
  item: PortfolioDto["items"][number];
}

const showFailure = (error: BackgroundFailure) => toast.error(error.message);

function isStatus(value: string): value is AnalysisStatus {
  return value in STATUS_LABELS;
}

export function PortfolioRow({ item }: PortfolioRowProps) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    void queryClient.invalidateQueries({ queryKey: ["portfolio-stats"] });
  };
  const changeStatus = useBackgroundMutation(
    (status: AnalysisStatus) =>
      sendMessage("changeStatus", { vintedId: item.vintedId, status }),
    (updated) => {
      toast.success(`Article ${STATUS_LABELS[updated.status].toLowerCase()}`);
      refresh();
    },
  );
  const exportFile = useBackgroundMutation(
    (vintedId: string) => sendMessage("exportAnalysis", vintedId),
    download,
  );
  const remove = useBackgroundMutation(
    (vintedId: string) => sendMessage("deleteAnalysis", vintedId),
    () => {
      toast.success("Supprimé");
      refresh();
    },
  );
  const confirmDelete = useConfirmClick(() =>
    remove.mutate(item.vintedId, { onError: showFailure }),
  );
  const nextStatuses = NEXT_STATUSES[item.status];

  return (
    <article className="portfolio-row grid h-full grid-cols-[2.5rem_1fr_auto] items-center gap-x-stack px-gutter">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="photo-thumb row-span-2 size-10"
        />
      ) : (
        <span className="photo-thumb row-span-2 size-10" />
      )}
      <Button
        asChild
        variant="link"
        size="xs"
        className="min-w-0 justify-start"
      >
        <a href={item.url} target="_blank" rel="noreferrer">
          <span className="truncate">{item.title}</span>
        </a>
      </Button>
      <ScoreSticker
        score={item.score}
        margin={percent(item.marginPercent)}
        size="mini"
      />
      <div className="col-span-2 flex items-center gap-row">
        <span className="fact-value flex-1">{euros(item.price)}</span>
        <Select
          value={item.status}
          disabled={nextStatuses.length === 0 || changeStatus.isPending}
          onValueChange={(value) => {
            if (isStatus(value) && value !== item.status)
              changeStatus.mutate(value, { onError: showFailure });
          }}
        >
          <SelectTrigger size="sm" aria-label="Changer le statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={item.status} disabled>
              {STATUS_LABELS[item.status]}
            </SelectItem>
            {nextStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Exporter l'analyse"
          disabled={exportFile.isPending}
          onClick={() =>
            exportFile.mutate(item.vintedId, { onError: showFailure })
          }
        >
          <DownloadIcon />
        </Button>
        <Button
          variant="destructive"
          size={confirmDelete.armed ? "sm" : "icon-sm"}
          aria-label={
            confirmDelete.armed ? "Confirmer la suppression" : "Supprimer"
          }
          disabled={remove.isPending}
          onClick={confirmDelete.click}
        >
          {confirmDelete.armed ? "Confirmer" : <Trash2Icon />}
        </Button>
      </div>
    </article>
  );
}
