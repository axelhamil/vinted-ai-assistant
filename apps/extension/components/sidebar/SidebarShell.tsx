import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface SidebarShellProps {
  header: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function SidebarShell({
  header,
  actions,
  onClose,
  children,
}: SidebarShellProps) {
  return (
    <aside
      aria-label="Assistant Vinted"
      className="sidebar-panel fixed inset-y-0 right-0 z-2147483000 flex w-sidebar max-w-full flex-col"
    >
      <header className="sidebar-header flex items-start justify-between gap-stack p-gutter">
        {header}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Fermer l'assistant"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
      {actions}
    </aside>
  );
}
