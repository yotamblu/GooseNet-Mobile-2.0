import React from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

const FollowersListScreen = () => {
  const navigation = useNavigation();
  const sampleFollowers = [
    { id: '1', userName: 'john_doe' },
    { id: '2', userName: 'jane_smith' },
    { id: '3', userName: 'mike_jones' },
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
        <Text style={styles.screenTitle}>Followers</Text>
        {sampleFollowers.map(follower => (
          <View key={follower.id} style={styles.userListItem}>
            <Text style={styles.userNameText}>{follower.userName}</Text>
          </View>
        ))}
      </ScrollView>
    </BaseScreen>
  );
};

export default FollowersListScreen;
