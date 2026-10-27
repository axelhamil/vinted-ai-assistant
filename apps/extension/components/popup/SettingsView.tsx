import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Settings } from "@/lib/storage/settings";
import { parseSettingsForm } from "@/lib/storage/settings-form";

export interface SettingsViewProps {
  settings: Settings;
  saving: boolean;
  onSave: (form: Pick<Settings, "backendUrl" | "autoOpenSidebar">) => void;
}

export function SettingsView({ settings, saving, onSave }: SettingsViewProps) {
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl);
  const [autoOpenSidebar, setAutoOpenSidebar] = useState(
    settings.autoOpenSidebar,
  );
  const [error, setError] = useState<string | null>(null);
  const urlId = useId();
  const autoOpenId = useId();
  const errorId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseSettingsForm({ backendUrl, autoOpenSidebar });
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(null);
    setBackendUrl(result.value.backendUrl);
    onSave(result.value);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-section p-gutter">
      <div className="flex flex-col gap-row">
        <label htmlFor={urlId} className="section-title">
          Adresse du serveur
        </label>
        <Input
          id={urlId}
          value={backendUrl}
          onChange={(event) => setBackendUrl(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          inputMode="url"
          spellCheck={false}
        />
        {error && (
          <span id={errorId} className="fact-note tone-loss">
            {error}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-stack">
        <label htmlFor={autoOpenId} className="section-title">
          Ouvrir l'analyse automatiquement sur une annonce
        </label>
        <Switch
          id={autoOpenId}
          checked={autoOpenSidebar}
          onCheckedChange={setAutoOpenSidebar}
        />
      </div>
      <Button type="submit" disabled={saving} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
