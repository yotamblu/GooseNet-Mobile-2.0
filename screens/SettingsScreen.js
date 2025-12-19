import React, { useState, useEffect, useCallback, useContext } from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function SettingsScreen({ onLogout }) {
  const { triggerRefresh } = useContext(RefreshContext);
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const name = await AsyncStorage.getItem('userName');
    setUserName(name || '');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await loadData();
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [loadData, triggerRefresh]);

  return (
    <BaseScreen showTopBar title="Settings" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
      >
        <View style={styles.settingsProfileSection}>
          <ProfilePic userName={userName} size={100} />
          {userName && (
            <Text style={styles.settingsUserName}>@{userName}</Text>
          )}
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Change Profile Picture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingsButton, styles.logoutButtonSettings]} onPress={onLogout}>
            <Text style={styles.settingsButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BaseScreen>
  );
}
