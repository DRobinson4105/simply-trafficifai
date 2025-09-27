import React, { useEffect, useRef, useState, useMemo } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import route from "./route.json";

function distance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const dx = b.latitude - a.latitude;
  const dy = b.longitude - a.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function HomeScreen() {
  const alerts = useMemo(() => [
    { startIndex: 20, endIndex: 40, info: "Lane 2: 45 mph" },
    { startIndex: 80, endIndex: 130, info: "Construction ahead in Lane 1" },
    { startIndex: 120, endIndex: 160, info: "Lane 3: 50 mph" },
  ], []);

  const distances = useMemo(() => route.map((p, i) => i === 0 ? 0 : distance(route[i - 1], p)), []);
  const totalDistance = useMemo(() => distances.reduce((a, b) => a + b, 0), [distances]);

  const [currentPosition, setCurrentPosition] = useState(route[0]);
  const [currentAlert, setCurrentAlert] = useState<string | null>(null);
  const [speed] = useState(0.00003);
  const maxSpeed = 0.00003;

  const lastAlertMessageRef = useRef<string | null>(null);

  // --- map follow ---
  const mapRef = useRef<google.maps.Map | null>(null);
  const [followCar, setFollowCar] = useState(true);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY" });

  useEffect(() => {
    let progressLocal = 0;
    let frameId: number;

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
          const lat = route[i - 1].latitude + frac * (route[i].latitude - route[i - 1].latitude);
          const lng = route[i - 1].longitude + frac * (route[i].longitude - route[i - 1].longitude);
          const newPos = { latitude: lat, longitude: lng };
          setCurrentPosition(newPos);

          // alerts
          const activeAlert = alerts.find(a => i >= a.startIndex && i <= a.endIndex);
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

          // move camera if following
          if (followCar && mapRef.current) {
            mapRef.current.panTo({ lat, lng });
          }

          break;
        }
        traveled += segDist;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [speed, alerts, distances, totalDistance, followCar]);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={{ lat: route[0].latitude, lng: route[0].longitude }}
        zoom={15}
        onLoad={map => { mapRef.current = map; }}
        onDragStart={() => setFollowCar(false)} // stop following if user drags map
        options={{
          disableDefaultUI: true,
          draggable: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
          ],
        }}
      >
        <Polyline
          path={route.map(p => ({ lat: p.latitude, lng: p.longitude }))}
          options={{ strokeColor: "#1E90FF", strokeWeight: 5 }}
        />
        <Marker position={{ lat: route[0].latitude, lng: route[0].longitude }} label="Start" />
        <Marker position={{ lat: route[route.length - 1].latitude, lng: route[route.length - 1].longitude }} label="End" />
        <Marker position={{ lat: currentPosition.latitude, lng: currentPosition.longitude }} label="🚗" />
      </GoogleMap>

      {/* Alerts Widget */}
      <div
        style={{
          position: "absolute",
          bottom: "80px",
          left: "20px",
          right: "20px",
          backgroundColor: "rgba(30,30,30,0.8)",
          padding: "15px",
          borderRadius: "12px",
          textAlign: "center",
          color: "white",
          fontWeight: "bold",
          fontSize: "16px",
        }}
      >
        {currentAlert || "All clear"}
      </div>

      {/* Recenter Button */}
      <button
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.panTo({ lat: currentPosition.latitude, lng: currentPosition.longitude });
            setFollowCar(true);
          }
        }}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          padding: "10px 15px",
          borderRadius: "8px",
          backgroundColor: "#1E90FF",
          color: "white",
          fontWeight: "bold",
          border: "none",
          cursor: "pointer",
        }}
      >
        Recenter
      </button>
    </div>
  );
}
