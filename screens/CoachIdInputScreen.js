import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';

export default function CoachIdInputScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [coachId, setCoachId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!coachId.trim()) {
      Alert.alert('Error', 'Please enter a Coach ID');
      return;
    }

    setLoading(true);
    try {
      // Fetch coach name from API
      const response = await fetch(
        `https://gooseapi.ddns.net/api/coachConnection/getCoachName?coachId=${encodeURIComponent(coachId.trim())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        const coachName = data.coachUsername || '';
        
        if (coachName) {
          // Navigate to confirmation screen with coach ID and name
          navigation.navigate('CoachConnectionConfirm', {
            coachId: coachId.trim(),
            coachName: coachName,
          });
        } else {
          Alert.alert('Error', 'Could not find coach name. Please check the Coach ID and try again.');
        }
      } else if (response.status === 404) {
        Alert.alert('Error', 'Coach ID not found. Please check and try again.');
      } else {
        Alert.alert('Error', 'Failed to verify Coach ID. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching coach name:', error);
      Alert.alert('Error', 'Failed to connect to server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    // No refresh needed for this screen
  };

  return (
    <BaseScreen showTopBar title="Connect to Coach" onRefresh={onRefresh}>
      <View style={[coachIdInputStyles.container, { paddingTop: insets.top + 90 }]}>
        <TouchableOpacity 
          style={[coachIdInputStyles.backButton, { top: insets.top + 50 }]} 
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={coachIdInputStyles.content}>
          <Text style={coachIdInputStyles.title}>Enter Coach ID</Text>
          <Text style={coachIdInputStyles.description}>
            Enter the Coach ID provided by your coach to connect with them.
          </Text>

          <View style={coachIdInputStyles.inputContainer}>
            <TextInput
              style={coachIdInputStyles.input}
              placeholder="Coach ID"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={coachId}
              onChangeText={setCoachId}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[coachIdInputStyles.nextButton, loading && coachIdInputStyles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={loading || !coachId.trim()}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={coachIdInputStyles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BaseScreen>
  );
}

const coachIdInputStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 1000,
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    fontSize: 18,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: '85%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

