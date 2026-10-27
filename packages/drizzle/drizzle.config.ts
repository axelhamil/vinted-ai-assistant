import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config();

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
