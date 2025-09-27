import React from "react";

type Props = {
  label: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function CenterButton({ label, onClick, className, style }: Props) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        background: "#1E90FF",
        color: "white",
        border: "none",
        padding: "10px 14px",
        borderRadius: 10,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        whiteSpace: "nowrap",
        pointerEvents: "auto",
        ...(style || {}),
      }}
      aria-label="Recenter on vehicle"
      title="Recenter on vehicle"
    >
      {label}
    </button>
  );
}
