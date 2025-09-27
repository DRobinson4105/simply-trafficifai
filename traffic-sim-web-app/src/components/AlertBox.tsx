import React from 'react'

type Props = {
  text?: string | null;
  className?: string;
  style?: React.CSSProperties;
};

export default function AlertBox({ text, className, style }: Props) {
  if (!text) return null;
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
        ...style,
      }}
      aria-live="polite"
      role="status"
    >
      {text}
    </div>
  );
}