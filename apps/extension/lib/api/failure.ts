export type ApiFailure =
  | { kind: "api"; code: string; message: string; requestId: string }
  | { kind: "network"; message: string }
  | { kind: "disabled" };

export type Reply<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ApiFailure };

export const NETWORK_FAILURE_MESSAGE =
  "Le serveur est injoignable. Vérifiez l'adresse du serveur dans les réglages.";

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

  return {
    kind: "api",
    code: `HTTP_${response.status}`,
    message: `Le serveur a répondu par une erreur ${response.status}. Réessayez dans un instant.`,
    requestId: "",
  };
}
