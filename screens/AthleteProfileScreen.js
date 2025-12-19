import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

const AthleteProfileScreen = ({ route }) => {
  const athleteName = route?.params?.athleteName || 'Athlete';
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
          <Text style={styles.screenTitle}>{athleteName}'s Profile</Text>
          <Text style={styles.centeredText}>Athlete profile details coming soon</Text>
        </ScrollView>
      </View>
    </BaseScreen>
  );
};

export default AthleteProfileScreen;

