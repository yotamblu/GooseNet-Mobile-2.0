import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../utils/styles';
import ProfilePic from './ProfilePic';

const MyAthleteComponent = ({ athleteName, imageData, onPress }) => {
  return (
    <View style={styles.myAthleteCard}>
      <ProfilePic userName={athleteName} size={80} />
      <Text style={styles.myAthleteName}>{athleteName}</Text>
      <TouchableOpacity style={styles.viewAthleteButton} onPress={onPress}>
        <Text style={styles.viewAthleteButtonText}>View Athlete</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MyAthleteComponent;

