import { describe, expect, it } from "vitest";
import type { Reply } from "@/lib/api/failure";
import type { EditedPhotoDto, EditInput } from "@/lib/messaging/protocol";
import { editPhotoJob, runEdits, toFile } from "./edit-queue";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const EDITED: EditedPhotoDto = {
  mimeType: "image/png",
  imageBase64: "aGVsbG8=",
};

describe("runEdits", () => {
  it("runs at most three edits at a time, in input order, past a failure", async () => {
    let inFlight = 0;
    let peak = 0;
    const jobs = Array.from({ length: 7 }, (_, index) => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
      if (index === 2) throw new Error("edit failed");

      return index;
    });

    const results = await runEdits(jobs);

    expect(peak).toBe(3);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
      "rejected",
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "fulfilled",
    ]);
    expect(
      results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      ),
    ).toEqual([0, 1, 3, 4, 5, 6]);
  });
});

describe("toFile", () => {
  it("decodes the edited photo into a file of its type", () => {
    const file = toFile(EDITED, "pull-retouche.png");

    expect(file.type).toBe("image/png");
    expect(file.size).toBe(5);
    expect(file.name).toBe("pull-retouche.png");
  });
});

describe("editPhotoJob", () => {
  const source = new File(["x"], "pull.heic", { type: "image/heic" });

  it("marks a photo the browser cannot decode as unreadable without calling the api", async () => {
    const sent: EditInput[] = [];

    const outcome = await editPhotoJob(
      source,
      { presetId: "preset-white-studio" },
      {
        downscale: () => Promise.reject(new Error("decode failed")),
        send: async (input) => {
          sent.push(input);
          return { ok: true, data: EDITED };
        },
      },
    );

    expect(outcome).toEqual({ ok: false, failure: { kind: "unreadable" } });
    expect(sent).toEqual([]);
  });

  it("keeps the api failure of a rejected edit", async () => {
    const failed: Reply<EditedPhotoDto> = {
      ok: false,
      failure: {
        kind: "api",
        code: "REQUEST_TOO_LARGE",
        message: "Trop lourd",
        requestId: "r1",
      },
    };

    const outcome = await editPhotoJob(
      source,
      { instruction: "Fond blanc uni" },
      {
        downscale: async () => "data:image/jpeg;base64,AAAA",
        send: async () => failed,
      },
    );

    expect(outcome).toEqual(failed);
  });

  it("returns the edited file named after its source", async () => {
    const outcome = await editPhotoJob(
      source,
      { presetId: "preset-white-studio" },
      {
        downscale: async () => "data:image/jpeg;base64,AAAA",
        send: async () => ({ ok: true, data: EDITED }),
      },
    );

    expect(outcome.ok && outcome.data.name).toBe("pull-retouche.png");
  });
});
