import { useEffect, useState } from "react";

export const CONFIRM_WINDOW_MS = 3000;

export function useConfirmClick(onConfirm: () => void) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;

    const timer = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [armed]);

  const click = (): void => {
    if (!armed) {
      setArmed(true);
      return;
    }

    setArmed(false);
    onConfirm();
  };

  return { armed, click };
}
