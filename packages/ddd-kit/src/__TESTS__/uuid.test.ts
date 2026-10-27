import { describe, expect, it, spyOn } from "bun:test";
import { UUID, uuidv7 } from "../index";

class RecordingId extends UUID<string> {}

class ClipId extends UUID<string> {}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("uuid", () => {
  it("generates version 7 ids that sort in the order they were created", async () => {
    const first = uuidv7();
    await pause(5);
    const second = uuidv7();
    await pause(5);
    const third = new UUID<string>().value;

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect([third, first, second].sort()).toEqual([first, second, third]);
  });

  it("generates strictly increasing, distinct v7 ids within the same millisecond", () => {
    const ids = Array.from({ length: 20_000 }, () => uuidv7());

    const increasing = ids.every(
      (id, index) => index === 0 || (ids[index - 1] ?? "") < id,
    );

    expect(increasing).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps v7 ids increasing when the clock goes backwards", () => {
    const before = uuidv7();
    const clock = spyOn(Date, "now").mockReturnValue(Date.now() - 60_000);

    const during = uuidv7();
    clock.mockRestore();

    expect(before < during).toBe(true);
  });

  it("is never equal to an id of another type, even with the same value", () => {
    const recordingId = new RecordingId("0199a000-0000-7000-8000-000000000001");
    const clipId = new ClipId("0199a000-0000-7000-8000-000000000001");

    expect(recordingId.equals(clipId)).toBe(false);
  });

  it("parses a uuid into the id type it is called on, trimmed and lowercased", () => {
    const parsed = RecordingId.parse("  0199A000-0000-7000-8000-000000000001 ");

    expect(parsed.getValue()).toBeInstanceOf(RecordingId);
    expect(parsed.getValue().value).toBe(
      "0199a000-0000-7000-8000-000000000001",
    );
    expect(
      parsed
        .getValue()
        .equals(new RecordingId("0199a000-0000-7000-8000-000000000001")),
    ).toBe(true);
  });

  it.each(["nope"])(
    "refuses %p, which is not a uuid, with a plain message",
    (raw) => {
      expect(RecordingId.parse(raw).getError()).toBe(`"${raw}" is not a uuid`);
    },
  );
});
