import { expect } from "bun:test";
import { dirname, join, relative } from "node:path";
import type { createSourceScan } from "./source-scan";

type SourceScan = ReturnType<typeof createSourceScan>;

const DOMAIN = "domain";
const ENVIRONMENT_READ = /process\.env|Bun\.env|import\.meta\.env|common\/env/;

export interface DomainImportRules {
  packages: string[];
  moduleFiles?: string[];
}

export interface ProviderImportRules {
  prefix: string;
  except: string[];
  allowedIn: string[];
}

export function expectDomainImportsOnly(
  scan: SourceScan,
  { packages, moduleFiles = [] }: DomainImportRules,
): void {
  const imports = scan.importsOf(DOMAIN);

  const foreign = imports
    .filter(({ file, specifier }) => {
      if (!specifier.startsWith(".")) return !packages.includes(specifier);
      const target = relative(DOMAIN, join(dirname(file), specifier));
      return target.startsWith("..") && !moduleFiles.includes(target);
    })
    .map(({ file, specifier }) => `${file} imports ${specifier}`);

  expect(imports.length).toBeGreaterThan(0);
  expect(foreign).toEqual([]);
}

export function expectProviderReachedOnlyFrom(
  scan: SourceScan,
  { prefix, except, allowedIn }: ProviderImportRules,
): void {
  const providerImports = scan
    .importsOf(".")
    .filter(
      ({ specifier }) =>
        specifier.startsWith(prefix) && !except.includes(specifier),
    );

  const outside = providerImports
    .filter(({ file }) => !allowedIn.some((place) => file.startsWith(place)))
    .map(({ file, specifier }) => `${file} imports ${specifier}`);

  expect(providerImports.length).toBeGreaterThan(0);
  expect(outside).toEqual([]);
}

export function expectNoEnvironmentRead(scan: SourceScan): void {
  const reading = scan
    .sourceFiles(".")
    .filter((file) => ENVIRONMENT_READ.test(scan.codeOf(file)));

  expect(reading).toEqual([]);
}
