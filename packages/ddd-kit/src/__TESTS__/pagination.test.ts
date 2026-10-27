import { describe, expect, it } from "bun:test";
import { createPaginatedResult } from "../index";

describe("createPaginatedResult", () => {
  it("counts a partial last page as a page", () => {
    const { pagination } = createPaginatedResult(
      [1, 2, 3],
      { page: 1, limit: 3 },
      7,
    );

    expect(pagination.totalPages).toBe(3);
  });

  it("describes an empty result as zero pages without neighbours", () => {
    const { data, pagination } = createPaginatedResult(
      [],
      { page: 1, limit: 10 },
      0,
    );

    expect(data).toEqual([]);
    expect(pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
