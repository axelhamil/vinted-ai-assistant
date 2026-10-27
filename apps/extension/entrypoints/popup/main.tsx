import "@fontsource-variable/instrument-sans";
import "@/assets/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/ui/query";
import { App } from "./App";

const root = document.getElementById("root");

if (root)
  createRoot(root).render(
    <QueryClientProvider client={createQueryClient()}>
      <TooltipProvider>
        <App />
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </QueryClientProvider>,
  );
