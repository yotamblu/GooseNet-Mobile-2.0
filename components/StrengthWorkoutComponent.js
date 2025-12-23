import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import ProfilePic from './ProfilePic';

const StrengthWorkoutComponent = ({ 
  workoutName, 
  coachName,
  workoutDescription,
  athletePic, 
  athleteUserName, 
  date, 
  workoutDrills,
  workoutReviews,
  athleteImageData
}) => {
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
        <View style={[styles.activityBadge, { backgroundColor: '#8B5CF6' }]}>
          <Ionicons name="barbell" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.activityBadgeText}>Strength</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="fitness" size={20} color="#F97316" style={{ marginRight: 8 }} />
        <Text style={styles.workoutTitle}>{workoutName}</Text>
      </View>

      {coachName && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
            Coach: <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{coachName}</Text>
          </Text>
        </View>
      )}

      {workoutDescription && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, lineHeight: 20 }}>
            {workoutDescription}
          </Text>
        </View>
      )}
      
      {workoutDrills && workoutDrills.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Drills:
          </Text>
          {workoutDrills.map((drill, index) => (
            <View 
              key={index} 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 8,
                paddingLeft: 8,
                borderLeftWidth: 2,
                borderLeftColor: '#F97316'
              }}
            >
              <Ionicons name="ellipse" size={6} color="#F97316" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 14, flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{drill.drillName}</Text>
                {drill.drillSets && drill.drillReps && (
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {' '}- {drill.drillSets} sets × {drill.drillReps} reps
                  </Text>
                )}
              </Text>
            </View>
          ))}
        </View>
      )}

      {workoutReviews && Object.keys(workoutReviews).length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
            Reviews:
          </Text>
          {Object.values(workoutReviews).slice(0, 2).map((review, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                  {review.athleteName}
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginLeft: 12,
                  backgroundColor: 'rgba(249, 115, 22, 0.15)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(249, 115, 22, 0.3)'
                }}>
                  <Text style={{ color: '#F97316', fontSize: 12, fontWeight: '700', marginRight: 4 }}>
                    Difficulty:
                  </Text>
                  <Text style={{ color: '#F97316', fontSize: 14, fontWeight: '700' }}>
                    {review.difficultyLevel || 0}/10
                  </Text>
                </View>
              </View>
              {review.reviewContent && (
                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                  {review.reviewContent}
                </Text>
              )}
            </View>
          ))}
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

export default StrengthWorkoutComponent;

