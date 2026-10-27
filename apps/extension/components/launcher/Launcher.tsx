import { ScoreSticker } from "@/components/sidebar/ScoreSticker";
import { Button } from "@/components/ui/button";
import type { AnalysisDto } from "@/lib/messaging/protocol";

export interface LauncherProps {
  label: string;
  analysis?: AnalysisDto;
  onOpen: () => void;
}

export function Launcher({ label, analysis, onOpen }: LauncherProps) {
  return (
    <Button
      size="lg"
      className="fixed right-gutter bottom-gutter z-2147483000"
      onClick={onOpen}
    >
      {analysis && (
        <ScoreSticker
          score={analysis.opportunity.score}
          margin={analysis.opportunity.margin}
          size="mini"
        />
      )}
      {label}
    </Button>
  );
}
