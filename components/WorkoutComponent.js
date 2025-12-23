import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import ProfilePic from './ProfilePic';
import MapComponent from './MapComponent';

const WorkoutComponent = ({ workoutName, athletePic, athleteUserName, avgHR, pace, distance, time, date, routeCoordinates, athleteImageData }) => {
  const [liked, setLiked] = useState(false);

  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutTopSection}>
        <View style={styles.workoutHeader}>
          <ProfilePic userName={athletePic} size={50} imageData={athleteImageData} />
          <View style={styles.workoutHeaderText}>
            <Text style={styles.workoutAthleteName}>{athleteUserName || athletePic}</Text>
            <Text style={styles.workoutDateInfo}>{date || 'Today'}</Text>
          </View>
        </View>
        <View style={styles.activityBadge}>
          <Text style={styles.activityBadgeText}>Activity</Text>
        </View>
      </View>
      
      <Text style={styles.workoutTitle}>{workoutName}</Text>
      
      <View style={styles.workoutStats}>
        <View style={styles.workoutStatItem}>
          <Text style={styles.workoutStatLabel}>Distance</Text>
          <Text style={styles.workoutStatValue}>{distance} km</Text>
        </View>
        <View style={styles.workoutStatItem}>
          <Text style={styles.workoutStatLabel}>Pace</Text>
          <Text style={styles.workoutStatValue}>{pace} /km</Text>
        </View>
        <View style={styles.workoutStatItem}>
          <Text style={styles.workoutStatLabel}>Time</Text>
          <Text style={styles.workoutStatValue}>{time || 'N/A'}</Text>
        </View>
      </View>
      
      {/* Only show map if there are coordinates (not a treadmill workout) */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <View style={styles.mapContainer}>
          <MapComponent routeCoordinates={routeCoordinates} height={250} />
        </View>
      )}
      
      <View style={styles.workoutActions}>
        <TouchableOpacity 
          style={[styles.wingButton, liked && styles.wingButtonLiked]} 
          onPress={() => setLiked(!liked)}
        >
          <View style={[styles.gooseLikeContainer, liked && styles.gooseLikeContainerLiked]}>
            <Image 
              source={require('../assets/app_images/goose-logo-no-bg.png')}
              style={[
                styles.gooseLikeIcon,
                liked && styles.gooseLikeIconLiked,
                { tintColor: '#FFFFFF' }
              ]}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
        <View style={styles.actionSeparator} />
        <TouchableOpacity style={styles.commentButton}>
          <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WorkoutComponent;
