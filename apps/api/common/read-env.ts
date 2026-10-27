import { fileURLToPath } from "node:url";
import type { Result } from "@packages/ddd-kit";
import { config } from "dotenv";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

export function readEnv<T>(
  parse: (source: Record<string, string | undefined>) => Result<T, string>,
): T {
  const parsed = parse(process.env);
  if (parsed.isSuccess) return parsed.getValue();

  process.stderr.write(`api: invalid environment\n${parsed.getError()}\n`);
  process.exit(1);
}
