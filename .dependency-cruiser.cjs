const MODULES = "^packages/modules";
const LIBS = "^packages/(?!modules/)[^/]+/";
const LEGACY = "^(apps/backend|packages/shared|installer)/";
const FRAMEWORKS =
  "node_modules/(hono|drizzle-orm|pg|postgres|pino|inwire|@google/genai)(/|$)";

module.exports = {
  forbidden: [
    {
      name: "no-cross-module-import",
      comment:
        "A module never imports another one: declare a port, the host wires it.",
      severity: "error",
      from: {
        path: `${MODULES}/([^/]+)/src/`,
        pathNot: "(\\.test\\.ts$|/src/testing/)",
      },
      to: { path: `${MODULES}/([^/]+)/`, pathNot: `${MODULES}/$1/` },
    },
    {
      name: "packages-never-import-apps",
      comment:
        "A module never imports an app: the app composes it, never the other way.",
      severity: "error",
      from: { path: `${MODULES}/` },
      to: { path: "^apps/" },
    },
    {
      name: "pure-domain-and-application",
      comment:
        "Domain and application import no framework, no database and no infrastructure.",
      severity: "error",
      from: {
        path: `${MODULES}/[^/]+/src/(domain|application)/`,
        pathNot: "\\.test\\.ts$",
      },
      to: {
        path: [
          `${MODULES}/[^/]+/src/infrastructure/`,
          `${MODULES}/[^/]+/schemas/`,
          "^packages/drizzle/",
          FRAMEWORKS,
        ],
      },
    },
    {
      name: "domain-does-not-depend-on-application",
      severity: "error",
      from: { path: `${MODULES}/[^/]+/src/domain/` },
      to: { path: `${MODULES}/[^/]+/src/application/` },
    },
    {
      name: "only-hosts-compose-modules",
      comment:
        "A *.module.ts is composed by an app only: no module or lib file imports one.",
      severity: "error",
      from: { path: [`${MODULES}/`, LIBS], pathNot: "\\.test\\.ts$" },
      to: { path: "\\.module\\.ts$" },
    },
    {
      name: "packages-stay-business-free",
      comment:
        "A lib never imports a module or an app (modules may import libs).",
      severity: "error",
      from: { path: LIBS },
      to: { path: [`${MODULES}/`, "^apps/"] },
    },
    {
      name: "schemas-reach-only-other-schemas",
      comment:
        "A module's schemas/ may import another module's schemas/ for a foreign key, nothing else.",
      severity: "error",
      from: { path: `${MODULES}/([^/]+)/schemas/` },
      to: {
        path: `${MODULES}/([^/]+)/`,
        pathNot: [`${MODULES}/$1/`, `${MODULES}/[^/]+/schemas/`],
      },
    },
    {
      name: "ai-sdks-stay-in-the-ai-library",
      comment:
        "Only packages/ai talks to Gemini and sharp: everyone else calls @packages/ai.",
      severity: "error",
      from: { pathNot: "^packages/ai/" },
      to: { path: "node_modules/(@google/genai|sharp)(/|$)" },
    },
    {
      name: "extension-boundary",
      comment:
        "The extension reads only the analysis contract and the api's AppType type.",
      severity: "error",
      from: { path: "^apps/extension/" },
      to: {
        path: "^(packages|apps)/",
        pathNot: [
          "^apps/extension/",
          "^packages/modules/analysis/src/contract\\.ts$",
          "^apps/api/src/composition/app\\.ts$",
        ],
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: { path: [`${MODULES}/`, LIBS] },
      to: { circular: true, dependencyTypesNot: ["type-only"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: `^(packages|apps)/.*/(dist|\\.output|\\.wxt)/|${LEGACY}` },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["development", "import", "default"],
    },
  },
};
