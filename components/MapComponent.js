import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapComponent({ routeCoordinates, height = 200 }) {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return null;
  }

  // Calculate center point
  const latSum = routeCoordinates.reduce((sum, coord) => sum + coord.latitude, 0);
  const lngSum = routeCoordinates.reduce((sum, coord) => sum + coord.longitude, 0);
  const centerLat = latSum / routeCoordinates.length;
  const centerLng = lngSum / routeCoordinates.length;

  // Format coordinates for Leaflet polyline
  const polylineCoords = routeCoordinates
    .map(coord => `[${coord.latitude}, ${coord.longitude}]`)
    .join(',');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false,
          tap: false
        }).setView([${centerLat}, ${centerLng}], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);
        
        var coordinates = [${polylineCoords}];
        
        var polyline = L.polyline(coordinates, {
          color: '#F97316',
          weight: 4,
          opacity: 0.9
        }).addTo(map);
        
        // Fit map to polyline bounds
        if (coordinates.length > 1) {
          map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 10,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

