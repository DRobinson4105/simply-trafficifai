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

export function usePoller(
  periodMs = 1000,
  currentPosition?: any,
  route: any[] = []
) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const [lanes, setLanes] = useState<number[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchAPI = async (position: any, routeArray: any[]) => {
      console.log(`[Poll Triggered] at ${new Date().toISOString()}`);

      try {
        const HOST = process.env.REACT_APP_HOST || "";
        const [alertRes, lanesRes, updateRes] = await Promise.all([
          fetch(`http://${HOST}:5001/api/get-alert`),
          fetch(`http://${HOST}:5001/api/get-optimal-lanes`),
          fetch(`http://${HOST}:5001/api/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(position || routeArray[0]),
            keepalive: true,
          }),
        ]);

        if (!isMounted) return;

        if (alertRes.ok) {
          const text = (await alertRes.text()).trim();
          console.log("Alert API:", text);
          setAlertText(text || null);
        } else {
          console.warn("Alert API failed:", alertRes.status);
          setAlertText(null);
        }

        if (lanesRes.ok) {
          const lanesJson = await lanesRes.json();
          console.log("Lanes API:", lanesJson);
          const arr = Array.isArray(lanesJson)
            ? lanesJson
            : lanesJson?.lanes ?? lanesJson?.laneBooleans;
          setLanes(Array.isArray(arr) ? arr.map(Number) : []);
        } else {
          console.warn("Lanes API failed:", lanesRes.status);
        }

        if (updateRes.ok) {
          const text = await updateRes.text();
          console.log("Update API:", text);
        } else {
          console.warn("Update API failed:", updateRes.status);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.warn("Poll error:", e);
        }
      }
    };

    const id = setInterval(() => {
      fetchAPI(currentPosition, route);
    }, periodMs);

    fetchAPI(currentPosition, route);

    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [periodMs]);

  return { alertText, lanes };
}