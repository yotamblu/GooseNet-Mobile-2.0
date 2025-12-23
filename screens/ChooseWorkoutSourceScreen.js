import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

export default function ChooseWorkoutSourceScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { targetType, targetName } = route?.params || {};

  const handleChooseFromLibrary = () => {
    // TODO: Navigate to workout library screen
    console.log('Choose from library for', targetType, targetName);
  };

  const handleCreateNewWorkout = () => {
    navigation.navigate('WorkoutTypeSelection', {
      targetType: targetType,
      targetName: targetName,
    });
  };

  return (
    <BaseScreen showTopBar>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[workoutSourceStyles.backButton, { top: insets.top + 85 }]}
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
          <Text style={styles.screenTitle}>Choose Your Workout Source</Text>
        <View style={styles.workoutSourceContainer}>
          <TouchableOpacity 
            style={styles.workoutSourceButton}
            onPress={handleChooseFromLibrary}
            activeOpacity={0.8}
          >
            <View style={styles.workoutSourceIconContainer}>
              <Ionicons name="library-outline" size={48} color="#F97316" />
            </View>
            <Text style={styles.workoutSourceTitle}>Choose from Library</Text>
            <Text style={styles.workoutSourceDescription}>
              Select a workout from your saved workout library. Browse through pre-created workouts and pick one that fits your needs.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.workoutSourceButton}
            onPress={handleCreateNewWorkout}
            activeOpacity={0.8}
          >
            <View style={styles.workoutSourceIconContainer}>
              <Ionicons name="add-circle-outline" size={48} color="#F97316" />
            </View>
            <Text style={styles.workoutSourceTitle}>Create a New Workout</Text>
            <Text style={styles.workoutSourceDescription}>
              Build a custom workout from scratch. Define your own exercises, sets, reps, and training parameters.
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}

const workoutSourceStyles = StyleSheet.create({
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

