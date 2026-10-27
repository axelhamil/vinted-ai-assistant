import { browser } from "#imports";
import { FONT_FILES } from "@/lib/ui/font-files";

const FONT_STYLE_ID = "vinted-ai-assistant-font";

function fontFace(
  { file, range }: (typeof FONT_FILES)[number],
  base: string,
): string {
  const src = new URL(`assets/${file}`, base).href;

  return `@font-face{font-family:"Instrument Sans Variable";font-style:normal;font-display:swap;font-weight:400 700;src:url("${src}") format("woff2-variations");unicode-range:${range};}`;
}

export function injectFont(): void {
  if (document.getElementById(FONT_STYLE_ID)) return;

  const base = browser.runtime.getURL("/");
  const style = document.createElement("style");
  style.id = FONT_STYLE_ID;
  style.textContent = FONT_FILES.map((face) => fontFace(face, base)).join("\n");
  document.head.append(style);
}
