import { afterAll } from "bun:test";
import { ensureTemplate } from "./template";
import {
  connectAdmin,
  createTestDatabase,
  refuseConnectionsOutside,
  resolveAdminUrl,
  withTemplateLock,
} from "./test-database";

const HOOK_TIMEOUT_MS = 30_000;

process.env.TEST_DATABASE_URL = resolveAdminUrl().toString();

const admin = await connectAdmin();

try {
  await withTemplateLock(admin, () => ensureTemplate(admin));
} finally {
  await admin.end();
}

const testDatabase = await createTestDatabase();

refuseConnectionsOutside(testDatabase.name);

process.env.DATABASE_URL = testDatabase.url;

afterAll(async () => {
  const { db } = await import("./clone-database");
  await db.$client.end();
  await testDatabase.drop();
}, HOOK_TIMEOUT_MS);
