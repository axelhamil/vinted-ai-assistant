import { QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  browser,
  type ContentScriptContext,
  createShadowRootUi,
  type ShadowRootContentScriptUi,
} from "#imports";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FONT_FILES } from "@/lib/ui/font-files";
import { PortalContainerProvider } from "@/lib/ui/portal-container";
import { createQueryClient } from "@/lib/ui/query";

interface SidebarApp<P extends object> {
  id: string;
  matches: (url: URL) => boolean;
  read: (url: URL, lastAttempt: boolean) => P | null;
  App: ComponentType<P>;
}

const FONT_STYLE_ID = "vinted-ai-assistant-font";

const READ_ATTEMPTS = 10;

const READ_INTERVAL_MS = 500;

function fontFace(
  { file, range }: (typeof FONT_FILES)[number],
  base: string,
): string {
  const src = new URL(`assets/${file}`, base).href;

  return `@font-face{font-family:"Instrument Sans Variable";font-style:normal;font-display:swap;font-weight:400 700;src:url("${src}") format("woff2-variations");unicode-range:${range};}`;
}

function injectFont(): void {
  if (document.getElementById(FONT_STYLE_ID)) return;

  const base = browser.runtime.getURL("/");
  const style = document.createElement("style");
  style.id = FONT_STYLE_ID;
  style.textContent = FONT_FILES.map((face) => fontFace(face, base)).join("\n");
  document.head.append(style);
}

export function mountSidebar<P extends object>(
  ctx: ContentScriptContext,
  { id, matches, read, App }: SidebarApp<P>,
): void {
  const queryClient = createQueryClient();
  let current: ShadowRootContentScriptUi<Root> | null = null;
  let generation = 0;

  async function mount(props: P, mountedFor: number): Promise<void> {
    const ui = await createShadowRootUi(ctx, {
      name: id,
      position: "inline",
      anchor: "body",
      append: "last",
      onMount: (container) => {
        const root = createRoot(container);
        root.render(
          <PortalContainerProvider container={container}>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <App {...props} />
                <Toaster position="bottom-center" />
              </TooltipProvider>
            </QueryClientProvider>
          </PortalContainerProvider>,
        );

        return root;
      },
      onRemove: (root) => root?.unmount(),
    });

    if (mountedFor !== generation || ctx.isInvalid) return;

    current = ui;
    ui.mount();
  }

  function place(url: URL, mountedFor: number, attemptsLeft: number): void {
    if (mountedFor !== generation) return;

    const props = read(url, attemptsLeft === 0);
    if (props) {
      mount(props, mountedFor).catch((error: unknown) =>
        console.log("Vinted AI Assistant: the sidebar could not mount", error),
      );
      return;
    }

    if (attemptsLeft > 0)
      ctx.setTimeout(
        () => place(url, mountedFor, attemptsLeft - 1),
        READ_INTERVAL_MS,
      );
  }

  function show(url: URL): void {
    generation += 1;
    current?.remove();
    current = null;

    if (matches(url)) place(url, generation, READ_ATTEMPTS);
  }

  injectFont();
  show(new URL(window.location.href));
  ctx.addEventListener(window, "wxt:locationchange", ({ newUrl }) =>
    show(newUrl),
  );
}
