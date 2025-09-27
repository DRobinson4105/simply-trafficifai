import React, { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import route from "./route.json";

// ---- helpers ----
function distance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const dx = b.latitude - a.latitude;
  const dy = b.longitude - a.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

type LatLng = { latitude: number; longitude: number };

export default function HomeScreen() {
  // ---- demo alerts ----
  const alerts = useMemo(
    () => [
      { startIndex: 20, endIndex: 40, info: "Lane 2: 45 mph" },
      { startIndex: 80, endIndex: 130, info: "Construction ahead in Lane 1" },
      { startIndex: 120, endIndex: 160, info: "Lane 3: 50 mph" },
    ],
    []
  );

  // ---- precompute distances and total length ----
  const distances = useMemo(
    () => route.map((p: LatLng, i: number) => (i === 0 ? 0 : distance(route[i - 1], p))),
    []
  );
  const totalDistance = useMemo(
    () => distances.reduce((a: number, b: number) => a + b, 0),
    [distances]
  );

  // ---- state ----
  const [currentPosition, setCurrentPosition] = useState<LatLng>(route[0]);
  const [currentAlert, setCurrentAlert] = useState<string | null>(null);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [speed] = useState(0.00003); // tweak for faster/smoother movement
  const maxSpeed = 0.00003;

  // ---- refs ----
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastAlertMessageRef = useRef<string | null>(null);
  const followRef = useRef(true);
  followRef.current = followVehicle;

  const startLatLng = useMemo(
    () => ({ lat: route[0].latitude, lng: route[0].longitude }),
    []
  );

  // ---- maps loader ----
  const { isLoaded } = useJsApiLoader({
    // move this to an env var for production usage
    googleMapsApiKey: "AIzaSyD9vhPD7sZWUMOgb3KUDLujDdRwcbrJB_I",
  });

  // ---- animation loop ----
  useEffect(() => {
    if (!isLoaded) return;
    let progressLocal = 0;
    let frameId = 0;

    const speak = (msg: string) => {
      if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(msg);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    };

    const animate = () => {
      const step = Math.min(speed, maxSpeed);
      progressLocal += step;
      if (progressLocal > totalDistance) progressLocal = 0;

      let traveled = 0;
      for (let i = 1; i < route.length; i++) {
        const segDist = distances[i];
        if (traveled + segDist >= progressLocal) {
          const frac = (progressLocal - traveled) / segDist;
          const lat =
            route[i - 1].latitude + frac * (route[i].latitude - route[i - 1].latitude);
          const lng =
            route[i - 1].longitude + frac * (route[i].longitude - route[i - 1].longitude);
          const newPos = { latitude: lat, longitude: lng };

          setCurrentPosition(newPos);

          // follow camera (only if follow mode is on)
          if (followRef.current && mapRef.current) {
            // use setCenter for immediate, continuous tracking
            mapRef.current.setCenter({ lat, lng });
            // If you prefer animated panning, use panTo({lat,lng}) instead.
          }

          // alerts
          const activeAlert = alerts.find((a) => i >= a.startIndex && i <= a.endIndex);
          if (activeAlert) {
            if (lastAlertMessageRef.current !== activeAlert.info) {
              setCurrentAlert(activeAlert.info);
              speak(activeAlert.info);
              lastAlertMessageRef.current = activeAlert.info;
            }
          } else if (lastAlertMessageRef.current !== null) {
            setCurrentAlert(null);
            speak("All clear");
            lastAlertMessageRef.current = null;
          }

          break;
        }
        traveled += segDist;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isLoaded, speed, alerts, distances, totalDistance]);

  if (!isLoaded) return <div>Loading map...</div>;

  // ---- render ----
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        // keep the map uncontrolled so dragging works
        zoom={15}
        onLoad={(map) => {
          mapRef.current = map;
          map.setCenter(startLatLng); // initial center

          // stop following only on **user drag**
          map.addListener("dragstart", () => setFollowVehicle(false));

          // If you also want zoom to stop following, use these — but guard initial fires:
          const ignoredFirstZoom = { current: false };
          map.addListener("zoom_changed", () => {
            if (!ignoredFirstZoom.current) { ignoredFirstZoom.current = true; return; }
            setFollowVehicle(false);
          });
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
        options={{
          disableDefaultUI: true,
          draggable: true,
          gestureHandling: "greedy",
          keyboardShortcuts: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
          ],
        }}
      >
        <Polyline
          path={route.map((p: LatLng) => ({ lat: p.latitude, lng: p.longitude }))}
          options={{ strokeColor: "#1E90FF", strokeWeight: 5 }}
        />
        <Marker position={{ lat: route[0].latitude, lng: route[0].longitude }} />
        <Marker
          position={{ lat: route[route.length - 1].latitude, lng: route[route.length - 1].longitude }}
        />
        <Marker
          position={{ lat: currentPosition.latitude, lng: currentPosition.longitude }}
          label="🚗"
        />
      </GoogleMap>

      {/* Alert banner */}
      <div
        style={{
          position: "absolute",
          bottom: "76px",
          left: "20px",
          right: "100px",
          backgroundColor: "rgba(30, 30, 30, 0.8)",
          padding: "15px",
          borderRadius: "12px",
          textAlign: "center",
          color: "white",
          fontWeight: "bold",
          fontSize: "16px",
          pointerEvents: "none",
        }}
      >
        {currentAlert || "All clear"}
      </div>

      {/* Recenter / Follow button */}
      <button
        onClick={() => {
          setFollowVehicle(true);
          const pos = { lat: currentPosition.latitude, lng: currentPosition.longitude };
          mapRef.current?.setCenter(pos);
        }}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          background: "#1E90FF",
          color: "white",
          border: "none",
          padding: "10px 14px",
          borderRadius: "10px",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}
        aria-label="Recenter on vehicle"
        title="Recenter on vehicle"
      >
        {followVehicle ? "Following…" : "Recenter"}
      </button>
    </div>
  );
}
