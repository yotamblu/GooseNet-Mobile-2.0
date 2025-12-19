import React, { useState, useCallback, useContext } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import PlannedWorkoutComponent from '../components/PlannedWorkoutComponent';
import DatePickerModal from '../components/DatePickerModal';
import { RefreshContext } from '../contexts/RefreshContext';

export default function PlannedWorkoutsScreen() {
  const { triggerRefresh } = useContext(RefreshContext);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [triggerRefresh]);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const samplePlannedWorkouts = [
    { 
      id: '1', 
      workoutName: 'Interval Training', 
      coachPic: 'coach_mike', 
      coachUserName: 'Coach Mike',
      date: '2024-01-15', 
      description: '5x 1km intervals at 80% effort with 2min rest' 
    },
    { 
      id: '2', 
      workoutName: 'Long Run', 
      coachPic: 'coach_mike', 
      coachUserName: 'Coach Mike',
      date: '2024-01-17', 
      description: '15km steady pace run' 
    },
  ];

  return (
    <BaseScreen showTopBar title="Planned Workouts" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
      >
        {refreshing && (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        )}
        <View style={styles.datePickerContainer}>
          <Text style={styles.datePickerLabel}>Select Date:</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateInputText}>{formatDate(selectedDate)}</Text>
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onDateSelect={handleDateSelect}
          initialDate={selectedDate}
        />

        {samplePlannedWorkouts.map(workout => (
          <PlannedWorkoutComponent key={workout.id} {...workout} />
        ))}
      </ScrollView>
    </BaseScreen>
  );
}
