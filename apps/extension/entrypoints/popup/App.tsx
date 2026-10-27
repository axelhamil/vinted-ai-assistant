import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/popup/Header";
import { PortfolioTabs } from "@/components/popup/PortfolioTabs";
import { SettingsView } from "@/components/popup/SettingsView";
import { StatsRow } from "@/components/popup/StatsRow";
import { ErrorPanel } from "@/components/sidebar/ErrorPanel";
import { Button } from "@/components/ui/button";
import { LOCAL_FAILURE_MESSAGE } from "@/lib/api/failure";
import { sendMessage } from "@/lib/messaging/protocol";
import { useBackground } from "@/lib/ui/query";
import { useSettings } from "@/lib/ui/use-settings";

export function App() {
  const [view, setView] = useState<"portfolio" | "settings">("portfolio");
  const { current, save } = useSettings();
  const backend = useBackground({
    key: ["backend"],
    request: () => sendMessage("checkBackend", undefined),
  });

  if (current.isError)
    return (
      <main className="popup-panel flex h-140 w-90 flex-col">
        <ErrorPanel
          message={LOCAL_FAILURE_MESSAGE}
          onRetry={() => void current.refetch()}
        />
      </main>
    );

  const values = current.data;
  if (!values) return null;

  const backendError = backend.isFetching ? null : backend.error;
  const settingsOpen = view === "settings";

  return (
    <main className="popup-panel flex h-140 w-90 flex-col">
      <Header
        enabled={values.enabled}
        onEnabledChange={(enabled) => save.mutate({ enabled })}
        settingsOpen={settingsOpen}
        onSettingsToggle={() =>
          setView(settingsOpen ? "portfolio" : "settings")
        }
        backendDown={backendError !== null}
      />
      {backendError && (
        <ErrorPanel
          message={backendError.message}
          onRetry={() => void backend.refetch()}
          secondaryAction={
            !settingsOpen && (
              <Button variant="link" onClick={() => setView("settings")}>
                Ouvrir les réglages
              </Button>
            )
          }
        />
      )}
      {settingsOpen ? (
        <SettingsView
          settings={values}
          saving={save.isPending}
          onSave={(form) =>
            save.mutate(form, {
              onSuccess: () => toast.success("Réglages enregistrés"),
            })
          }
        />
      ) : !values.enabled ? (
        <p className="popup-note p-gutter">
          L'assistant est désactivé. Les annonces Vinted s'affichent sans
          analyse.
        </p>
      ) : (
        !backendError && (
          <>
            <StatsRow />
            <PortfolioTabs />
          </>
        )
      )}
    </main>
  );
}
