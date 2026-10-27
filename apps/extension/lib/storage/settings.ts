import { storage } from "#imports";

export interface Settings {
  backendUrl: string;
  autoOpenSidebar: boolean;
  enabled: boolean;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function fromLegacy(legacy: unknown): Settings {
  const fields = isRecord(legacy) ? legacy : {};
  const backendUrl =
    typeof fields.backendUrl === "string"
      ? normalizeBackendUrl(fields.backendUrl)
      : null;

  return {
    backendUrl: backendUrl ?? DEFAULT_SETTINGS.backendUrl,
    autoOpenSidebar: booleanOr(
      fields.autoOpenSidebar,
      DEFAULT_SETTINGS.autoOpenSidebar,
    ),
    enabled: booleanOr(fields.enabled, DEFAULT_SETTINGS.enabled),
  };
}

export const settings = storage.defineItem<Settings>(
  "local:vinted_ai_settings",
  {
    fallback: DEFAULT_SETTINGS,
    version: 2,
    migrations: {
      2: fromLegacy,
    },
  },
);

export async function enabledSettings(): Promise<Settings | null> {
  const current = await settings.getValue().catch(() => DEFAULT_SETTINGS);

  return current.enabled ? current : null;
}
