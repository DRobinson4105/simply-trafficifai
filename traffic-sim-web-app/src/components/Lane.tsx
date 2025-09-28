import React from "react";

export type Lane = {
  blocked: boolean;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
};

export function laneArrowDataUrl(blocked: boolean, size = 24): string {
  const fill = blocked ? "#9AA3AD" : "#FFFFFF";
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size + 2} ${size + 2}' width='${size}' height='${size}' fill='${fill}'>
      <path d='M12 3l5 5h-3v13h-4V8H7l5-5z'/>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function Lane({ blocked, size = 24, style, className }: Lane) {
  const src = laneArrowDataUrl(blocked, size);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={blocked ? "Lane blocked" : "Lane open"}
      style={{ display: "block", ...style }}
      className={className}
    />
  );
}