import { describe, expect, it } from "bun:test";
import {
  expectDomainImportsOnly,
  expectNoEnvironmentRead,
  expectProviderReachedOnlyFrom,
} from "@packages/testing/layering";
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
    expectDomainImportsOnly(scan, {
      packages: ALLOWED_IN_DOMAIN,
      moduleFiles: [MODULE_CONTRACT],
    });
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
    expectProviderReachedOnlyFrom(scan, {
      prefix: "@packages/ai/",
      except: [SHARED_LANGUAGES],
      allowedIn: ["infrastructure/", MODULE_WIRING],
    });
  });

  it("never reads the environment", () => {
    expectNoEnvironmentRead(scan);
  });
});
