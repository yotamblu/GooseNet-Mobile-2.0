import React, { useState, useCallback, useContext, useEffect } from 'react';
import { ScrollView, View, ActivityIndicator, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function HomeFeedScreen() {
  const { triggerRefresh } = useContext(RefreshContext);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [weeklyDistance, setWeeklyDistance] = useState(0);
  const [loadingDistance, setLoadingDistance] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      const role = await AsyncStorage.getItem('role');
      setUserName(name || '');
      setUserRole(role);
      // Only fetch weekly distance for athletes
      if (role === 'athlete') {
        await fetchWeeklyDistance(name);
      } else {
        setLoadingDistance(false);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const fetchWeeklyDistance = async (username) => {
    if (!username) {
      setLoadingDistance(false);
      return;
    }

    try {
      setLoadingDistance(true);
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        setLoadingDistance(false);
        return;
      }

      // Calculate start of week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
      const startOfWeek = new Date(now);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      // Try to fetch weekly distance from API
      const response = await fetch(
        `https://gooseapi.ddns.net/api/workouts/weeklyDistance?apiKey=${encodeURIComponent(apiKey)}&userName=${encodeURIComponent(username)}&startDate=${startDate}&endDate=${endDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setWeeklyDistance(data.weeklyDistance || data.distance || 0);
      } else {
        // If endpoint doesn't exist, try alternative or set to 0
        setWeeklyDistance(0);
      }
    } catch (err) {
      console.error('Failed to fetch weekly distance:', err);
      setWeeklyDistance(0);
    } finally {
      setLoadingDistance(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await loadUserData();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [triggerRefresh]);


  return (
    <BaseScreen showTopBar title="Home Feed" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 120, paddingHorizontal: 20 }}
      >
        {/* Profile Header Section */}
        {userName && (
          <View style={styles.profileHeaderCard}>
            <View style={styles.profileHeaderContent}>
              <ProfilePic userName={userName} size={70} />
              <View style={styles.profileHeaderText}>
                <Text style={styles.profileHeaderName}>{userName}</Text>
                {userRole === 'athlete' && (
                  <View style={styles.weeklyDistanceContainer}>
                    <Text style={styles.weeklyDistanceLabel}>This Week</Text>
                    {loadingDistance ? (
                      <ActivityIndicator size="small" color="#F97316" style={{ marginTop: 4 }} />
                    ) : (
                      <Text style={styles.weeklyDistanceValue}>
                        {weeklyDistance.toFixed(1)} km
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {refreshing && (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        )}

        {/* Coming Soon GooseNet Social Graphic */}
        <View style={localStyles.comingSoonContainer}>
          <View style={localStyles.logoContainer}>
            <Image
              source={require('../assets/app_images/goose-logo-no-bg.png')}
              style={localStyles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={localStyles.comingSoonTitle}>GooseNet Social</Text>
          <Text style={localStyles.comingSoonSubtitle}>Coming Soon</Text>
          <View style={localStyles.iconContainer}>
            <Ionicons name="people" size={60} color="rgba(255, 255, 255, 0.3)" />
          </View>
        </View>
      </ScrollView>
    </BaseScreen>
  );
}

const localStyles = StyleSheet.create({
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    minHeight: 500,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  comingSoonSubtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  iconContainer: {
    marginTop: 20,
    opacity: 0.5,
  },
});
