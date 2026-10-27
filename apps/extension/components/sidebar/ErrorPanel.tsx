import { Button } from "@/components/ui/button";

export interface ErrorPanelProps {
  message: string;
  onRetry: () => void;
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <section
      role="alert"
      className="flex flex-col items-start gap-stack p-gutter"
    >
      <p className="error-message">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Réessayer
      </Button>
    </section>
  );
}
