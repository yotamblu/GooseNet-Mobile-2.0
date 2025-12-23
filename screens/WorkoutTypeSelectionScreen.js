import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

export default function WorkoutTypeSelectionScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { targetType, targetName } = route?.params || {};

  const handleRunningWorkout = () => {
    navigation.navigate('CreateRunningWorkout', {
      targetType: targetType,
      targetName: targetName,
    });
  };

  const handleStrengthWorkout = () => {
    // TODO: Navigate to strength workout creation screen
    console.log('Create strength workout for', targetType, targetName);
  };

  return (
    <BaseScreen showTopBar>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[workoutTypeStyles.backButton, { top: insets.top + 85 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingTop: 90, 
            paddingBottom: 120, 
            paddingHorizontal: 20 
          }}
        >
          <Text style={styles.screenTitle}>Select Workout Type</Text>
          <View style={styles.workoutSourceContainer}>
            <TouchableOpacity 
              style={styles.workoutSourceButton}
              onPress={handleRunningWorkout}
              activeOpacity={0.8}
            >
              <View style={styles.workoutSourceIconContainer}>
                <Ionicons name="walk-outline" size={48} color="#F97316" />
              </View>
              <Text style={styles.workoutSourceTitle}>Running</Text>
              <Text style={styles.workoutSourceDescription}>
                Create a running workout with distance, pace, intervals, and route tracking. Perfect for cardio training, endurance building, and outdoor activities.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.workoutSourceButton}
              onPress={handleStrengthWorkout}
              activeOpacity={0.8}
            >
              <View style={styles.workoutSourceIconContainer}>
                <Ionicons name="barbell-outline" size={48} color="#F97316" />
              </View>
              <Text style={styles.workoutSourceTitle}>Strength</Text>
              <Text style={styles.workoutSourceDescription}>
                Build a strength training workout with exercises, sets, reps, and weights. Ideal for muscle building, power training, and resistance exercises.
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}

const workoutTypeStyles = StyleSheet.create({
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

