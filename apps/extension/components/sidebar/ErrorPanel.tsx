import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface ErrorPanelProps {
  message: string;
  onRetry: () => void;
  secondaryAction?: ReactNode;
}

export function ErrorPanel({
  message,
  onRetry,
  secondaryAction,
}: ErrorPanelProps) {
  return (
    <section
      role="alert"
      className="flex flex-col items-start gap-stack p-gutter"
    >
      <p className="error-message">{message}</p>
      <div className="flex items-center gap-row">
        <Button variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
        {secondaryAction}
      </div>
    </section>
  );
}
