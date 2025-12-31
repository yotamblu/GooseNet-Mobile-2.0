import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <BaseScreen>
      <View style={{ flex: 1 }}>
        {/* Back Button */}
        <TouchableOpacity
          style={[localStyles.backButton, { top: insets.top + 10 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={[localStyles.refreshButton, { top: insets.top + 10 }]}
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
        <ScrollView 
          style={styles.screenContent}
          contentContainerStyle={[styles.screenContentContainer, { paddingTop: insets.top + 70 }]}
        >
        <Text style={styles.screenTitle}>Notifications</Text>
        <View style={localStyles.container}>
          <Ionicons name="notifications-outline" size={80} color="rgba(255, 255, 255, 0.5)" />
          <Text style={localStyles.text}>Notifications will appear here</Text>
        </View>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}

const localStyles = StyleSheet.create({
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
});

