import { createDb, type Db } from "@packages/drizzle/config";
import { assertCloneUrl } from "./test-database";

const url = process.env.DATABASE_URL ?? "";

assertCloneUrl(url);

export const db: Db = createDb(url);
