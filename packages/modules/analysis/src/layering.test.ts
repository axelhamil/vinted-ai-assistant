import { describe, expect, it } from "bun:test";
import { dirname, join, relative } from "node:path";
import { createSourceScan } from "@packages/testing/source-scan";

const scan = createSourceScan(__dirname);

const SHARED_LANGUAGES = "@packages/ai/languages";
const ALLOWED_IN_DOMAIN = ["@packages/ddd-kit", "zod", SHARED_LANGUAGES];
const MODULE_CONTRACT = "../contract";
const REPOSITORIES = "infrastructure/repositories";
const APPLICATION = "application";
const MODULE_WIRING = "analysis.module.ts";

describe("layering rules of the analysis module", () => {
  it("keeps the domain on ddd-kit, zod, the shared language list, the module contract and itself", () => {
    const imports = scan.importsOf("domain");

    const foreign = imports
      .filter(({ file, specifier }) => {
        if (!specifier.startsWith(".")) return true;
        const target = relative("domain", join(dirname(file), specifier));
        return target.startsWith("..") && target !== MODULE_CONTRACT;
      })
      .filter(({ specifier }) => !ALLOWED_IN_DOMAIN.includes(specifier))
      .map(({ file, specifier }) => `${file} imports ${specifier}`);

    expect(imports.length).toBeGreaterThan(0);
    expect(foreign).toEqual([]);
  });

  it("keeps the contract free of imports, so a client can load it alone", () => {
    expect(scan.codeOf("contract.ts")).not.toMatch(/\bimport\b/);
  });

  it("throws nowhere in the domain", () => {
    expect(scan.throwsPerFile("domain")).toEqual({});
  });

  it.skipIf(!scan.exists(APPLICATION))(
    "throws nowhere in the application (skipped until application/ exists)",
    () => {
      expect(scan.throwsPerFile(APPLICATION)).toEqual({});
    },
  );

  it.skipIf(!scan.exists(REPOSITORIES))(
    "reaches the database from a repository only through the ambient executor (skipped until infrastructure/repositories/ exists)",
    () => {
      const files = scan.sourceFiles(REPOSITORIES);

      const offending = files.filter((file) => {
        const code = scan.codeOf(file);
        return (
          !code.includes("resolveExecutor(") ||
          /\bthis\.db\.|\bdatabase\./.test(code)
        );
      });

      expect(files.length).toBeGreaterThan(0);
      expect(offending).toEqual([]);
    },
  );

  it("reaches the AI provider from infrastructure and the module wiring only", () => {
    const providerImports = scan
      .importsOf(".")
      .filter(
        ({ specifier }) =>
          specifier.startsWith("@packages/ai/") &&
          specifier !== SHARED_LANGUAGES,
      );

    const outside = providerImports
      .filter(
        ({ file }) =>
          !file.startsWith("infrastructure/") && file !== MODULE_WIRING,
      )
      .map(({ file, specifier }) => `${file} imports ${specifier}`);

    expect(providerImports.length).toBeGreaterThan(0);
    expect(outside).toEqual([]);
  });

  it("never reads the environment", () => {
    const reading = scan
      .sourceFiles(".")
      .filter((file) =>
        /process\.env|Bun\.env|import\.meta\.env|common\/env/.test(
          scan.codeOf(file),
        ),
      );

    expect(reading).toEqual([]);
  });
});
