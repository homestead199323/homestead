import { useState, useEffect } from "react";
import { pushPrefs } from "./push";

/** This device's reminder prefs, live (updates on the "myterra:push" event from setPushPrefs). */
export function usePushPrefs() {
  const [prefs, setPrefs] = useState(pushPrefs);
  useEffect(() => {
    const on = (e) => setPrefs((e && e.detail) || pushPrefs());
    window.addEventListener("myterra:push", on);
    return () => window.removeEventListener("myterra:push", on);
  }, []);
  return prefs;
}
