import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { Result } from "@packages/ddd-kit";
import { sql } from "drizzle-orm";
import { createDb } from "../config";
import { DrizzleUnitOfWork, resolveExecutor } from "./unit-of-work";

const db = createDb(process.env.DATABASE_URL ?? "");
const unitOfWork = new DrizzleUnitOfWork(db);

async function insertRow(): Promise<void> {
  await resolveExecutor(db).execute(
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

afterAll(async () => {
  await db.$client.end();
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

  it("fails and keeps nothing when a swallowed SQL error aborted the transaction", async () => {
    const run = unitOfWork.run(async () => {
      await insertRow();
      try {
        await resolveExecutor(db).execute(sql`select * from uow_missing`);
      } catch {}

      return Result.ok();
    });

    await expect(run).rejects.toThrow();
    expect(await rowCount()).toBe(0);
  });

  it("rolls back the outer run when a nested run throws and the outer work catches it", async () => {
    const run = unitOfWork.run(async () => {
      await insertRow();
      try {
        await unitOfWork.run(async () => {
          await insertRow();
          throw new Error("nested work crashed");
        });
      } catch {}

      return Result.ok();
    });

    await expect(run).rejects.toThrow("nested work crashed");
    expect(await rowCount()).toBe(0);
  });
});
