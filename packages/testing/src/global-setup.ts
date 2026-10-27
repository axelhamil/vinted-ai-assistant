import { ensureTemplate, withTemplateLock } from "./template";
import { connectAdmin, dropStaleDatabases } from "./test-database";

const admin = await connectAdmin();

try {
  await withTemplateLock(admin, async () => {
    await dropStaleDatabases(admin);
    await ensureTemplate(admin);
  });
} finally {
  await admin.end();
}
