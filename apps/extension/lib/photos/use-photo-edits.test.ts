import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Reply } from "@/lib/api/failure";
import type { EditedPhotoDto, EditInput } from "@/lib/messaging/protocol";
import { createQueryClient } from "@/lib/ui/query";
import { usePhotoEdits } from "./use-photo-edits";

function renderEdits(deps: ReturnType<typeof controlledApi>["deps"]) {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);

  return renderHook(() => usePhotoEdits(deps), { wrapper });
}

const EDITED: EditedPhotoDto = {
  mimeType: "image/png",
  imageBase64: "aGVsbG8=",
};

const MODE = { presetId: "preset-white-studio" };

const photo = (index: number) =>
  new File(["x"], `photo-${index}.jpg`, { type: "image/jpeg" });

interface Pending {
  input: EditInput;
  resolve: (reply: Reply<EditedPhotoDto>) => void;
}

function controlledApi() {
  const pending: Pending[] = [];
  const sent: string[] = [];
  let inFlight = 0;
  let peak = 0;

  return {
    pending,
    sent,
    peak: () => peak,
    deps: {
      downscale: async (file: Blob) =>
        `data:${file instanceof File ? file.name : ""}`,
      send: (input: EditInput) =>
        new Promise<Reply<EditedPhotoDto>>((resolve) => {
          sent.push(input.image);
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          pending.push({
            input,
            resolve: (reply) => {
              inFlight -= 1;
              resolve(reply);
            },
          });
        }),
    },
  };
}

async function answerAll(
  api: ReturnType<typeof controlledApi>,
  reply: Reply<EditedPhotoDto>,
  count: number,
): Promise<void> {
  for (let answered = 0; answered < count; answered += 1) {
    await waitFor(() => expect(api.pending.length).toBeGreaterThan(0));
    await act(async () => api.pending.shift()?.resolve(reply));
  }
}

describe("usePhotoEdits", () => {
  it("never runs more than three edits nor sends a photo twice when edit is clicked twice", async () => {
    const api = controlledApi();
    const { result } = renderEdits(api.deps);
    act(() =>
      result.current.choose(
        Array.from({ length: 7 }, (_, index) => photo(index)),
      ),
    );

    act(() => {
      result.current.edit(MODE);
      result.current.edit(MODE);
    });
    await waitFor(() => expect(api.pending).toHaveLength(3));
    act(() => result.current.edit(MODE));
    await answerAll(api, { ok: true, data: EDITED }, 7);

    await waitFor(() => expect(result.current.editing).toBe(false));
    expect(api.peak()).toBe(3);
    expect(new Set(api.sent).size).toBe(7);
    expect(api.sent).toHaveLength(7);
    expect(result.current.jobs.every((job) => job.status === "done")).toBe(
      true,
    );
  });

  it("keeps the previous edit of a photo when its new edit fails", async () => {
    const api = controlledApi();
    const { result } = renderEdits(api.deps);
    act(() => result.current.choose([photo(0)]));
    act(() => result.current.edit(MODE));
    await answerAll(api, { ok: true, data: EDITED }, 1);
    await waitFor(() => expect(result.current.editing).toBe(false));
    const previous = result.current.jobs[0]?.edited;

    act(() =>
      result.current.edit({ instruction: "Fond blanc uni et lumière douce" }),
    );
    await waitFor(() => expect(result.current.jobs[0]?.status).toBe("editing"));
    expect(result.current.jobs[0]?.edited).toBe(previous);
    await answerAll(
      api,
      {
        ok: false,
        failure: { kind: "network", message: "Serveur injoignable" },
      },
      1,
    );

    await waitFor(() => expect(result.current.jobs[0]?.status).toBe("failed"));
    expect(previous).toBeInstanceOf(File);
    expect(result.current.jobs[0]?.edited).toBe(previous);
  });
});
