import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView 
          style={styles.screenContent}
          contentContainerStyle={styles.screenContentContainer}
        >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
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

