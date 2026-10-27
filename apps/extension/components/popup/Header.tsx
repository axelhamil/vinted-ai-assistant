import { ArrowLeftIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface HeaderProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  settingsOpen: boolean;
  onSettingsToggle: () => void;
  backendDown: boolean;
}

export function Header({
  enabled,
  onEnabledChange,
  settingsOpen,
  onSettingsToggle,
  backendDown,
}: HeaderProps) {
  return (
    <header className="popup-header flex items-center gap-row p-gutter">
      <h1 className="popup-title flex-1">Assistant Vinted</h1>
      <span
        role="img"
        aria-label={backendDown ? "Serveur injoignable" : "Serveur connecté"}
        className="status-dot"
        data-state={backendDown ? "down" : "up"}
      />
      <Switch
        checked={enabled}
        onCheckedChange={onEnabledChange}
        aria-label="Activer l'assistant"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={settingsOpen ? "Retour au portefeuille" : "Réglages"}
        onClick={onSettingsToggle}
      >
        {settingsOpen ? <ArrowLeftIcon /> : <SettingsIcon />}
      </Button>
    </header>
  );
}
