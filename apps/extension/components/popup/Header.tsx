import { ArrowLeftIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface HeaderProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  settingsOpen: boolean;
  onSettingsToggle: () => void;
  backendError: string | null;
  onOpenSettings: () => void;
}

export function Header({
  enabled,
  onEnabledChange,
  settingsOpen,
  onSettingsToggle,
  backendError,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="popup-header flex flex-col gap-row p-gutter">
      <div className="flex items-center gap-row">
        <h1 className="popup-title flex-1">Assistant Vinted</h1>
        <span
          role="img"
          aria-label={backendError ? "Serveur injoignable" : "Serveur connecté"}
          className="status-dot"
          data-state={backendError ? "down" : "up"}
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
      </div>
      {backendError && (
        <p role="alert" className="error-message">
          {backendError}
        </p>
      )}
      {backendError && !settingsOpen && (
        <Button
          variant="link"
          size="xs"
          className="self-start"
          onClick={onOpenSettings}
        >
          Ouvrir les réglages
        </Button>
      )}
    </header>
  );
}
