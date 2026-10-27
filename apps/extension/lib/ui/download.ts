import type { AnalysisExport } from "@/lib/messaging/protocol";

export function download({ filename, markdown }: AnalysisExport): void {
  const href = URL.createObjectURL(
    new Blob([markdown], { type: "text/markdown" }),
  );
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
