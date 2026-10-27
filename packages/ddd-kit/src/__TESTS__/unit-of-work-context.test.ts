import { describe, expect, it } from "bun:test";
import { UnitOfWorkContext } from "../index";

describe("UnitOfWorkContext", () => {
  it("should expose the ambient transaction only inside the unit of work", async () => {
    const tx = { name: "tx-1" };

    const inside = await UnitOfWorkContext.run(tx, async () =>
      UnitOfWorkContext.transaction<typeof tx>(),
    );

    expect(inside).toBe(tx);
    expect(UnitOfWorkContext.transaction()).toBeUndefined();
  });
});
