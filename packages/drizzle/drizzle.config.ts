import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://placeholder";

export default defineConfig({
  schema: ["../modules/*/schemas/*.ts"],
  schemaFilter: [],
  out: "./migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
  dialect: "postgresql",
});
