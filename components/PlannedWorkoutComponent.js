import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import ProfilePic from './ProfilePic';

const PlannedWorkoutComponent = ({ workoutName, coachPic, coachUserName, date, description }) => {
  const [liked, setLiked] = useState(false);

  return (
    <View style={styles.plannedWorkoutCard}>
      <View style={styles.plannedWorkoutTopSection}>
        <View style={styles.plannedWorkoutHeader}>
          <ProfilePic userName={coachPic} size={50} />
          <View style={styles.plannedWorkoutHeaderText}>
            <Text style={styles.plannedWorkoutCoachName}>{coachUserName || coachPic}</Text>
            <Text style={styles.plannedWorkoutDateInfo}>{date || 'No date set'}</Text>
          </View>
        </View>
        <View style={styles.plannedWorkoutBadge}>
          <Text style={styles.plannedWorkoutBadgeText}>Planned Workout</Text>
        </View>
      </View>
      
      <Text style={styles.plannedWorkoutTitle}>{workoutName}</Text>
      
      <Text style={styles.plannedWorkoutDescription}>{description}</Text>
      
      <View style={styles.plannedWorkoutActions}>
        <TouchableOpacity 
          style={[styles.plannedWingButton, liked && styles.plannedWingButtonLiked]} 
          onPress={() => setLiked(!liked)}
        >
          <View style={[styles.plannedGooseLikeContainer, liked && styles.plannedGooseLikeContainerLiked]}>
            <Image 
              source={require('../assets/app_images/goose-logo-no-bg.png')}
              style={[
                styles.plannedGooseLikeIcon,
                liked && styles.plannedGooseLikeIconLiked,
                { tintColor: '#FFFFFF' }
              ]}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        <View style={styles.plannedActionSeparator} />
        <TouchableOpacity style={styles.plannedCommentButton}>
          <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PlannedWorkoutComponent;

