import { describe, expect, it } from "bun:test";
import { Option, Result } from "@packages/ddd-kit";
import { mockPort } from "@packages/testing/port-mock";
import {
  buildAnalysis,
  buildFacts,
  buildListing,
} from "../../testing/analysis.factory";
import type { IAnalysisRepository } from "../ports/analysis.repository.port";
import { PortfolioService } from "./portfolio.service";

function given() {
  const repository = mockPort<IAnalysisRepository>();
  repository.findByVintedId.mockResolvedValue(Result.ok(Option.none()));
  repository.delete.mockResolvedValue(Result.fail("ANALYSIS_NOT_FOUND"));

  return { repository, portfolio: new PortfolioService(repository) };
}

describe("reading the portfolio", () => {
  it.each([
    { by: "get", read: (p: PortfolioService) => p.get({ vintedId: "42" }) },
    {
      by: "export",
      read: (p: PortfolioService) => p.exportMarkdown({ vintedId: "42" }),
    },
    {
      by: "delete",
      read: (p: PortfolioService) => p.delete({ vintedId: "42" }),
    },
  ])("answers not found on $by for an unknown listing", async ({ read }) => {
    const { portfolio } = given();

    const result = await read(portfolio);

    expect(result.getError()).toBe("ANALYSIS_NOT_FOUND");
  });

  it.each([
    { offset: 0, total: 3, hasMore: true },
    { offset: 2, total: 3, hasMore: false },
  ])(
    "tells whether more items follow at offset $offset of $total",
    async ({ offset, total, hasMore }) => {
      const { repository, portfolio } = given();
      repository.list.mockResolvedValue(
        Result.ok({ items: [buildAnalysis()], total }),
      );

      const result = await portfolio.list({ limit: 2, offset });

      expect(result.getValue().hasMore).toBe(hasMore);
    },
  );

  it("exports a negative margin with its sign and the portfolio status", async () => {
    const { repository, portfolio } = given();
    const analysis = buildAnalysis({
      listing: buildListing({ priceCents: 3500 }),
      facts: buildFacts({ lowCents: 2000, averageCents: 3000 }),
      status: "WATCHING",
    });
    repository.findByVintedId.mockResolvedValue(
      Result.ok(Option.some(analysis)),
    );

    const result = await portfolio.exportMarkdown({ vintedId: "4815162342" });

    const { filename, markdown } = result.getValue();
    expect(filename).toBe("levi-s_veste-en-jean-levi-s_2026-10-27.md");
    expect(markdown).toContain("Marge potentielle: -5 € (-14,3 %)");
    expect(markdown).toContain("- **Statut:** Surveillé");
  });
});
