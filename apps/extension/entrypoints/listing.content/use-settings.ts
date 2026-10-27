import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  type Settings,
  settings,
} from "@/lib/storage/settings";

export function useSettings(): Settings | null {
  const [current, setCurrent] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;
    settings
      .getValue()
      .catch(() => DEFAULT_SETTINGS)
      .then((value) => {
        if (active) setCurrent(value);
      });
    const unwatch = settings.watch((value) => setCurrent(value));

    return () => {
      active = false;
      unwatch();
    };
  }, []);

  return current;
}
