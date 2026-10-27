#!/usr/bin/env node
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const typescriptRoot = dirname(require.resolve("typescript-7/package.json"));

await import(pathToFileURL(join(typescriptRoot, "lib/tsc.js")).href);
