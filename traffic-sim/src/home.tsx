import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";
import route from "./route.json";

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
  // Bearing in degrees from point a to b
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI; // -180..+180
  return (brng + 360) % 360;
}

const NAV_MINIMAL_STYLE: google.maps.MapTypeStyle[] = [
  // Base tones
  {elementType: "geometry", stylers: [{color: "#0b111b"}]},
  {elementType: "labels.text.fill", stylers: [{color: "#ffffffff"}]},
  {elementType: "labels.text.stroke", stylers: [{color: "#000000ff"}]},

  // Hide clutter
  {featureType: "poi", stylers: [{visibility: "off"}]},
  {featureType: "transit", stylers: [{visibility: "off"}]},
  {featureType: "administrative", stylers: [{visibility: "off"}]},
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{visibility: "off"}],
  },
  {
    featureType: "road.local",
    elementType: "labels.text",
    stylers: [{visibility: "off"}],
  },

  // Roads—simple but distinct
  {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#000000"
            },
            {
                "lightness": 13
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#144b53"
            },
            {
                "lightness": 14
            },
            {
                "weight": 1.4
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
            {
                "color": "#08304b"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#0c4152"
            },
            {
                "lightness": 5
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#0b434f"
            },
            {
                "lightness": 10
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#0b3d51"
            },
            {
                "lightness": 16
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "color": "#146474"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "color": "#021019"
            }
        ]
    }
];

// Types
export type LatLng = {latitude: number; longitude: number};

type Alert = {startIndex: number; endIndex: number; info: string};

export default function HomeScreen() {
  // ---- demo alerts ----
  const alerts = useMemo<Alert[]>(
    () => [
      {startIndex: 20, endIndex: 40, info: "Lane 2: 45 mph"},
      {startIndex: 80, endIndex: 130, info: "Construction ahead in Lane 1"},
      {startIndex: 120, endIndex: 160, info: "Lane 3: 50 mph"},
    ],
    []
  );

  // ---- precompute distances and total length ----
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

  // ---- state ----
  const [currentPosition, setCurrentPosition] = useState<LatLng>(route[0]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
    () => ({lat: route[0].latitude, lng: route[0].longitude}),
    []
  );

  // ---- maps loader ----
  const {isLoaded} = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: "google-map-script",
  });

  // ---- animation loop ----

const [playing, setPlaying] = useState(false);
const progressLocal = useRef<number>(0);
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') setPlaying((p) => !p);
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

useEffect(() => {
  if (!isLoaded || !playing) return;

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
      progressLocal.current += step;
      if (progressLocal.current > totalDistance) progressLocal.current = 0;

      let traveled = 0;
      for (let i = 1; i < route.length; i++) {
        const segDist = distances[i];
        if (traveled + segDist >= progressLocal.current) {
          const frac = (progressLocal.current - traveled) / segDist;
          const lat =
            route[i - 1].latitude +
            frac * (route[i].latitude - route[i - 1].latitude);
          const lng =
            route[i - 1].longitude +
            frac * (route[i].longitude - route[i - 1].longitude);
          const newPos = {latitude: lat, longitude: lng};

          setCurrentPosition(newPos);
          setCurrentIndex(i);

          // follow camera (only if follow mode is on)
          if (followRef.current && mapRef.current) {
            mapRef.current.setCenter({lat, lng});
          }

          // alerts
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
  }, [isLoaded, playing, speed, route, distances, totalDistance, maxSpeed]);

  if (!isLoaded) return <div>Loading map...</div>;

  // ---- compute heading for vehicle icon rotation ----
  const idx = Math.min(Math.max(currentIndex, 1), route.length - 1);
  const prev = route[idx - 1];
  const next = route[idx];
  const headingDeg = prev && next ? bearing(prev, next) : 0;

  // ---- render ----
  return (
    <div style={{width: "100vw", height: "100vh", position: "relative"}}>
      <GoogleMap
        mapContainerStyle={{width: "100%", height: "100%"}}
        zoom={15}
        onLoad={(map) => {
          mapRef.current = map;
          map.setCenter(startLatLng); // initial center
          // Offset the camera down a bit so the car sits above the bottom banner
          // (no MapOptions.padding in JS API)
          map.panBy(0, 60);

          // stop following only on **user drag**
          map.addListener("dragstart", () => setFollowVehicle(false));

          // If you also want zoom to stop following, use these — but guard initial fires:
          const ignoredFirstZoom = {current: false} as {current: boolean};
          map.addListener("zoom_changed", () => {
            if (!ignoredFirstZoom.current) {
              ignoredFirstZoom.current = true;
              return;
            }
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
          styles: NAV_MINIMAL_STYLE,
          backgroundColor: "#0b111b",
        }}
      >
        {/* Route base (darker trail) */}
        <Polyline
          path={route.map((p: LatLng) => ({lat: p.latitude, lng: p.longitude}))}
          options={{
            strokeColor: "#fff7eeff",
            strokeOpacity: 0.50,
            strokeWeight: 8,
          }}
        />

        {/* Start marker */}
        <Marker
          position={{lat: route[0].latitude, lng: route[0].longitude}}
          title="Start"
          icon={
            typeof google !== "undefined"
              ? {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: "#ffffffff",
                  fillOpacity: 0.9,
                  strokeColor: "#ef641fff",
                  strokeWeight: 3,
                }
              : undefined
          }
        />
        {/* End marker */}
        <Marker
          position={{
            lat: route[route.length - 1].latitude,
            lng: route[route.length - 1].longitude,
          }}
          title="End"
          icon={
            typeof google !== "undefined"
              ? {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#d5732dff",
                  fillOpacity: 0.9,
                  strokeColor: "#913000ff",
                  strokeWeight: 2,
                }
              : undefined
          }
        />

        {/* Vehicle marker with heading */}
        {/* Vehicle halo (filled circle under arrow) */}
        <Marker
          position={{
            lat: currentPosition.latitude,
            lng: currentPosition.longitude,
          }}
          clickable={false}
          icon={
            typeof google !== "undefined"
              ? {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 18,
                  fillColor: "#77c0e7ff",
                  fillOpacity: 1,
                  strokeColor: "#000000ff",
                  strokeOpacity: 1,
                  strokeWeight: 2,
                  anchor: new google.maps.Point(0, 0),
                }
              : undefined
          }
          zIndex={
            typeof google !== "undefined"
              ? google.maps.Marker.MAX_ZINDEX! - 1
              : undefined
          }
        />

        {/* Vehicle arrow */}
        <Marker
          position={{
            lat: currentPosition.latitude,
            lng: currentPosition.longitude,
          }}
          clickable={false}
          icon={
            typeof google !== "undefined"
              ? {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 5,
                  fillColor: "#ffffffff",
                  fillOpacity: 1,
                  strokeColor: "#000000ff",
                  strokeWeight: 2,
                  rotation: headingDeg,
                  anchor: new google.maps.Point(0, 2.5),
                }
              : undefined
          }
          zIndex={
            typeof google !== "undefined"
              ? google.maps.Marker.MAX_ZINDEX
              : undefined
          }
        />
      </GoogleMap>

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
