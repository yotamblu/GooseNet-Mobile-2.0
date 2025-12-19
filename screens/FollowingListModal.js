import React, { useState, useCallback, useContext } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import CustomRefreshControl from '../components/CustomRefreshControl';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function FollowingListModal({ onClose }) {
  const { triggerRefresh } = useContext(RefreshContext);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [triggerRefresh]);

  const sampleFollowing = [
    { id: '1', userName: 'coach_mike' },
    { id: '2', userName: 'elite_runner' },
    { id: '3', userName: 'marathon_pro' },
  ];

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
        <Text style={styles.screenTitle}>Following</Text>
        {sampleFollowing.map(user => (
          <View key={user.id} style={styles.userListItem}>
            <ProfilePic userName={user.userName} size={40} />
            <Text style={styles.userNameText}>{user.userName}</Text>
          </View>
        ))}
      </ScrollView>
    </BaseScreen>
  );
}
