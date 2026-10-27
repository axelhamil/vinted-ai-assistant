import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "bun";

const ISOLATION_REQUIRED = `This run of several test files was started without --isolate: mock.module is process wide in Bun, so the mocks of one file would leak into the others.
Use the package "test" script, or "bun test --isolate [path]" from the package folder.
`;

function commandLine(): string[] {
  if (existsSync("/proc/self/cmdline"))
    return readFileSync("/proc/self/cmdline", "utf8").split("\0");

  const { stdout } = spawnSync([
    "ps",
    "-o",
    "args=",
    "-p",
    String(process.pid),
  ]);

  return stdout.toString().trim().split(/\s+/);
}

function leaksModuleMocks(args: string[]): boolean {
  if (!args.includes("test")) return false;

  const isolated = args.some(
    (arg) => arg === "--isolate" || arg.startsWith("--parallel"),
  );
  if (isolated) return false;

  const targets = args
    .slice(args.indexOf("test") + 1)
    .filter((arg) => arg !== "" && !arg.startsWith("-"));
  const [only] = targets;
  const singleFile =
    targets.length === 1 &&
    only !== undefined &&
    only.endsWith(".test.ts") &&
    existsSync(only);

  return !singleFile;
}

if (leaksModuleMocks(commandLine())) {
  process.stderr.write(ISOLATION_REQUIRED);
  process.exit(1);
}
