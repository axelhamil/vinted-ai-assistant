import { z } from "zod";
import { normalizeBackendUrl, type Settings } from "@/lib/storage/settings";

type SettingsForm = Pick<Settings, "backendUrl" | "autoOpenSidebar">;

type SettingsFormResult =
  | { ok: true; value: SettingsForm }
  | { ok: false; message: string };

const INVALID_URL_MESSAGE =
  "Saisissez une adresse http ou https, par exemple http://localhost:3000.";

const settingsFormSchema = z.object({
  backendUrl: z
    .string()
    .transform((raw) => normalizeBackendUrl(raw))
    .pipe(z.string({ error: INVALID_URL_MESSAGE })),
  autoOpenSidebar: z.boolean(),
});

export function parseSettingsForm(raw: SettingsForm): SettingsFormResult {
  const result = settingsFormSchema.safeParse(raw);
  if (!result.success)
    return {
      ok: false,
      message: result.error.issues[0]?.message ?? INVALID_URL_MESSAGE,
    };

  return { ok: true, value: result.data };
}
