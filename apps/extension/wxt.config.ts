import tailwindcss from "@tailwindcss/vite";
import remToPx from "postcss-rem-to-responsive-pixel";
import { defineConfig } from "wxt";
import { hostPatterns } from "./lib/vinted/hosts";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
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
