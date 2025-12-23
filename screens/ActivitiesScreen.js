import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import DatePickerModal from '../components/DatePickerModal';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';
import MapComponent from '../components/MapComponent';
import StrengthWorkoutComponent from '../components/StrengthWorkoutComponent';
import WorkoutComponent from '../components/WorkoutComponent';

export default function ActivitiesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { triggerRefresh } = useContext(RefreshContext);
  
  // Get params if navigating from athlete profile (coach viewing athlete)
  const athleteNameFromRoute = route?.params?.athleteName;
  const apiKeyFromRoute = route?.params?.apiKey;
  
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [runningNextCursor, setRunningNextCursor] = useState(null);
  const [strengthNextCursor, setStrengthNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userName, setUserName] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [athleteName, setAthleteName] = useState(null);

  useEffect(() => {
    initializeData();
  }, []);

  // Track previous athleteName to detect when coach switches athletes
  const prevAthleteNameRef = useRef(null);

  useEffect(() => {
    if (apiKey && athleteName) {
      // If athleteName changed (coach switched to different athlete), clear workouts first
      if (prevAthleteNameRef.current !== null && prevAthleteNameRef.current !== athleteName) {
        setWorkouts([]);
        setRunningNextCursor(null);
        setStrengthNextCursor(null);
        setError(null);
      }
      prevAthleteNameRef.current = athleteName;
      fetchWorkouts(true);
    }
  }, [selectedDate, apiKey, athleteName]);

  const initializeData = async () => {
    try {
      let storedApiKey = apiKeyFromRoute;
      let storedUserName = null;
      let targetAthleteName = athleteNameFromRoute;

      if (!storedApiKey) {
        storedApiKey = await AsyncStorage.getItem('apiKey');
      }

      if (!targetAthleteName) {
        // For athletes viewing their own activities
        storedUserName = await AsyncStorage.getItem('userName');
        targetAthleteName = storedUserName;
      }

      setApiKey(storedApiKey);
      setUserName(storedUserName);
      setAthleteName(targetAthleteName);
    } catch (err) {
      console.error('Error initializing data:', err);
      setError('Failed to initialize');
      setLoading(false);
    }
  };

  const formatDateForAPI = (date) => {
    if (!date) return null;
    // Remove leading zeros from month and day
    const month = String(date.getMonth() + 1);
    const day = String(date.getDate());
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const removeLeadingZerosFromDate = (dateStr) => {
    if (!dateStr) return null;
    // Remove leading zeros from date string (e.g., "01/05/2025" -> "1/5/2025")
    return dateStr.replace(/\b0+(\d)/g, '$1');
  };

  // Helper function to merge and sort workouts by date (most recent first)
  const mergeAndSortWorkouts = (runningWorkouts, strengthWorkouts) => {
    const allWorkouts = [
      ...(runningWorkouts || []).map(workout => ({
        ...workout,
        workoutType: 'running'
      })),
      ...(strengthWorkouts || []).map(workout => ({
        ...workout,
        workoutType: 'strength'
      }))
    ];
    
    // Sort by workoutDate (most recent first)
    // Assuming workoutDate is in format like "MM/DD/YYYY" or similar
    return allWorkouts.sort((a, b) => {
      const dateA = a.workoutDate ? new Date(a.workoutDate) : new Date(0);
      const dateB = b.workoutDate ? new Date(b.workoutDate) : new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });
  };

  const fetchWorkouts = useCallback(async (reset = false) => {
    if (!apiKey || !athleteName) return;

    try {
      if (reset) {
        setLoading(true);
        setError(null);
        setRunningNextCursor(null); // Clear cursors on reset - start fresh
        setStrengthNextCursor(null);
      } else {
        setLoadingMore(true);
      }

      let url;
      
      if (selectedDate) {
        // Use date-based endpoint (no pagination)
        const dateStr = formatDateForAPI(selectedDate);
        url = `https://gooseapi.ddns.net/api/workoutSummary?apiKey=${encodeURIComponent(apiKey)}&athleteName=${encodeURIComponent(athleteName)}&date=${encodeURIComponent(dateStr)}`;
        console.log('[ActivitiesScreen] Date-based request:', url);
      } else {
        // Use feed endpoint with separate cursors
        url = `https://gooseapi.ddns.net/api/workoutSummary/feed?apiKey=${encodeURIComponent(apiKey)}&athleteName=${encodeURIComponent(athleteName)}`;
        
        // Add cursors only if they exist and we're not resetting (i.e., loading more)
        if (!reset) {
          if (runningNextCursor) {
            url += `&runningCursor=${encodeURIComponent(runningNextCursor)}`;
          }
          if (strengthNextCursor) {
            url += `&strengthCursor=${encodeURIComponent(strengthNextCursor)}`;
          }
        }
        
        console.log('[ActivitiesScreen] Feed request:', url);
        console.log('[ActivitiesScreen] Reset:', reset, 'RunningCursor:', runningNextCursor, 'StrengthCursor:', strengthNextCursor);
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats:
      // New feed endpoint returns: {runningWorkouts: [...], strengthWorkouts: [...], runningNextCursor: "...", strengthNextCursor: "..."}
      // Date-based endpoint returns: [{...}] (direct array)
      let workoutsData = [];
      if (selectedDate) {
        // Date-based endpoint: response is a direct array
        workoutsData = Array.isArray(data) ? data : [];
      } else {
        // New feed endpoint: merge running and strength workouts
        workoutsData = mergeAndSortWorkouts(data.runningWorkouts || [], data.strengthWorkouts || []);
        
        // Add athleteProfilePic if it exists in the response
        workoutsData = workoutsData.map(workout => {
          if (workout.athleteProfilePic) {
            return { ...workout, athleteProfilePic: workout.athleteProfilePic };
          }
          return workout;
        });
      }
      
      if (reset) {
        setWorkouts(workoutsData);
      } else {
        // When loading more, merge with existing workouts and re-sort
        const merged = [...workouts, ...workoutsData];
        // Sort by date to maintain chronological order
        const sorted = merged.sort((a, b) => {
          const dateA = a.workoutDate ? new Date(a.workoutDate) : new Date(0);
          const dateB = b.workoutDate ? new Date(b.workoutDate) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        setWorkouts(sorted);
      }

      // Only set cursors for feed endpoint (not date-based)
      // Store cursors from response for the next pagination request
      // Remove leading zeros from cursors before storing
      if (!selectedDate) {
        if (data.runningNextCursor) {
          const cleanedCursor = removeLeadingZerosFromDate(data.runningNextCursor);
          setRunningNextCursor(cleanedCursor);
          console.log('[ActivitiesScreen] Received running cursor:', data.runningNextCursor, 'Cleaned cursor:', cleanedCursor);
        } else {
          setRunningNextCursor(null);
        }
        
        if (data.strengthNextCursor) {
          const cleanedCursor = removeLeadingZerosFromDate(data.strengthNextCursor);
          setStrengthNextCursor(cleanedCursor);
          console.log('[ActivitiesScreen] Received strength cursor:', data.strengthNextCursor, 'Cleaned cursor:', cleanedCursor);
        } else {
          setStrengthNextCursor(null);
        }
      } else {
        setRunningNextCursor(null);
        setStrengthNextCursor(null);
      }
    } catch (err) {
      console.error('Failed to fetch workouts:', err);
      setError('Failed to load workouts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [apiKey, athleteName, selectedDate, runningNextCursor, strengthNextCursor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh();
    // Reset everything to start from the beginning
    setSelectedDate(null); // Reset date filter on refresh
    setRunningNextCursor(null); // Reset cursors to start from beginning
    setStrengthNextCursor(null);
    setError(null);
    
    // Fetch workouts from the start (first request, no cursors, no date filter)
    if (apiKey && athleteName) {
      try {
        setLoading(true);
        // Always use feed endpoint on refresh (no date filter, no cursors)
        const url = `https://gooseapi.ddns.net/api/workoutSummary/feed?apiKey=${encodeURIComponent(apiKey)}&athleteName=${encodeURIComponent(athleteName)}`;
        console.log('[ActivitiesScreen] Refresh - Feed request (restarting from beginning, no cursors):', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // New feed structure: {runningWorkouts: [...], strengthWorkouts: [...], runningNextCursor: "...", strengthNextCursor: "..."}
        const workoutsData = mergeAndSortWorkouts(data.runningWorkouts || [], data.strengthWorkouts || []);
        
        // Add athleteProfilePic if it exists in the response
        const workoutsWithImages = workoutsData.map(workout => {
          if (workout.athleteProfilePic) {
            return { ...workout, athleteProfilePic: workout.athleteProfilePic };
          }
          return workout;
        });
        
        setWorkouts(workoutsWithImages);
        
        // Store cursors for pagination
        // Remove leading zeros from cursors before storing
        if (data.runningNextCursor) {
          const cleanedCursor = removeLeadingZerosFromDate(data.runningNextCursor);
          setRunningNextCursor(cleanedCursor);
        } else {
          setRunningNextCursor(null);
        }
        
        if (data.strengthNextCursor) {
          const cleanedCursor = removeLeadingZerosFromDate(data.strengthNextCursor);
          setStrengthNextCursor(cleanedCursor);
        } else {
          setStrengthNextCursor(null);
        }
      } catch (err) {
        console.error('Failed to fetch workouts:', err);
        setError('Failed to load workouts');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [apiKey, athleteName, triggerRefresh]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    // The useEffect will trigger fetchWorkouts when selectedDate changes
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setRunningNextCursor(null); // Reset cursors to go back to feed mode
    setStrengthNextCursor(null);
    setError(null);
    // Fetch workouts from feed endpoint (no date filter)
    if (apiKey && athleteName) {
      fetchWorkouts(true);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (!meters) return '0 km';
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatPace = (paceInMinKm) => {
    if (!paceInMinKm) return 'N/A';
    const minutes = Math.floor(paceInMinKm);
    const seconds = Math.floor((paceInMinKm - minutes) * 60);
    return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
  };

  const parseCoordinates = (coordsStr) => {
    if (!coordsStr) return null;
    try {
      const parsed = JSON.parse(coordsStr);
      // Transform from [[lat, lng], [lat, lng], ...] to [{latitude, longitude}, ...]
      // Filter out [0,0] points and invalid coordinates
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(coord => {
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
      }
      return null;
    } catch (err) {
      console.error('Error parsing coordinates:', err);
      return null;
    }
  };

  const renderWorkoutItem = ({ item }) => {
    // Check if this is a strength workout
    if (item.workoutType === 'strength' || item.workoutDrills || item.coachName) {
      // Always use the current athlete we're viewing, not the first one in the list
      const athleteUserName = athleteName;
      
      // Check if image data is in the response, only pass if it exists
      const athleteImageData = item.athleteProfilePic || null;
      
      return (
        <StrengthWorkoutComponent
          workoutName={item.workoutName}
          coachName={item.coachName}
          workoutDescription={item.workoutDescription}
          athletePic={athleteUserName}
          athleteUserName={athleteUserName}
          date={item.workoutDate}
          workoutDrills={item.workoutDrills}
          workoutReviews={item.workoutReviews}
          athleteImageData={athleteImageData}
        />
      );
    }
    
    // Running workout - use WorkoutComponent
    const routeCoords = parseCoordinates(item.workoutCoordsJsonStr);
    const workoutName = item.wokroutName || item.workoutName || 'Running';
    const distanceKm = item.workoutDistanceInMeters ? (item.workoutDistanceInMeters / 1000).toFixed(2) : 0;
    const pace = formatPace(item.workoutAvgPaceInMinKm);
    const time = formatDuration(item.workoutDurationInSeconds);
    
    // Check if image data is in the response, only pass if it exists
    const athleteImageData = item.athleteProfilePic || null;
    
    return (
      <WorkoutComponent
        workoutName={workoutName}
        athletePic={athleteName}
        athleteUserName={athleteName}
        avgHR={item.workoutAvgHR}
        pace={pace}
        distance={parseFloat(distanceKm)}
        time={time}
        date={item.workoutDate || 'N/A'}
        routeCoordinates={routeCoords}
        athleteImageData={athleteImageData}
      />
    );
  };

  const handleLoadMore = () => {
    // Load more if either cursor exists (we can still fetch more data)
    if (!loadingMore && (runningNextCursor || strengthNextCursor) && !selectedDate) {
      fetchWorkouts(false);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={activityStyles.loadingFooter}>
        <ActivityIndicator size="small" color="#F97316" />
      </View>
    );
  };

  if (loading && workouts.length === 0) {
    return (
      <BaseScreen showTopBar title="Activities" onRefresh={onRefresh}>
        <View style={activityStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen showTopBar title="Activities" onRefresh={onRefresh}>
      <View style={{ flex: 1 }}>
        {/* Date Picker Section */}
        <View style={activityStyles.datePickerContainer}>
          <TouchableOpacity 
            style={activityStyles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={activityStyles.dateInputText}>
              {selectedDate ? formatDateForAPI(selectedDate) : 'Search by Date'}
            </Text>
          </TouchableOpacity>
          {selectedDate && (
            <TouchableOpacity 
              style={activityStyles.clearDateButton}
              onPress={clearDateFilter}
            >
              <Ionicons name="close-circle" size={20} color="#F97316" />
            </TouchableOpacity>
          )}
        </View>

        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onDateSelect={handleDateSelect}
          initialDate={selectedDate || new Date()}
        />

        {error && (
          <View style={activityStyles.errorContainer}>
            <Text style={activityStyles.errorText}>{error}</Text>
          </View>
        )}

        {loading && selectedDate ? (
          <View style={activityStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={activityStyles.loadingText}>Searching workouts...</Text>
          </View>
        ) : workouts.length === 0 && !loading ? (
          <View style={activityStyles.emptyContainer}>
            <Ionicons name="fitness-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={activityStyles.emptyText}>
              {selectedDate ? 'No workouts found for this date' : 'No workouts found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={workouts}
            renderItem={renderWorkoutItem}
            keyExtractor={(item, index) => item.workoutId?.toString() || index.toString()}
            contentContainerStyle={activityStyles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
    </BaseScreen>
  );
}

const activityStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 16,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 90,
    paddingBottom: 15,
    gap: 10,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInputText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  clearDateButton: {
    padding: 8,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#F97316',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  workoutTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  workoutAthleteName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutDateInfo: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  activityBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  activityBadgeText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  workoutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 16,
  },
  workoutStatItem: {
    flex: 1,
    minWidth: '45%',
  },
  workoutStatLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  workoutStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

