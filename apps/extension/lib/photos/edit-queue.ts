import type { ApiFailure, Reply } from "@/lib/api/failure";
import type { EditedPhotoDto, EditInput } from "@/lib/messaging/protocol";
import { failureMessage, UNREACHABLE_FAILURE } from "@/lib/ui/query";

export type PhotoFailure = ApiFailure | { kind: "unreadable" };

export interface PhotoJob {
  id: string;
  source: File;
  status: "idle" | "editing" | "done" | "failed";
  edited?: File;
  failure?: PhotoFailure;
}

export type EditMode = { presetId: string } | { instruction: string };

export interface EditDeps {
  downscale: (file: Blob) => Promise<string>;
  send: (input: EditInput) => Promise<Reply<EditedPhotoDto>>;
}

export type EditOutcome =
  | { ok: true; data: File }
  | { ok: false; failure: PhotoFailure };

export const UNREADABLE_PHOTO_MESSAGE = "Format de photo non pris en charge";

export const EDITED_UNREADABLE_MESSAGE =
  "La photo retouchée est illisible. Relancez la retouche.";

const DEFAULT_CONCURRENCY = 3;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const photoFailureMessage = (failure: PhotoFailure): string =>
  failure.kind === "unreadable"
    ? UNREADABLE_PHOTO_MESSAGE
    : failureMessage(failure);

export async function runEdits<T>(
  jobs: (() => Promise<T>)[],
  concurrency = DEFAULT_CONCURRENCY,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(jobs.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < jobs.length) {
      const index = next;
      next += 1;
      const job = jobs[index];
      if (!job) continue;

      try {
        results[index] = { status: "fulfilled", value: await job() };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, worker),
  );

  return results;
}

export function toFile(
  { mimeType, imageBase64 }: EditedPhotoDto,
  name: string,
): File {
  const binary = atob(imageBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new File([bytes], name, { type: mimeType });
}

const editedName = (source: string, mimeType: string): string => {
  const base = source.replace(/\.[^.]+$/, "");

  return `${base}-retouche.${EXTENSIONS[mimeType] ?? "jpg"}`;
};

export async function editPhotoJob(
  source: File,
  mode: EditMode,
  { downscale, send }: EditDeps,
): Promise<EditOutcome> {
  const image = await downscale(source).catch(() => null);
  if (image === null) return { ok: false, failure: { kind: "unreadable" } };

  const reply = await send({ image, ...mode }).catch(
    (): Reply<EditedPhotoDto> => ({ ok: false, failure: UNREACHABLE_FAILURE }),
  );
  if (!reply.ok) return reply;

  try {
    return {
      ok: true,
      data: toFile(reply.data, editedName(source.name, reply.data.mimeType)),
    };
  } catch {
    return {
      ok: false,
      failure: { kind: "local", message: EDITED_UNREADABLE_MESSAGE },
    };
  }
}
