import { storage } from "#imports";

export interface Settings {
  backendUrl: string;
  autoOpenSidebar: boolean;
  enabled: boolean;
}

interface LegacySettings extends Settings {
  scoreThreshold: number;
}

export const DEFAULT_SETTINGS: Settings = {
  backendUrl: "http://localhost:3000",
  autoOpenSidebar: true,
  enabled: true,
};

const WEB_PROTOCOLS = new Set(["http:", "https:"]);

export function normalizeBackendUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!URL.canParse(trimmed)) return null;

  return WEB_PROTOCOLS.has(new URL(trimmed).protocol) ? trimmed : null;
}

export const settings = storage.defineItem<Settings>(
  "local:vinted_ai_settings",
  {
    fallback: DEFAULT_SETTINGS,
    version: 2,
    migrations: {
      2: ({
        backendUrl,
        autoOpenSidebar,
        enabled,
      }: LegacySettings): Settings => ({
        backendUrl:
          normalizeBackendUrl(backendUrl) ?? DEFAULT_SETTINGS.backendUrl,
        autoOpenSidebar,
        enabled,
      }),
    },
  },
);
