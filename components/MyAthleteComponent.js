import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { styles } from '../utils/styles';

const MyAthleteComponent = ({ athleteName, imageData, onPress }) => {
  return (
    <View style={styles.myAthleteCard}>
      {imageData ? (
        <Image 
          source={{ uri: imageData }} 
          style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 40,
            borderWidth: 2,
            borderColor: '#000000'
          }} 
        />
      ) : (
        <View style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 40, 
          backgroundColor: 'rgba(249, 115, 22, 0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: '#000000'
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' }}>
            {athleteName ? athleteName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      )}
      <Text style={styles.myAthleteName}>{athleteName}</Text>
      <TouchableOpacity style={styles.viewAthleteButton} onPress={onPress}>
        <Text style={styles.viewAthleteButtonText}>View Athlete</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MyAthleteComponent;

