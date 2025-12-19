import React from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

const FollowingListScreen = () => {
  const navigation = useNavigation();
  const sampleFollowing = [
    { id: '1', userName: 'coach_mike' },
    { id: '2', userName: 'elite_runner' },
    { id: '3', userName: 'marathon_pro' },
  ];

  return (
    <BaseScreen>
      <ScrollView style={styles.screenContent} contentContainerStyle={styles.screenContentContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Following</Text>
        {sampleFollowing.map(user => (
          <View key={user.id} style={styles.userListItem}>
            <Text style={styles.userNameText}>{user.userName}</Text>
          </View>
        ))}
      </ScrollView>
    </BaseScreen>
  );
};

export default FollowingListScreen;
