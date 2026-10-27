import { OPPORTUNITY_MIN_SCORE } from "@packages/analysis/contract";
import { describe, expect, it } from "vitest";
import { PORTFOLIO_TABS } from "./portfolio-tabs";

describe("PORTFOLIO_TABS", () => {
  it("asks the api for each tab's slice of the portfolio", () => {
    expect(
      PORTFOLIO_TABS.map(({ id, label, query }) => ({ id, label, query })),
    ).toEqual([
      { id: "watching", label: "Surveillance", query: { status: "WATCHING" } },
      { id: "bought", label: "Achats", query: { status: "BOUGHT" } },
      { id: "sold", label: "Ventes", query: { status: "SOLD" } },
      {
        id: "opportunities",
        label: "Opportunités",
        query: { status: "ANALYZED", minScore: String(OPPORTUNITY_MIN_SCORE) },
      },
    ]);
  });
});
