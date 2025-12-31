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

export default function AddToFlockScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { flockName } = route.params || {};
  
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingAthlete, setAddingAthlete] = useState(null);
  
  // Animation refs for success message
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [addedAthleteName, setAddedAthleteName] = useState('');

  const fetchAthletes = useCallback(async () => {
    try {
      setError(null);
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found');
        setLoading(false);
        return;
      }

      // Fetch all athletes
      const allAthletesUrl = `https://gooseapi.ddns.net/api/athletes?apiKey=${encodeURIComponent(apiKey)}`;
      
      // Log request
      console.log('=== FETCH ALL ATHLETES REQUEST ===');
      console.log('URL:', allAthletesUrl);
      console.log('Method: GET');
      console.log('API Key:', apiKey ? 'Present' : 'Missing');
      console.log('==================================');

      const allAthletesResponse = await fetch(allAthletesUrl);
      
      // Log response
      console.log('=== FETCH ALL ATHLETES RESPONSE ===');
      console.log('Status Code:', allAthletesResponse.status);
      console.log('Status Text:', allAthletesResponse.statusText);
      console.log('===================================');
      
      if (!allAthletesResponse.ok) {
        throw new Error(`HTTP error! status: ${allAthletesResponse.status}`);
      }

      const allAthletesData = await allAthletesResponse.json();
      console.log('All Athletes Data:', allAthletesData);
      
      // Fetch athletes already in the flock
      const flockAthletesUrl = `https://gooseapi.ddns.net/api/flocks/FlockAthletes?flockName=${encodeURIComponent(flockName)}&apiKey=${encodeURIComponent(apiKey)}`;
      
      console.log('=== FETCH FLOCK ATHLETES REQUEST ===');
      console.log('URL:', flockAthletesUrl);
      console.log('Method: GET');
      console.log('Flock Name:', flockName);
      console.log('====================================');

      const flockAthletesResponse = await fetch(flockAthletesUrl);
      
      console.log('=== FETCH FLOCK ATHLETES RESPONSE ===');
      console.log('Status Code:', flockAthletesResponse.status);
      console.log('Status Text:', flockAthletesResponse.statusText);
      console.log('=====================================');
      
      let flockAthletes = [];
      // Handle 204 No Content (empty flock)
      if (flockAthletesResponse.status === 204) {
        console.log('Flock is empty (204 No Content)');
        flockAthletes = [];
      } else if (flockAthletesResponse.ok) {
        const flockAthletesData = await flockAthletesResponse.json();
        console.log('Flock Athletes Data:', flockAthletesData);
        // API returns a list of strings (athlete names)
        flockAthletes = Array.isArray(flockAthletesData) ? flockAthletesData : (flockAthletesData.athletes || []);
      }

      // Filter out athletes that are already in the flock
      const allAthletes = allAthletesData.athletesData || [];
      const availableAthletes = allAthletes.filter(athlete => {
        const athleteName = athlete.athleteName || athlete;
        return !flockAthletes.includes(athleteName);
      });

      console.log('Available Athletes (not in flock):', availableAthletes);
      setAthletes(availableAthletes);
    } catch (err) {
      console.error('Failed to fetch athletes:', err);
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

  const handleAddAthlete = async (athleteUserName) => {
    if (addingAthlete) {
      return; // Prevent multiple simultaneous additions
    }

    setAddingAthlete(athleteUserName);
    try {
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'No API key found');
        setAddingAthlete(null);
        return;
      }

      const url = `https://gooseapi.ddns.net/api/flocks/addToFlock?apiKey=${encodeURIComponent(apiKey)}`;
      const requestBody = {
        athleteUserName: athleteUserName,
        flockName: flockName
      };

      // Log request
      console.log('=== ADD TO FLOCK REQUEST ===');
      console.log('URL:', url);
      console.log('Method: POST');
      console.log('API Key:', apiKey ? 'Present' : 'Missing');
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('===========================');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // Log response
      console.log('=== ADD TO FLOCK RESPONSE ===');
      console.log('Status Code:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('============================');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Response Data:', responseData);

      // Show success animation
      setAddedAthleteName(athleteUserName);
      triggerSuccessAnimation();

      // Refresh the list
      await fetchAthletes();
    } catch (err) {
      console.error('Failed to add athlete to flock:', err);
      Alert.alert('Error', 'Failed to add athlete to flock. Please try again.');
    } finally {
      setAddingAthlete(null);
    }
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
        setAddedAthleteName('');
      });
    }, 2000);
  };

  return (
    <BaseScreen showTopBar title={`Add to ${flockName || 'Flock'}`} onRefresh={onRefresh}>
      <View style={{ flex: 1 }}>
        {/* Back Button */}
        <TouchableOpacity
          style={[addToFlockStyles.backButton, { top: insets.top + 85 }]}
          onPress={() => navigation.navigate('FlockManagement', { flockName: flockName })}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
        >
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#FFFFFF' }}>No athletes found</Text>
            </View>
          ) : (
            <View style={addToFlockStyles.athleteList}>
              {athletes.map((athlete, index) => (
                <View key={`${athlete.athleteName}-${index}`} style={addToFlockStyles.athleteItem}>
                  <Text style={addToFlockStyles.athleteName}>{athlete.athleteName}</Text>
                  <TouchableOpacity
                    style={addToFlockStyles.addButton}
                    onPress={() => handleAddAthlete(athlete.athleteName)}
                    disabled={addingAthlete === athlete.athleteName}
                  >
                    {addingAthlete === athlete.athleteName ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="add" size={24} color="#FFFFFF" />
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
          <View style={addToFlockStyles.successOverlay}>
            <Animated.View
              style={[
                addToFlockStyles.successContainer,
                {
                  transform: [{ scale: successScale }],
                  opacity: successOpacity,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              <Text style={addToFlockStyles.successText}>
                {addedAthleteName} added to flock successfully!
              </Text>
            </Animated.View>
          </View>
        )}
      </View>
    </BaseScreen>
  );
}

const addToFlockStyles = StyleSheet.create({
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
  addButton: {
    backgroundColor: '#F97316',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});

