import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { localDateKey } from "@/lib/units";

export function useTodayKey() {
  const [key, setKey] = useState(localDateKey);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setKey(localDateKey());
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(
        refresh,
        Math.max(1000, midnight.getTime() - Date.now() + 100),
      );
    };
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return key;
}
