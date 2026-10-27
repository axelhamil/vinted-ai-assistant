import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/popup/Header";
import { PortfolioTabs } from "@/components/popup/PortfolioTabs";
import { SettingsView } from "@/components/popup/SettingsView";
import { StatsRow } from "@/components/popup/StatsRow";
import { sendMessage } from "@/lib/messaging/protocol";
import {
  DEFAULT_SETTINGS,
  type Settings,
  settings,
} from "@/lib/storage/settings";
import { useBackground } from "@/lib/ui/query";

const SAVE_FAILED =
  "Les réglages n'ont pas pu être enregistrés. Rechargez l'extension puis réessayez.";

export function App() {
  const [view, setView] = useState<"portfolio" | "settings">("portfolio");
  const queryClient = useQueryClient();
  const current = useQuery({
    queryKey: ["settings"],
    queryFn: () => settings.getValue().catch(() => DEFAULT_SETTINGS),
  });
  const backend = useBackground({
    key: ["backend"],
    request: () => sendMessage("checkBackend", undefined),
  });
  const save = useMutation({
    mutationFn: async (next: Settings) => {
      await settings.setValue(next);
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["settings"], next);
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) => queryKey[0] !== "settings",
      });
    },
    onError: () => toast.error(SAVE_FAILED),
  });

  const values = current.data;
  if (!values) return null;

  return (
    <main className="flex h-140 w-90 flex-col">
      <Header
        enabled={values.enabled}
        onEnabledChange={(enabled) => save.mutate({ ...values, enabled })}
        settingsOpen={view === "settings"}
        onSettingsToggle={() =>
          setView(view === "settings" ? "portfolio" : "settings")
        }
        backendError={
          backend.isFetching ? null : (backend.error?.message ?? null)
        }
        onOpenSettings={() => setView("settings")}
      />
      {view === "settings" ? (
        <SettingsView
          settings={values}
          saving={save.isPending}
          onSave={(form) =>
            save.mutate(
              { ...values, ...form },
              { onSuccess: () => toast.success("Réglages enregistrés") },
            )
          }
        />
      ) : values.enabled ? (
        <>
          <StatsRow />
          <PortfolioTabs />
        </>
      ) : (
        <p className="popup-note p-gutter">
          L'assistant est désactivé. Les annonces Vinted s'affichent sans
          analyse.
        </p>
      )}
    </main>
  );
}
