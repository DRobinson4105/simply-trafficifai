import { useEffect, useRef, useState } from "react";

export function Speak(msg: string)
{
  if(typeof window === "undefined") return;
  if(!("speechSynthesis" in window)) return;

  const u = new SpeechSynthesisUtterance(msg);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function AlertPoller(periodMs = 6000, immediate = true) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("http://localhost:5001/api/get-alert", {
          method: "GET",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
         const value = (await res.json()) as string | null;
        if (!cancelled) setAlertText(typeof value === "string" && value.trim() ? value : null);
        } catch {
          if (!cancelled) setAlertText(null);
        }
    };

    if (immediate) fetchOnce();
    const id = setInterval(fetchOnce, periodMs);

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      clearInterval(id);
    };
  }, [periodMs, immediate]);

  return alertText;
}
