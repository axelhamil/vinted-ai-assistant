import { createContext, type ReactNode, useContext } from "react";

const PortalContainer = createContext<HTMLElement | undefined>(undefined);

interface PortalContainerProviderProps {
  container: HTMLElement;
  children: ReactNode;
}

export function PortalContainerProvider({
  container,
  children,
}: PortalContainerProviderProps) {
  return (
    <PortalContainer.Provider value={container}>
      {children}
    </PortalContainer.Provider>
  );
}

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainer);
}
