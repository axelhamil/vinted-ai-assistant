import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { createQueryClient } from "@/lib/ui/query";

interface QueryWrapperProps {
  children: ReactNode;
}

export function queryWrapper() {
  const client = createQueryClient();

  return ({ children }: QueryWrapperProps) =>
    createElement(QueryClientProvider, { client }, children);
}
