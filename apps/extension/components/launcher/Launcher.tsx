import { ScoreSticker } from "@/components/sidebar/ScoreSticker";
import { Button } from "@/components/ui/button";
import type { AnalysisDto } from "@/lib/messaging/protocol";

export interface LauncherProps {
  analysis: AnalysisDto | undefined;
  onOpen: () => void;
}

export function Launcher({ analysis, onOpen }: LauncherProps) {
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
      {analysis ? "Voir l'analyse" : "Analyser l'annonce"}
    </Button>
  );
}
