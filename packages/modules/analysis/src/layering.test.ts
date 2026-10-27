import { describe, expect, it } from "bun:test";
import { dirname, join, relative } from "node:path";
import { createSourceScan } from "@packages/testing/source-scan";

const scan = createSourceScan(__dirname);

const ALLOWED_IN_DOMAIN = ["@packages/ddd-kit", "zod"];
const MODULE_CONTRACT = "../contract";

describe("layering rules of the analysis module", () => {
  it("keeps the domain on ddd-kit, zod, the module contract and itself", () => {
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

  it("throws nowhere in the domain or in the application", () => {
    expect(scan.throwsPerFile("domain")).toEqual({});
    expect(scan.throwsPerFile("application")).toEqual({});
  });

  it("reaches the database from a repository only through the ambient executor", () => {
    const direct = scan
      .sourceFiles("infrastructure/repositories")
      .filter((file) =>
        scan.importedNames(file, "@packages/drizzle").includes("db"),
      );

    expect(direct).toEqual([]);
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
