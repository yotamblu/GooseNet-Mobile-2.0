import React, { useState, useCallback, useContext } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import CustomRefreshControl from '../components/CustomRefreshControl';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function AthleteProfileModal({ athleteName, athleteUserName, onClose, onNavigate }) {
  const { triggerRefresh } = useContext(RefreshContext);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  // Use athleteUserName for API calls, fall back to athleteName if not provided
  const userNameForPic = athleteUserName || athleteName;

  const handleAddWorkout = () => {
    if (onNavigate) {
      onNavigate('ChooseWorkoutSource', {
        targetType: 'athlete',
        targetName: athleteUserName || athleteName,
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [triggerRefresh]);

  return (
    <BaseScreen>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[athleteProfileStyles.backButton, { top: insets.top + 10 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120, paddingHorizontal: 20 }}
        >
          {refreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          <Text style={styles.screenTitle}>{athleteName}'s Profile</Text>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <ProfilePic userName={userNameForPic} size={100} />
        </View>
        <View style={styles.athleteProfileButtons}>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Planned Workouts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={handleAddWorkout}>
            <Text style={styles.settingsButtonText}>Add Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={async () => {
              if (onNavigate) {
                // Get the coach's apiKey from AsyncStorage
                try {
                  const apiKey = await AsyncStorage.getItem('apiKey');
                  onNavigate('Activities', {
                    athleteName: athleteUserName || athleteName,
                    apiKey: apiKey, // Coach's apiKey when viewing from athlete profile
                  });
                } catch (err) {
                  console.error('Error getting apiKey:', err);
                  // Still navigate, ActivitiesScreen will try to get it
                  onNavigate('Activities', {
                    athleteName: athleteUserName || athleteName,
                    apiKey: null,
                  });
                }
              }
            }}
          >
            <Text style={styles.settingsButtonText}>Completed Workouts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Sleep Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Training Summary</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}

const athleteProfileStyles = StyleSheet.create({
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
});
