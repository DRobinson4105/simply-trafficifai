// AlertBox.tsx
import React, { useEffect, useState } from "react";

type Props = {
  text?: string | null;
  statusUrl?: string;
  pollMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function AlertBox({
  text,
  statusUrl = "/api/status",
  pollMs = 5000,
  className,
  style,
}: Props) {
  const [serverText, setServerText] = useState<string | null>(null);

  useEffect(() => {
    if (text !== undefined) {
      setServerText(null);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();

    async function load() {
      try {
        const res = await fetch("api/get-alert", { method: "GET", signal: ac.signal });
        const json = await res.json();

        let value: string | null = null;
        if (typeof json === "string") value = json;
        else if (json && "currentAlert" in json) value = json.currentAlert;
        else if (json && "alert" in json) value = json.alert;

        if (!cancelled) setServerText(value ?? null);
      } catch {
        if (!cancelled) setServerText(null);
      }
    }

    load();
    const id = pollMs > 0 ? setInterval(load, pollMs) : null;
    return () => {
      cancelled = true;
      ac.abort();
      if (id) clearInterval(id);
    };
  }, [text, statusUrl, pollMs]);

  const value = text === undefined ? serverText : text;

  if (value == null || String(value).trim() === "") return null;

  return (
    <div
      className={className}
      style={{
        backdropFilter: "blur(8px)",
        background: "rgba(12, 18, 28, 0.55)",
        border: "1px solid rgba(142, 195, 255, 0.18)",
        padding: "12px 14px",
        borderRadius: 12,
        color: "#E8F1F8",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.2,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        textAlign: "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none", // purely visual
        ...style,
      }}
      aria-live="polite"
      role="status"
    >
      {String(value)}
    </div>
  );
}
