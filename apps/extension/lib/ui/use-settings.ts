import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type Settings,
  settings,
  updateSettings,
} from "@/lib/storage/settings";

const SETTINGS_KEY = "settings";

const SAVE_FAILED =
  "Les réglages n'ont pas pu être enregistrés. Rechargez l'extension puis réessayez.";

export function useSettings() {
  const queryClient = useQueryClient();
  const current = useQuery({
    queryKey: [SETTINGS_KEY],
    queryFn: () => settings.getValue(),
  });
  const save = useMutation({
    mutationFn: (change: Partial<Settings>) => updateSettings(change),
    onSuccess: (next) => {
      queryClient.setQueryData([SETTINGS_KEY], next);
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) => queryKey[0] !== SETTINGS_KEY,
      });
    },
    onError: () => toast.error(SAVE_FAILED),
  });

  return { current, save };
}
