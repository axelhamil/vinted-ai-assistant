import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface ImportLine {
  file: string;
  specifier: string;
  typeOnly: boolean;
}

export function createSourceScan(root: string) {
  function exists(layer: string): boolean {
    return existsSync(join(root, layer));
  }

  function sourceFiles(layer: string): string[] {
    const directory = join(root, layer);
    if (!existsSync(directory))
      throw new Error(`No "${layer}" folder under ${root}`);

    return readdirSync(directory, { withFileTypes: true, recursive: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".test.ts"),
      )
      .map((entry) => relative(root, join(entry.parentPath, entry.name)))
      .sort();
  }

  function codeOf(file: string): string {
    return readFileSync(join(root, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  }

  function importsOf(layer: string): ImportLine[] {
    return sourceFiles(layer).flatMap((file) =>
      [
        ...codeOf(file).matchAll(/import\s+(type\s+)?[^;]*?from\s+"([^"]+)"/g),
      ].map((match) => ({
        file,
        specifier: match[2] ?? "",
        typeOnly: match[1] !== undefined,
      })),
    );
  }

  function throwsPerFile(layer: string): Record<string, number> {
    return Object.fromEntries(
      sourceFiles(layer)
        .map((file) => [file, codeOf(file).match(/\bthrow\b/g)?.length ?? 0])
        .filter(([, count]) => count !== 0),
    );
  }

  function importedNames(file: string, specifier: string): string[] {
    return [
      ...codeOf(file).matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)"/g,
      ),
    ]
      .filter((match) => match[2] === specifier)
      .flatMap((match) =>
        (match[1] ?? "")
          .split(",")
          .map(
            (name) =>
              name
                .trim()
                .replace(/^type\s+/, "")
                .split(/\s+as\s+/)[0] ?? "",
          )
          .filter((name) => name !== ""),
      );
  }

  return {
    exists,
    sourceFiles,
    codeOf,
    importsOf,
    throwsPerFile,
    importedNames,
  };
}
