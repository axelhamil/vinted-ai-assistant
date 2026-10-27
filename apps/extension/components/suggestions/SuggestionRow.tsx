import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface SuggestionRowProps {
  label: string;
  value: string;
  onUse: () => void;
  children?: ReactNode;
}

export function SuggestionRow({
  label,
  value,
  onUse,
  children,
}: SuggestionRowProps) {
  return (
    <li className="flex flex-col gap-row">
      <div className="flex items-center justify-between gap-stack">
        <h3 className="section-title">{label}</h3>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Utiliser : ${label}`}
          onClick={onUse}
        >
          Utiliser
        </Button>
      </div>
      <p className="suggestion-value">{value}</p>
      {children}
    </li>
  );
}
