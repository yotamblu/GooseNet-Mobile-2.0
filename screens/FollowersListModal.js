import React, { useState, useCallback, useContext } from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import CustomRefreshControl from '../components/CustomRefreshControl';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function FollowersListModal({ onClose }) {
  const { triggerRefresh } = useContext(RefreshContext);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [triggerRefresh]);

  const sampleFollowers = [
    { id: '1', userName: 'john_doe' },
    { id: '2', userName: 'jane_smith' },
    { id: '3', userName: 'mike_jones' },
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
        <Text style={styles.screenTitle}>Followers</Text>
        {sampleFollowers.map(follower => (
          <View key={follower.id} style={styles.userListItem}>
            <ProfilePic userName={follower.userName} size={40} />
            <Text style={styles.userNameText}>{follower.userName}</Text>
          </View>
        ))}
      </ScrollView>
    </BaseScreen>
  );
}
