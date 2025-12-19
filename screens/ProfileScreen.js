import React, { useState, useEffect, useCallback, useContext } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import ProfilePic from '../components/ProfilePic';
import WorkoutComponent from '../components/WorkoutComponent';
import PlannedWorkoutComponent from '../components/PlannedWorkoutComponent';
import { ModalContext } from '../contexts/ModalContext';
import { RefreshContext } from '../contexts/RefreshContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { openModal } = useContext(ModalContext);
  const { triggerRefresh } = useContext(RefreshContext);
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [followers] = useState(120);
  const [following] = useState(45);
  const [refreshing, setRefreshing] = useState(false);
  const [activitiesCount] = useState(24);

  const loadData = useCallback(async () => {
    const name = await AsyncStorage.getItem('userName');
    setUserName(name || '');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Clear profile picture cache to force fresh fetch
    if (userName) {
      const cacheKey = `profilePic_${userName}`;
      try {
        await AsyncStorage.removeItem(cacheKey);
        await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
      } catch (err) {
        console.log('Error clearing profile pic cache:', err);
      }
    }
    
    triggerRefresh(); // Refresh all profile pics
    await loadData();
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [loadData, triggerRefresh, userName]);

  const sampleWorkouts = [
    { 
      id: '1', 
      workoutName: 'Morning Run', 
      athletePic: userName, 
      athleteUserName: userName,
      avgHR: 145, 
      pace: '5:18', 
      distance: 9.5,
      time: '50m 24s',
      date: 'Today at 12:21 PM',
      routeCoordinates: [
        { latitude: 37.78825, longitude: -122.4324 },
        { latitude: 37.78925, longitude: -122.4334 },
      ],
    },
    { 
      id: '2', 
      workoutName: 'Evening Jog', 
      athletePic: userName, 
      athleteUserName: userName,
      avgHR: 135, 
      pace: '6:00', 
      distance: 5,
      time: '30m 00s',
      date: 'Yesterday',
      routeCoordinates: [
        { latitude: 37.78825, longitude: -122.4324 },
        { latitude: 37.78725, longitude: -122.4314 },
      ],
    },
    { 
      id: '3', 
      workoutName: 'Long Run', 
      athletePic: userName, 
      athleteUserName: userName,
      avgHR: 150, 
      pace: '5:30', 
      distance: 15,
      time: '1h 22m',
      date: '2 days ago',
      routeCoordinates: [
        { latitude: 37.78825, longitude: -122.4324 },
        { latitude: 37.78925, longitude: -122.4334 },
      ],
    },
  ];

  const samplePlannedWorkouts = [
    { 
      id: '1', 
      workoutName: 'Interval Training', 
      coachPic: 'coach_mike', 
      coachUserName: 'Coach Mike',
      date: '2024-01-15', 
      description: '5x 1km intervals at 80% effort with 2min rest' 
    },
  ];

  return (
    <BaseScreen>
      <View style={{ flex: 1 }}>
        {/* Back Button - Fixed Position */}
        <TouchableOpacity 
          style={[styles.instagramBackButton, { top: insets.top + 10 }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Refresh Button */}
        <TouchableOpacity
          style={[styles.instagramBackButton, { top: insets.top + 10, right: 20, left: 'auto' }]}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <ScrollView 
          style={styles.screenContent} 
          contentContainerStyle={[styles.instagramProfileContainer, { paddingTop: insets.top + 10 }]}
          showsVerticalScrollIndicator={false}
        >
          {refreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
        
        {/* Instagram-style Profile Header */}
        <View style={styles.instagramProfileHeader}>
          <View style={styles.instagramProfileTop}>
            <ProfilePic userName={userName} size={90} />
            <View style={styles.instagramStatsRow}>
              <TouchableOpacity
                style={styles.instagramStatItem}
                onPress={() => openModal('followers')}
              >
                <Text style={styles.instagramStatNumber}>{activitiesCount}</Text>
                <Text style={styles.instagramStatLabel}>activities</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.instagramStatItem}
                onPress={() => openModal('followers')}
              >
                <Text style={styles.instagramStatNumber}>{followers}</Text>
                <Text style={styles.instagramStatLabel}>followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.instagramStatItem}
                onPress={() => openModal('following')}
              >
                <Text style={styles.instagramStatNumber}>{following}</Text>
                <Text style={styles.instagramStatLabel}>following</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.instagramBioSection}>
            <Text style={styles.instagramUsername}>{userName}</Text>
            <Text style={styles.instagramBio}>
              Runner • Fitness Enthusiast{'\n'}
              🏃‍♂️ Training for my next race
            </Text>
          </View>
        </View>

        {/* List View */}
        <View style={styles.instagramListContainer}>
          {sampleWorkouts.map(workout => (
            <WorkoutComponent key={workout.id} {...workout} />
          ))}
          {samplePlannedWorkouts.length > 0 && (
            <>
              <Text style={styles.instagramSectionTitle}>Planned Workouts</Text>
              {samplePlannedWorkouts.map(workout => (
                <PlannedWorkoutComponent key={workout.id} {...workout} />
              ))}
            </>
          )}
        </View>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}
