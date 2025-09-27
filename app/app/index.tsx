import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Speech from "expo-speech";
import route from "../route.json";

function distance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const dx = b.latitude - a.latitude;
  const dy = b.longitude - a.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function HomeScreen() {
  const alerts = [
    { index: 1, info: "Lane 2: 45 mph" },
    { index: 3, info: "Construction ahead in Lane 1" },
    { index: 5, info: "Lane 3: 50 mph" },
  ];

  const [currentAlert, setCurrentAlert] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState(route[0]);
  const [speed, setSpeed] = useState(0.00001); // adjustable speed
  const maxSpeed = 0.00001;

  const lastAlertIndexRef = useRef<number>(-1); // -1 means "all clear"

  const distances = route.map((point, i) =>
    i === 0 ? 0 : distance(route[i - 1], point)
  );
  const totalDistance = distances.reduce((a, b) => a + b, 0);

  useEffect(() => {
    let progressLocal = 0;
    let frameId: number;

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
          const newPos = { latitude: lat, longitude: lng };
          setCurrentPosition(newPos);

          // alert logic
          const alert = alerts.find((a) => a.index === i);

          if (alert) {
            if (lastAlertIndexRef.current !== i) {
              setCurrentAlert(alert.info);
              Speech.speak(alert.info); // speak only when alert changes
              lastAlertIndexRef.current = i;
            }
          } else {
            if (lastAlertIndexRef.current !== -1) {
              setCurrentAlert(null); // only display "All clear"
              lastAlertIndexRef.current = -1;
            }
          }

          break;
        }
        traveled += segDist;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [speed]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          ...route[0],
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        mapType="mutedStandard"
      >
        <Polyline coordinates={route} strokeColor="#1E90FF" strokeWidth={5} />
        <Marker coordinate={route[0]} title="Start" pinColor="green" />
        <Marker
          coordinate={route[route.length - 1]}
          title="End"
          pinColor="red"
        />
        <Marker coordinate={currentPosition} title="Vehicle" pinColor="orange" />
      </MapView>

      {/* Alerts Widget */}
      <View style={styles.widget}>
        <Text style={styles.widgetText}>{currentAlert || "All clear"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  widget: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(30, 30, 30, 0.8)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  widgetText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
