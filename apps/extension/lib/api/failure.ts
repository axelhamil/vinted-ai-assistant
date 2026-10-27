export type ApiFailure =
  | { kind: "api"; code: string; message: string; requestId: string }
  | { kind: "network"; message: string }
  | { kind: "local"; message: string }
  | { kind: "disabled" };

export type Reply<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ApiFailure };

export const NETWORK_FAILURE_MESSAGE =
  "Le serveur est injoignable. Vérifiez l'adresse du serveur dans les réglages.";

export const LOCAL_FAILURE_MESSAGE =
  "L'extension n'a pas pu lire ses données locales. Rechargez l'extension puis réessayez.";

interface ErrorBody {
  error: { code: string; message: string; requestId: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorBody(value: unknown): value is ErrorBody {
  if (!isRecord(value) || !isRecord(value.error)) return false;

  const { code, message, requestId } = value.error;

  return (
    typeof code === "string" &&
    typeof message === "string" &&
    typeof requestId === "string"
  );
}

function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function toFailure(
  response: Response | Error,
): Promise<ApiFailure> {
  if (response instanceof Error)
    return { kind: "network", message: NETWORK_FAILURE_MESSAGE };

  const body = parsedJson(await response.text().catch(() => ""));
  if (isErrorBody(body)) return { kind: "api", ...body.error };

  return unreadableFailure(response.status);
}

export function unreadableFailure(status: number): ApiFailure {
  return {
    kind: "api",
    code: `HTTP_${status}`,
    message: `Le serveur a répondu par une réponse illisible (${status}). Réessayez dans un instant.`,
    requestId: "",
  };
}
