import React, { useMemo } from "react";

type LatLng = { latitude: number; longitude: number };

function euclid(a: LatLng, b: LatLng) {
  const dx = a.latitude - b.latitude;
  const dy = a.longitude - b.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

type Props = {
  currentPosition: LatLng;
  steps: google.maps.DirectionsStep[]; // <- use SDK type directly
};

export default function NextTurnHeader({ currentPosition, steps }: Props) {
  const next = useMemo(() => {
    if (!steps || steps.length === 0) return null;

    let best: { step: google.maps.DirectionsStep; dist: number } | null = null;

    for (const s of steps) {
      // Prefer end_location distance if present
      const end = s.end_location;
      let d = Number.POSITIVE_INFINITY;
      if (end) {
        d = euclid(currentPosition, { latitude: end.lat(), longitude: end.lng() });
      } else if (s.path && s.path.length) {
        for (const pt of s.path) {
          const dd = euclid(currentPosition, { latitude: pt.lat(), longitude: pt.lng() });
          if (dd < d) d = dd;
        }
      }
      if (!best || d < best.dist) best = { step: s, dist: d };
    }
    return best?.step ?? null;
  }, [currentPosition, steps]);

  if (!next) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(0,0,0,0.65)",
        color: "white",
        fontWeight: 700,
        fontSize: 16,
        pointerEvents: "none",
      }}
      aria-live="polite"
    >
      <span style={{ fontSize: 18 }}>{iconForManeuver(next.maneuver)}</span>
      {/* DirectionsStep.instructions is an HTML string */}
      <span dangerouslySetInnerHTML={{ __html: next.instructions ?? "" }} />
    </div>
  );
}

function iconForManeuver(m?: string | null) {
  switch (m) {
    case "turn-left": return "⬅️";
    case "turn-right": return "➡️";
    case "keep-left": return "↖️";
    case "keep-right": return "↗️";
    case "merge": return "🛣️";
    case "roundabout-left":
    case "roundabout-right": return "🛑";
    case "straight": return "⬆️";
    default: return "➡️";
  }
}
