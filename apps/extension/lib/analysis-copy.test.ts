import { describe, expect, it } from "vitest";
import { statusActions } from "./analysis-copy";

describe("statusActions", () => {
  it.each([
    { status: "ANALYZED", actions: ["Surveiller", "Acheté"] },
    { status: "WATCHING", actions: ["Acheté"] },
    { status: "BOUGHT", actions: ["Vendu"] },
    { status: "SOLD", actions: [] },
    { status: "ARCHIVED", actions: [] },
  ] as const)("offers $actions on a $status item", ({ status, actions }) => {
    expect(statusActions(status).map(({ label }) => label)).toEqual(actions);
  });
});
