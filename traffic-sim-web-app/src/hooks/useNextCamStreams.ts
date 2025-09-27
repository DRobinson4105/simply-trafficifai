// src/hooks/useNextCamStreams.ts
import { useEffect, useRef, useState } from "react";

type NextIdsResponse = { ids: string[] }; // adjust to your service response

export default function useNextCamStreams(position: { latitude: number; longitude: number } | null) {
  const [urls, setUrls] = useState<(string | undefined)[]>([undefined, undefined, undefined]);
  const lastFetch = useRef(0);

  useEffect(() => {
    if (!position) return;
    const now = performance.now();
    if (now - lastFetch.current < 1500) return; // throttle ~1.5s
    lastFetch.current = now;

    (async () => {
      const r = await fetch(`/next-ids?lat=${position.latitude}&lng=${position.longitude}`);
      const data: NextIdsResponse = await r.json();
      const ids = (data?.ids || []).slice(0, 3);

      const mjpeg = (id: string) => `/mjpeg/${id}?fps=20&overlay=1&w=1280&h=720`;
      setUrls([ids[0] ? mjpeg(ids[0]) : undefined,
               ids[1] ? mjpeg(ids[1]) : undefined,
               ids[2] ? mjpeg(ids[2]) : undefined]);
    })().catch(() => {});
  }, [position?.latitude, position?.longitude]);

  return urls as [string | undefined, string | undefined, string | undefined];
}
