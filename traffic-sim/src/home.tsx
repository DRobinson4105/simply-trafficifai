import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import route from "./route.json";
import Header from "./header";

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof process !== "undefined" &&
    (process as any).env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  "AIzaSyD9vhPD7sZWUMOgb3KUDLujDdRwcbrJB_I";

function distance(
  a: {latitude: number; longitude: number},
  b: {latitude: number; longitude: number}
) {
  const dx = b.latitude - a.latitude;
  const dy = b.longitude - a.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

function bearing(
  a: {latitude: number; longitude: number},
  b: {latitude: number; longitude: number}
) {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

const NAV_MINIMAL_STYLE: google.maps.MapTypeStyle[] = [
  {elementType: "geometry", stylers: [{color: "#0b111b"}]},
  {elementType: "labels.text.fill", stylers: [{color: "#cfd7deff"}]},
  {elementType: "labels.text.stroke", stylers: [{color: "#0a0f18"}]},
  {featureType: "poi", stylers: [{visibility: "off"}]},
  {featureType: "transit", stylers: [{visibility: "off"}]},
  {featureType: "administrative", stylers: [{visibility: "off"}]},
  {featureType: "road", elementType: "labels.icon", stylers: [{visibility: "off"}]},
  {featureType: "road.local", elementType: "labels.text", stylers: [{visibility: "off"}]},
  {featureType: "road", elementType: "geometry", stylers: [{color: "#1c2b45"}]},
  {featureType: "road.arterial", elementType: "geometry", stylers: [{color: "#2a3038ff"}]},
  {featureType: "road.highway", elementType: "geometry", stylers: [{color: "#415b7eff"}]},
  {featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{color: "#3a71bf"}]},
  {featureType: "road", elementType: "labels.text.fill", stylers: [{color: "#e9e9eaff"}]},
  {featureType: "water", elementType: "geometry", stylers: [{color: "#0e2438"}]},
  {featureType: "water", elementType: "labels.text.fill", stylers: [{color: "#7aa4c4"}]},
];

export type LatLng = {latitude: number; longitude: number};
type Alert = {startIndex: number; endIndex: number; info: string};

export default function HomeScreen() {
  const alerts = useMemo<Alert[]>(
    () => [
      {startIndex: 20, endIndex: 40, info: "Lane 2: 45 mph"},
      {startIndex: 80, endIndex: 130, info: "Construction ahead in Lane 1"},
      {startIndex: 120, endIndex: 160, info: "Lane 3: 50 mph"},
    ],
    []
  );

  const distances = useMemo(
    () =>
      route.map((p: LatLng, i: number) =>
        i === 0 ? 0 : distance(route[i - 1], p)
      ),
    []
  );
  const totalDistance = useMemo(
    () => distances.reduce((a: number, b: number) => a + b, 0),
    [distances]
  );

  const [currentPosition, setCurrentPosition] = useState<LatLng>(route[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAlert, setCurrentAlert] = useState<string | null>(null);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [speed] = useState(0.00003);
  const maxSpeed = 0.00003;

  const [steps, setSteps] = useState<Array<google.maps.DirectionsStep>>([]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const lastAlertMessageRef = useRef<string | null>(null);
  const followRef = useRef(true);
  followRef.current = followVehicle;

  const startLatLng = useMemo(
    () => ({lat: route[0].latitude, lng: route[0].longitude}),
    []
  );

  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
    version: "weekly",
    language: "en",
    region: "US",
    libraries: ["maps"],
  });

  useEffect(() => {
    if (!isLoaded) return;

    const svc = new google.maps.DirectionsService();
    const origin = new google.maps.LatLng(route[0].latitude, route[0].longitude);
    const destination = new google.maps.LatLng(
      route[route.length - 1].latitude,
      route[route.length - 1].longitude
    );

    const N = 40;
    const sampled = route.filter((_, i) => i % N === 0).slice(1, -1);
    const waypoints = sampled.map((p) => ({
      location: new google.maps.LatLng(p.latitude, p.longitude),
      stopover: false,
    }));

    svc.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (res, status) => {
        if (status === google.maps.DirectionsStatus.OK && res && res.routes[0]) {
          const flat = res.routes[0].legs?.flatMap((l) => l.steps ?? []) ?? [];
          setSteps(flat);
        } else {
          console.warn("Directions request failed:", status);
          setSteps([]);
        }
      }
    );
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    let progressLocal = 0;
    let frameId = 0;

    const speak = (msg: string) => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
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
            route[i - 1].latitude +
            frac * (route[i].latitude - route[i - 1].latitude);
          const lng =
            route[i - 1].longitude +
            frac * (route[i].longitude - route[i - 1].longitude);
          const newPos = {latitude: lat, longitude: lng};

          setCurrentPosition(newPos);
          setCurrentIndex(i);

          if (followRef.current && mapRef.current) {
            mapRef.current.setCenter({lat, lng});
          }

          const activeAlert = alerts.find(
            (a) => i >= a.startIndex && i <= a.endIndex
          );
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

  const idx = Math.min(Math.max(currentIndex, 1), route.length - 1);
  const prev = route[idx - 1];
  const next = route[idx];
  const headingDeg = prev && next ? bearing(prev, next) : 0;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          zoom={15}
          onLoad={(map) => {
            mapRef.current = map;
            map.setCenter({ lat: route[0].latitude, lng: route[0].longitude });
            map.panBy(0, 60);

            map.addListener("dragstart", () => setFollowVehicle(false));
            const ignoredFirstZoom = { current: false } as { current: boolean };
            map.addListener("zoom_changed", () => {
              if (!ignoredFirstZoom.current) {
                ignoredFirstZoom.current = true;
                return;
              }
              setFollowVehicle(false);
            });
          }}
          onUnmount={() => { mapRef.current = null; }}
          options={{
            disableDefaultUI: true,
            draggable: true,
            gestureHandling: "greedy",
            keyboardShortcuts: false,
            styles: NAV_MINIMAL_STYLE,
            backgroundColor: "#0b111b",
          }}
        >
          {/* Route base (darker trail) */}
          <Polyline
            path={route.map((p: LatLng) => ({ lat: p.latitude, lng: p.longitude }))}
            options={{
              strokeColor: "#262a2eff",
              strokeOpacity: 0.60,
              strokeWeight: 14,
            }}
          />
          {/* Route top line */}
          <Polyline
            path={route.map((p: LatLng) => ({ lat: p.latitude, lng: p.longitude }))}
            options={{
              strokeColor: "#7774c4ff",
              strokeOpacity: 0.95,
              strokeWeight: 6,
            }}
          />

          {/* Start marker */}
          <Marker
            position={{ lat: route[0].latitude, lng: route[0].longitude }}
            title="Start"
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#b7ffbf",
              fillOpacity: 0.9,
              strokeColor: "#2b6e3f",
              strokeWeight: 2,
            }}
          />
          {/* End marker */}
          <Marker
            position={{
              lat: route[route.length - 1].latitude,
              lng: route[route.length - 1].longitude,
            }}
            title="End"
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#b7ffbf",
              fillOpacity: 0.9,
              strokeColor: "#2b6e3f",
              strokeWeight: 2,
            }}
          />

          {/* Vehicle halo */}
          <Marker
            position={{
              lat: currentPosition.latitude,
              lng: currentPosition.longitude,
            }}
            clickable={false}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 18,
              fillColor: "#ffffff",
              fillOpacity: 1,
              strokeColor: "#1876d3ff",
              strokeOpacity: 1,
              strokeWeight: 2,
              anchor: new google.maps.Point(0, 0),
            }}
            zIndex={google.maps.Marker.MAX_ZINDEX! - 1}
          />

          {/* Vehicle arrow */}
          <Marker
            position={{
              lat: currentPosition.latitude,
              lng: currentPosition.longitude,
            }}
            clickable={false}
            icon={{
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: "#1c81e6ff",
              fillOpacity: 1,
              strokeColor: "#1c81e6ff",
              strokeWeight: 1,
              rotation: headingDeg,
              anchor: new google.maps.Point(0, 2.5),
            }}
            zIndex={google.maps.Marker.MAX_ZINDEX}
          />
        </GoogleMap>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "#E8F1F8",
            background: "#0b111b",
          }}
        >
          Loading map…
        </div>
      )}

      {/* Ordered-step header (Fix A) */}
      <Header currentPosition={currentPosition} steps={steps} />

      {/* Alert banner */}
      <div
        style={{
          position: "absolute",
          bottom: 76,
          left: 20,
          right: 100,
          backdropFilter: "blur(8px)",
          background: "rgba(12, 18, 28, 0.55)",
          border: "1px solid rgba(142, 195, 255, 0.18)",
          padding: "14px 16px",
          borderRadius: 12,
          color: "#E8F1F8",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: 0.2,
          pointerEvents: "none",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          textAlign: "center",
        }}
      >
        {currentAlert || "All clear"}
      </div>

      {/* Recenter / Follow button */}
      <button
        onClick={() => {
          setFollowVehicle(true);
          const pos = {
            lat: currentPosition.latitude,
            lng: currentPosition.longitude,
          };
          mapRef.current?.setCenter(pos);
          mapRef.current?.panBy(0, 60);
        }}
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
        }}
        aria-label="Recenter on vehicle"
        title="Recenter on vehicle"
      >
        {followVehicle ? "Following…" : "Recenter"}
      </button>
    </div>
  );
}
