'use client'
import { useEffect, useRef, useState } from "react";
import { LatLng } from "./MathUtils";
export function Speak(msg: string)
{
  if(typeof window === "undefined") return;
  if(!("speechSynthesis" in window)) return;

  const u = new SpeechSynthesisUtterance(msg);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function Poller(periodMs = 6000, currentPosition: LatLng) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const [lanes, setLanes] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    console.log("DUDE")
    const fetchAPI = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const [alertRes, lanesRes] = await Promise.all([
          fetch("http://localhost:5001/api/get-alert", { signal: ac.signal }),
          fetch("http://localhost:5001/api/get-optimal-lanes", { signal: ac.signal }),
        ]);

        if (alertRes.ok) {
          const text = (await alertRes.text()).trim();
          console.log(text)
          setAlertText(text || null);
        } else {
          setAlertText(null);
        }

        if (lanesRes.ok) {

          const lanesJson = await lanesRes.json();
          console.log(lanesJson)
          const arr = Array.isArray(lanesJson)
            ? lanesJson
            : lanesJson?.lanes ?? lanesJson?.laneBooleans;
          console.log(arr)
          setLanes(Array.isArray(arr) ? arr.map(Number) : []);

        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.warn("poll error", e);
        }
      }
    };

    fetchAPI();

    const id = window.setInterval(fetchAPI, periodMs);

    return () => {
      abortRef.current?.abort();
      clearInterval(id);
    };
  }, [periodMs]);

  return { alertText, lanes };
}
