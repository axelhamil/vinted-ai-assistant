import type { Db } from "@packages/drizzle/config";
import { assertCloneUrl } from "./test-database";

assertCloneUrl();

const connection = await import("@packages/drizzle/config");

export const db: Db = connection.db;
