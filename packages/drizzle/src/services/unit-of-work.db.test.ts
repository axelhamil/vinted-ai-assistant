import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { Result } from "@packages/ddd-kit";
import { sql } from "drizzle-orm";
import { db } from "../config";
import { DrizzleUnitOfWork, resolveExecutor } from "./unit-of-work";

const unitOfWork = new DrizzleUnitOfWork();

async function insertRow(): Promise<void> {
  await resolveExecutor().execute(
    sql`insert into uow_probe (id) values (gen_random_uuid())`,
  );
}

async function rowCount(): Promise<number> {
  const { rows } = await db.execute<{ count: number }>(
    sql`select count(*)::int as count from uow_probe`,
  );

  return rows[0]?.count ?? 0;
}

beforeAll(async () => {
  await db.execute(sql`create table uow_probe (id uuid primary key)`);
});

beforeEach(async () => {
  await db.execute(sql`truncate uow_probe`);
});

describe("the drizzle unit of work", () => {
  it("commits writes when the work returns ok", async () => {
    await unitOfWork.run(async () => {
      await insertRow();

      return Result.ok();
    });

    expect(await rowCount()).toBe(1);
  });

  it("rolls back writes and returns the failure when the work returns fail", async () => {
    const result = await unitOfWork.run(async () => {
      await insertRow();

      return Result.fail("x");
    });

    expect(result.getError()).toBe("x");
    expect(await rowCount()).toBe(0);
  });

  it("joins the outer transaction in a nested run", async () => {
    await unitOfWork.run(async () => {
      await insertRow();
      await unitOfWork.run(async () => {
        await insertRow();

        return Result.ok();
      });

      return Result.fail("outer failed");
    });

    expect(await rowCount()).toBe(0);
  });
});
