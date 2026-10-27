import { describe, expect, it } from "bun:test";
import {
  expectDomainImportsOnly,
  expectNoEnvironmentRead,
  expectProviderReachedOnlyFrom,
} from "@packages/testing/layering";
import { createSourceScan } from "@packages/testing/source-scan";

const scan = createSourceScan(__dirname);

const SHARED_LANGUAGES = "@packages/ai/languages";
const INFRASTRUCTURE = "infrastructure";

describe("layering rules of the studio module", () => {
  it("keeps the domain on ddd-kit, zod, the shared language list and itself", () => {
    expectDomainImportsOnly(scan, {
      packages: ["@packages/ddd-kit", "zod", SHARED_LANGUAGES],
    });
  });

  it("throws nowhere in the domain nor the application", () => {
    expect(scan.throwsPerFile("domain")).toEqual({});
    expect(scan.throwsPerFile("application")).toEqual({});
  });

  it.skipIf(!scan.exists(INFRASTRUCTURE))(
    "reaches the AI provider from infrastructure, test fixtures and the module wiring only (skipped until infrastructure/ exists)",
    () => {
      expectProviderReachedOnlyFrom(scan, {
        prefix: "@packages/ai/",
        except: [SHARED_LANGUAGES],
        allowedIn: [`${INFRASTRUCTURE}/`, "testing/", "studio.module.ts"],
      });
    },
  );

  it("never reads the environment", () => {
    expectNoEnvironmentRead(scan);
  });
});
