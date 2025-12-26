import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BaseScreen from '../components/BaseScreen';
import MapComponent from '../components/MapComponent';
import ProfilePic from '../components/ProfilePic';
import HRGraph from '../components/HRGraph';
import ElevationGraph from '../components/ElevationGraph';
import PaceGraph from '../components/PaceGraph';
import LapPaceBarChart from '../components/LapPaceBarChart';
import { styles } from '../utils/styles';

export default function CompletedRunningWorkoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { workoutId, athleteName } = route?.params || {};

  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('=== COMPLETED WORKOUT SCREEN MOUNTED ===');
    console.log('Route params:', route?.params);
    console.log('workoutId:', workoutId);
    console.log('athleteName:', athleteName);
    fetchWorkoutData();
  }, [workoutId, athleteName]);

  const fetchWorkoutData = async () => {
    console.log('=== FETCHING WORKOUT DATA ===');
    console.log('workoutId:', workoutId);
    console.log('athleteName:', athleteName);
    
    if (!workoutId || !athleteName) {
      console.log('Missing workout ID or athlete name');
      setError('Missing workout ID or athlete name');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiUrl = `https://gooseapi.ddns.net/api/workoutSummary/getWorkout?userName=${encodeURIComponent(athleteName)}&id=${workoutId}`;
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Workout data received:', JSON.stringify(data, null, 2));
      setWorkoutData(data);
    } catch (err) {
      console.error('Error fetching workout data:', err);
      setError(err.message || 'Failed to load workout data');
    } finally {
      setLoading(false);
    }
  };

  const parseCoordinates = (coordsJsonStr) => {
    if (!coordsJsonStr) {
      console.log('No coordinates string provided');
      return [];
    }
    try {
      const parsed = JSON.parse(coordsJsonStr);
      console.log('Parsed coordinates:', parsed);
      
      // Transform from [[lat, lng], [lat, lng], ...] to [{latitude, longitude}, ...]
      // Filter out [0,0] points and invalid coordinates
      if (Array.isArray(parsed) && parsed.length > 0) {
        const coords = parsed.map(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            // Ignore [0,0] points
            if (coord[0] === 0 && coord[1] === 0) {
              return null;
            }
            return {
              latitude: coord[0],
              longitude: coord[1]
            };
          }
          return null;
        }).filter(coord => coord !== null);
        
        console.log('Filtered coordinates count:', coords.length);
        return coords;
      }
      console.log('Coordinates is not a valid array');
      return [];
    } catch (e) {
      console.error('Error parsing coordinates:', e);
      return [];
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceMinKm) => {
    if (!paceMinKm || paceMinKm === 0) return '0:00';
    const minutes = Math.floor(paceMinKm);
    const seconds = Math.round((paceMinKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (!meters) return '0.00';
    return (meters / 1000).toFixed(2);
  };

  if (loading) {
    return (
      <BaseScreen showTopBar>
        <View style={workoutStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={workoutStyles.loadingText}>Loading workout...</Text>
        </View>
      </BaseScreen>
    );
  }

  if (error || !workoutData) {
    return (
      <BaseScreen showTopBar>
        <View style={workoutStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={workoutStyles.errorText}>
            {error || 'Failed to load workout data'}
          </Text>
          <TouchableOpacity
            style={workoutStyles.retryButton}
            onPress={fetchWorkoutData}
          >
            <Text style={workoutStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </BaseScreen>
    );
  }

  const routeCoords = parseCoordinates(workoutData.workoutCoordsJsonStr);
  console.log('Route coords after parsing:', routeCoords.length, 'points');
  if (routeCoords.length > 0) {
    console.log('First coord:', routeCoords[0]);
    console.log('Last coord:', routeCoords[routeCoords.length - 1]);
  }
  const workoutName = workoutData.wokroutName || workoutData.workoutName || 'Running';
  const distanceKm = formatDistance(workoutData.workoutDistanceInMeters);
  const pace = formatPace(workoutData.workoutAvgPaceInMinKm);
  const time = formatDuration(workoutData.workoutDurationInSeconds);

  // Adjust zoom for Android - reduce zoom level to prevent over-zooming
  const getAdjustedZoom = (originalZoom) => {
    if (!originalZoom) return null;
    if (Platform.OS === 'android') {
      let adjustedZoom;
      // For Android, reduce zoom by converting scale factor moderately
      // or reducing zoom level by 2 levels
      if (originalZoom > 100) {
        // Scale factor - convert and reduce for Android
        const zoomLevel = Math.max(1, Math.min(18, Math.round(Math.log2(originalZoom / 256))));
        adjustedZoom = Math.max(1, zoomLevel - 2); // Reduce by 2 zoom levels for Android
      } else if (originalZoom >= 1 && originalZoom <= 18) {
        // Already a zoom level - reduce it for Android
        adjustedZoom = Math.max(1, Math.round(originalZoom) - 2);
      } else {
        adjustedZoom = 13; // Fallback for Android
      }
      // Set maximum zoom fallback for Android (prevent over-zooming but not too restrictive)
      const maxAndroidZoom = 14;
      return Math.min(adjustedZoom, maxAndroidZoom);
    }
    return originalZoom;
  };

  const adjustedZoom = getAdjustedZoom(workoutData.workoutMapZoom);

  const handleShare = async () => {
    try {
      const shareUrl = `https://goosenet.space/Workout.aspx?userName=${encodeURIComponent(athleteName)}&activityId=${workoutId}`;
      const message = `🏃‍♂️ Check out this amazing workout on GooseNet! ${workoutName} - ${distanceKm} km in ${time} at ${pace}/km pace. See the full details: ${shareUrl}`;
      
      const result = await Share.share({
        message: message,
        url: shareUrl, // Some platforms use this
      });

      if (result.action === Share.sharedAction) {
        console.log('Content shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share workout');
    }
  };

  return (
    <BaseScreen showTopBar>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[workoutStyles.backButton, { top: insets.top + 85 }]}
          onPress={() => {
            // Navigate back to Activities screen, passing athleteName if available
            navigation.navigate('Activities', {
              athleteName: athleteName,
            });
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[workoutStyles.shareButton, { top: insets.top + 85 }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingTop: 90, 
            paddingBottom: 120, 
            paddingHorizontal: 20 
          }}
        >
          {/* Header with Profile Pic and Date */}
          <View style={workoutStyles.header}>
            <ProfilePic userName={athleteName} size={60} />
            <View style={workoutStyles.headerInfo}>
              <Text style={workoutStyles.workoutTitle}>{workoutName}</Text>
              <Text style={workoutStyles.workoutDate}>
                {workoutData.workoutDate || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Stats Overview */}
          <View style={workoutStyles.statsContainer}>
            <View style={workoutStyles.statItem}>
              <Text style={workoutStyles.statValue}>{distanceKm}</Text>
              <Text style={workoutStyles.statLabel}>Distance (km)</Text>
            </View>
            <View style={workoutStyles.statItem}>
              <Text style={workoutStyles.statValue}>{time}</Text>
              <Text style={workoutStyles.statLabel}>Time</Text>
            </View>
            <View style={workoutStyles.statItem}>
              <Text style={workoutStyles.statValue}>{pace}</Text>
              <Text style={workoutStyles.statLabel}>Avg Pace</Text>
            </View>
            {workoutData.workoutAvgHR && (
              <View style={workoutStyles.statItem}>
                <Text style={workoutStyles.statValue}>{workoutData.workoutAvgHR}</Text>
                <Text style={workoutStyles.statLabel}>Avg HR</Text>
              </View>
            )}
          </View>

          {/* Map */}
          {routeCoords.length > 0 && (
            <TouchableOpacity
              style={workoutStyles.mapContainer}
              activeOpacity={0.9}
              onPress={() => {
                navigation.navigate('FullScreenMap', {
                  routeCoordinates: routeCoords,
                  center: workoutData.workoutMapCenterJsonStr ? JSON.parse(workoutData.workoutMapCenterJsonStr) : null,
                  zoom: adjustedZoom,
                  workoutId: workoutId,
                  athleteName: athleteName,
                });
              }}
            >
              <MapComponent 
                routeCoordinates={routeCoords} 
                height={250}
                center={workoutData.workoutMapCenterJsonStr ? JSON.parse(workoutData.workoutMapCenterJsonStr) : null}
                zoom={adjustedZoom}
              />
              <View style={workoutStyles.mapOverlay}>
                <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
                <Text style={workoutStyles.mapOverlayText}>Tap to view full screen</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Lap Pace Bar Chart */}
          {workoutData.workoutLaps && workoutData.workoutLaps.length > 0 && (
            <View style={workoutStyles.chartContainer}>
              <Text style={workoutStyles.chartTitle}>Lap Pace</Text>
              <LapPaceBarChart laps={workoutData.workoutLaps} />
            </View>
          )}

          {/* Graphs */}
          {workoutData.dataSamples && workoutData.dataSamples.length > 0 && (
            <>
              <View style={workoutStyles.chartContainer}>
                <Text style={workoutStyles.chartTitle}>Heart Rate</Text>
                <HRGraph 
                  dataSamples={workoutData.dataSamples} 
                  avgHR={workoutData.workoutAvgHR}
                />
              </View>

              <View style={workoutStyles.chartContainer}>
                <Text style={workoutStyles.chartTitle}>Elevation</Text>
                <ElevationGraph dataSamples={workoutData.dataSamples} />
              </View>

              <View style={workoutStyles.chartContainer}>
                <Text style={workoutStyles.chartTitle}>Pace</Text>
                <PaceGraph 
                  dataSamples={workoutData.dataSamples} 
                  avgPace={workoutData.workoutAvgPaceInMinKm}
                />
              </View>
            </>
          )}

          {/* Device Info */}
          {workoutData.workoutDeviceName && (
            <View style={workoutStyles.deviceContainer}>
              <Ionicons name="watch-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={workoutStyles.deviceText}>
                {workoutData.workoutDeviceName}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </BaseScreen>
  );
}

const workoutStyles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  shareButton: {
    position: 'absolute',
    right: 20,
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  debugText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  workoutDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  mapContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 250,
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noMapContainer: {
    height: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noMapText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 8,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  deviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginLeft: 8,
  },
});

