import { describe, expect, it } from "bun:test";
import { dirname, join, relative } from "node:path";
import { createSourceScan } from "@packages/testing/source-scan";

const scan = createSourceScan(__dirname);

const SHARED_LANGUAGES = "@packages/ai/languages";
const ALLOWED_IN_DOMAIN = ["@packages/ddd-kit", "zod", SHARED_LANGUAGES];
const INFRASTRUCTURE = "infrastructure";
const MODULE_WIRING = "studio.module.ts";

describe("layering rules of the studio module", () => {
  it("keeps the domain on ddd-kit, zod, the shared language list and itself", () => {
    const imports = scan.importsOf("domain");

    const foreign = imports
      .filter(({ file, specifier }) => {
        if (!specifier.startsWith(".")) return true;
        return relative("domain", join(dirname(file), specifier)).startsWith(
          "..",
        );
      })
      .filter(({ specifier }) => !ALLOWED_IN_DOMAIN.includes(specifier))
      .map(({ file, specifier }) => `${file} imports ${specifier}`);

    expect(imports.length).toBeGreaterThan(0);
    expect(foreign).toEqual([]);
  });

  it("throws nowhere in the domain nor the application", () => {
    expect(scan.throwsPerFile("domain")).toEqual({});
    expect(scan.throwsPerFile("application")).toEqual({});
  });

  it.skipIf(!scan.exists(INFRASTRUCTURE))(
    "reaches the AI provider from infrastructure and the module wiring only (skipped until infrastructure/ exists)",
    () => {
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
            !file.startsWith(`${INFRASTRUCTURE}/`) && file !== MODULE_WIRING,
        )
        .map(({ file, specifier }) => `${file} imports ${specifier}`);

      expect(providerImports.length).toBeGreaterThan(0);
      expect(outside).toEqual([]);
    },
  );

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
