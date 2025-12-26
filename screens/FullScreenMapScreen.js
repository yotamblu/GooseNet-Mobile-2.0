import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function FullScreenMapScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { routeCoordinates, center, zoom, workoutId, athleteName } = route?.params || {};

  if (!routeCoordinates || routeCoordinates.length === 0) {
    return null;
  }

  // Use provided center or calculate from coordinates
  let centerLat, centerLng;
  if (center && Array.isArray(center) && center.length >= 2) {
    centerLat = center[0];
    centerLng = center[1];
  } else {
    const latSum = routeCoordinates.reduce((sum, coord) => sum + coord.latitude, 0);
    const lngSum = routeCoordinates.reduce((sum, coord) => sum + coord.longitude, 0);
    centerLat = latSum / routeCoordinates.length;
    centerLng = lngSum / routeCoordinates.length;
  }

  // Convert zoom if it's a scale factor to Leaflet zoom level
  let initialZoom = 14;
  if (zoom) {
    if (zoom > 100) {
      initialZoom = Math.max(1, Math.min(18, Math.round(Math.log2(zoom / 256))));
    } else if (zoom >= 1 && zoom <= 18) {
      initialZoom = Math.round(zoom);
    }
  }

  // Android-specific zoom reduction to prevent over-zooming
  const isAndroid = Platform.OS === 'android';
  if (isAndroid) {
    if (zoom) {
      // Reduce zoom by 2 levels for Android (more moderate)
      initialZoom = Math.max(1, initialZoom - 2);
    }
    // Set maximum zoom fallback for Android (prevent over-zooming but not too restrictive)
    const maxAndroidZoom = 14;
    initialZoom = Math.min(initialZoom, maxAndroidZoom);
  }

  // Format coordinates for Leaflet polyline
  const polylineCoords = routeCoordinates
    .map(coord => `[${coord.latitude}, ${coord.longitude}]`)
    .join(',');

  // Android-specific max zoom adjustment
  const maxZoom = isAndroid ? 16 : 19;

  // Build the fitBounds code
  const fitBoundsCode = isAndroid 
    ? `map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: ${maxZoom}
      });`
    : `map.fitBounds(bounds, { padding: [50, 50] });`;

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
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          boxZoom: true,
          keyboard: true,
          tap: true
        }).setView([${centerLat}, ${centerLng}], ${initialZoom});
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: ${maxZoom},
        }).addTo(map);
        
        var coordinates = [${polylineCoords}];
        
        if (coordinates.length > 0) {
          var polyline = L.polyline(coordinates, {
            color: '#F97316',
            weight: 4,
            opacity: 0.9
          }).addTo(map);
          
          // Fit map to polyline bounds
          if (coordinates.length > 1) {
            var bounds = polyline.getBounds();
            ${fitBoundsCode}
          } else if (coordinates.length === 1) {
            map.setView(coordinates[0], ${initialZoom});
          }
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 20 }]}
        onPress={() => {
          // Navigate back to the workout screen explicitly
          if (workoutId && athleteName) {
            navigation.navigate('CompletedRunningWorkout', {
              workoutId: workoutId,
              athleteName: athleteName,
            });
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 9999,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

