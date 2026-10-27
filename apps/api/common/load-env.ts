import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { Env } from "./env";
import { parseEnv } from "./env";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

function loadEnv(): Env {
  const parsed = parseEnv(process.env);
  if (parsed.isSuccess) return parsed.getValue();

  process.stderr.write(`api: invalid environment\n${parsed.getError()}\n`);
  process.exit(1);
}

export const env = loadEnv();
