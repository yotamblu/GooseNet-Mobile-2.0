import React, { useState, useCallback, useContext } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import CustomRefreshControl from '../components/CustomRefreshControl';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function AthleteProfileModal({ athleteName, athleteUserName, onClose }) {
  const { triggerRefresh } = useContext(RefreshContext);
  const [refreshing, setRefreshing] = useState(false);

  // Use athleteUserName for API calls, fall back to athleteName if not provided
  const userNameForPic = athleteUserName || athleteName;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [triggerRefresh]);

  return (
    <BaseScreen>
      <ScrollView 
        style={styles.screenContent} 
        contentContainerStyle={styles.screenContentContainer}
        refreshControl={<CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {refreshing && (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        )}
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{athleteName}'s Profile</Text>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <ProfilePic userName={userNameForPic} size={100} />
        </View>
        <View style={styles.athleteProfileButtons}>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Planned Workouts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Add Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Completed Workouts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Add To Flock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Sleep Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Training Summary</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BaseScreen>
  );
}
