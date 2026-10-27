import { createRequire } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import remToPx from "postcss-rem-to-responsive-pixel";
import { defineConfig } from "wxt";
import { FONT_FILES } from "./lib/ui/font-files";
import { hostPatterns } from "./lib/vinted/hosts";

const require = createRequire(import.meta.url);

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  hooks: {
    "build:publicAssets": (_wxt, files) => {
      files.push(
        ...FONT_FILES.map(({ file }) => ({
          absoluteSrc: require.resolve(
            `@fontsource-variable/instrument-sans/files/${file}`,
          ),
          relativeDest: `assets/${file}`,
        })),
      );
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    css: {
      postcss: {
        plugins: [
          remToPx({ rootValue: 16, propList: ["*"], transformUnit: "px" }),
        ],
      },
    },
  }),
  manifest: ({ mode }) => ({
    name: "Vinted AI Assistant",
    description: "Analyse les annonces Vinted et propose un prix d'achat.",
    permissions: ["storage"],
    host_permissions: hostPatterns(mode),
    action: { default_title: "Vinted AI Assistant" },
    web_accessible_resources: [
      { resources: ["assets/*.woff2"], matches: hostPatterns(mode) },
    ],
  }),
});
