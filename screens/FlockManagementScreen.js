import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';

export default function FlockManagementScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { flockName } = route.params || {};
  
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingAthlete, setRemovingAthlete] = useState(null);
  
  // Animation refs for success message
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [removedAthleteName, setRemovedAthleteName] = useState('');

  const fetchAthletes = useCallback(async () => {
    try {
      setError(null);
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found');
        setLoading(false);
        return;
      }

      const url = `https://gooseapi.ddns.net/api/flocks/FlockAthletes?flockName=${encodeURIComponent(flockName)}&apiKey=${encodeURIComponent(apiKey)}`;
      
      // Log request
      console.log('=== FETCH FLOCK ATHLETES REQUEST ===');
      console.log('URL:', url);
      console.log('Method: GET');
      console.log('Flock Name:', flockName);
      console.log('API Key:', apiKey ? 'Present' : 'Missing');
      console.log('===================================');

      const response = await fetch(url);
      
      // Log response
      console.log('=== FETCH FLOCK ATHLETES RESPONSE ===');
      console.log('Status Code:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('====================================');
      
      // Handle 204 No Content (empty flock)
      if (response.status === 204) {
        console.log('Flock is empty (204 No Content)');
        setAthletes([]);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response Data:', data);
      
      // API returns a list of strings (athlete names)
      const athleteNames = Array.isArray(data) ? data : (data.athletes || []);
      setAthletes(athleteNames);
    } catch (err) {
      console.error('Failed to fetch flock athletes:', err);
      setError('Failed to load athletes');
    } finally {
      setLoading(false);
    }
  }, [flockName]);

  useFocusEffect(
    useCallback(() => {
      if (flockName) {
        setLoading(true);
        fetchAthletes();
      }
    }, [flockName, fetchAthletes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAthletes();
    setRefreshing(false);
  }, [fetchAthletes]);

  const handleRemoveAthlete = async (athleteUserName) => {
    if (removingAthlete) {
      return; // Prevent multiple simultaneous removals
    }

    Alert.alert(
      'Remove Athlete',
      `Are you sure you want to remove ${athleteUserName} from this flock?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingAthlete(athleteUserName);
            try {
              const apiKey = await AsyncStorage.getItem('apiKey');
              if (!apiKey) {
                Alert.alert('Error', 'No API key found');
                setRemovingAthlete(null);
                return;
              }

              const url = `https://gooseapi.ddns.net/api/flocks/removeAthlete?apiKey=${encodeURIComponent(apiKey)}`;
              const requestBody = {
                flockName: flockName,
                athleteName: athleteUserName
              };

              // Log request
              console.log('=== REMOVE ATHLETE REQUEST ===');
              console.log('URL:', url);
              console.log('Method: POST');
              console.log('API Key:', apiKey ? 'Present' : 'Missing');
              console.log('Request Body:', JSON.stringify(requestBody, null, 2));
              console.log('=============================');

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
              });

              // Log response
              console.log('=== REMOVE ATHLETE RESPONSE ===');
              console.log('Status Code:', response.status);
              console.log('Status Text:', response.statusText);
              console.log('==============================');

              if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const responseData = await response.json();
              console.log('Response Data:', responseData);

              // Show success animation
              setRemovedAthleteName(athleteUserName);
              triggerSuccessAnimation();

              // Refresh the list
              await fetchAthletes();
            } catch (err) {
              console.error('Failed to remove athlete:', err);
              Alert.alert('Error', 'Failed to remove athlete. Please try again.');
            } finally {
              setRemovingAthlete(null);
            }
          },
        },
      ]
    );
  };

  const triggerSuccessAnimation = () => {
    setShowSuccessAnimation(true);
    // Reset animation values
    successScale.setValue(0);
    successOpacity.setValue(0);

    // Animate success
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-close after 2 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(successScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessAnimation(false);
        setRemovedAthleteName('');
      });
    }, 2000);
  };

  const handleAddWorkout = () => {
    navigation.navigate('ChooseWorkoutSource', {
      targetType: 'flock',
      targetName: flockName,
    });
  };

  return (
    <BaseScreen showTopBar title={`Manage ${flockName || 'Flock'}`} onRefresh={onRefresh}>
      <View style={{ flex: 1 }}>
        {/* Back Button */}
        <TouchableOpacity
          style={[managementStyles.backButton, { top: insets.top + 85 }]}
          onPress={() => navigation.navigate('Flock')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={[managementStyles.refreshButton, { top: insets.top + 85 }]}
          onPress={onRefresh}
          activeOpacity={0.8}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {/* Add Athlete Button */}
        <TouchableOpacity
          style={[managementStyles.addAthleteButton, { bottom: 100 }]}
          onPress={() => navigation.navigate('AddToFlock', { flockName: flockName })}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Add Workout Button */}
        <TouchableOpacity
          style={[managementStyles.addWorkoutButton, { bottom: 30 }]}
          onPress={handleAddWorkout}
          activeOpacity={0.8}
        >
          <Text style={managementStyles.addWorkoutButtonText}>Add Workout</Text>
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
        >
          {/* Flock Header with Picture and Name */}
          {flockName && (
            <View style={managementStyles.flockHeader}>
              <View style={managementStyles.flockPic}>
                <Text style={managementStyles.flockPicText}>
                  {flockName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={managementStyles.flockName}>{flockName}</Text>
            </View>
          )}

          {refreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          {loading && athletes.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, minHeight: 300 }}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Loading athletes...</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#F97316' }}>{error}</Text>
            </View>
          ) : athletes.length === 0 ? (
            <View style={managementStyles.emptyStateContainer}>
              <Ionicons name="people-outline" size={80} color="rgba(255, 255, 255, 0.3)" />
              <Text style={managementStyles.emptyStateTitle}>Flock is Empty</Text>
              <Text style={managementStyles.emptyStateText}>
                Add athletes to this flock using the + button below
              </Text>
            </View>
          ) : (
            <View style={managementStyles.athleteList}>
              {athletes.map((athleteName, index) => (
                <View key={`${athleteName}-${index}`} style={managementStyles.athleteItem}>
                  <Text style={managementStyles.athleteName}>{athleteName}</Text>
                  <TouchableOpacity
                    style={managementStyles.removeButton}
                    onPress={() => handleRemoveAthlete(athleteName)}
                    disabled={removingAthlete === athleteName}
                  >
                    {removingAthlete === athleteName ? (
                      <ActivityIndicator size="small" color="#F97316" />
                    ) : (
                      <Ionicons name="trash-outline" size={24} color="#F97316" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        {loading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ color: '#FFFFFF', marginTop: 10, fontSize: 16 }}>Loading athletes...</Text>
          </View>
        )}
        {refreshing && athletes.length > 0 && !loading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Refreshing...</Text>
          </View>
        )}
        {showSuccessAnimation && (
          <View style={managementStyles.successOverlay}>
            <Animated.View
              style={[
                managementStyles.successContainer,
                {
                  transform: [{ scale: successScale }],
                  opacity: successOpacity,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              <Text style={managementStyles.successText}>
                {removedAthleteName} removed successfully!
              </Text>
            </Animated.View>
          </View>
        )}
      </View>
    </BaseScreen>
  );
}

const managementStyles = StyleSheet.create({
  flockHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  flockPic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  flockPicText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  flockName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
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
  refreshButton: {
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
  addAthleteButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#F97316',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  addWorkoutButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    zIndex: 999,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  addWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  athleteList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  athleteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  removeButton: {
    padding: 8,
    marginLeft: 12,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    pointerEvents: 'none',
  },
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 40,
    minHeight: 300,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
});

