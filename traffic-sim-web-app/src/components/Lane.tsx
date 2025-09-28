import React from "react";

export type Lane = {
  blockage: number;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
};

export function laneArrowDataUrl(blockage: number, size = 30): string {
  const color = mixHex("#ffffffff", "#00000000", blockage);
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size + 2} ${size + 2}' width='${size}' height='${size}' fill='${color}'>
      <path d='M12 3l5 5h-3v13h-4V8H7l5-5z'/>
      <path fill="${color}/>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar * (1 - t) + br * t);
  const g = Math.round(ag * (1 - t) + bg * t);
  const b2 = Math.round(ab * (1 - t) + bb * t);
  return rgbToHex(r, g, b2);
}

export function Lane({ blockage, size = 30, style, className }: Lane) {
  const src = laneArrowDataUrl(blockage, size);
  return (
    <img
      src={src}
      width={size}
      height={size}
      style={{ display: "block", ...style }}
      className={className}
    />
  );
}
