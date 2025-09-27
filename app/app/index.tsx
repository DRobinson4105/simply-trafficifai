import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Speech from 'expo-speech';

export default function HomeScreen() {
  const route = [
    { latitude: 37.78825, longitude: -122.4324 },
    { latitude: 37.78875, longitude: -122.4330 },
    { latitude: 37.78925, longitude: -122.4335 },
    { latitude: 37.78975, longitude: -122.4340 },
    { latitude: 37.79025, longitude: -122.4345 },
    { latitude: 37.79075, longitude: -122.4350 },
  ];

  const alerts = [
    { index: 1, info: 'Lane 2: 45 mph' },
    { index: 3, info: 'Construction ahead in Lane 1' },
    { index: 5, info: 'Lane 3: 50 mph' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAlert, setCurrentAlert] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % route.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const alert = alerts.find((a) => a.index === currentIndex);
    if (alert) {
      setCurrentAlert(alert.info);
      Speech.speak(alert.info);
    } else {
      setCurrentAlert(null);
    }
  }, [currentIndex]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          ...route[0],
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        mapType="mutedStandard"
      >
        <Polyline coordinates={route} strokeColor="#1E90FF" strokeWidth={5} />
        <Marker coordinate={route[0]} title="Start" pinColor="green" />
        <Marker coordinate={route[route.length - 1]} title="End" pinColor="red" />
        <Marker coordinate={route[currentIndex]} title="Vehicle" pinColor="orange" />
      </MapView>

      <View style={styles.widget}>
        <Text style={styles.widgetText}>{currentAlert || 'All clear'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  widget: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  widgetText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
