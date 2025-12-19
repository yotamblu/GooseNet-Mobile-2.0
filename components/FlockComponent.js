import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../utils/styles';

const FlockComponent = ({ flockName, onAddWorkout }) => {
  const firstLetter = flockName.charAt(0).toUpperCase();
  
  return (
    <View style={styles.flockCard}>
      <View style={styles.flockPic}>
        <Text style={styles.flockPicText}>{firstLetter}</Text>
      </View>
      <Text style={styles.flockName}>{flockName}</Text>
      <TouchableOpacity style={styles.addWorkoutButton} onPress={onAddWorkout}>
        <Text style={styles.addWorkoutButtonText}>Add Workout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FlockComponent;

