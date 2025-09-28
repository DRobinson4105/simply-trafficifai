// AlertBox.tsx
import React, { useEffect, useState } from "react";

type Props = {
  text?: string | null;
  pollMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function AlertBox({
  text,
  className,
  style,
}: Props) {
  return (
    <div
      className={className}
      style={{
        backdropFilter: "blur(8px)",
        background: "rgba(220, 38, 38, 0.80)",
        border: "1px solid rgba(255, 99, 99, 0.5)",
        padding: "12px 14px",
        borderRadius: 12,
        color: "#E8F1F8",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.2,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
        ...style,
      }}
      aria-live="polite"
      role="status"
    >
      {String(text)}
    </div>
  );
}
