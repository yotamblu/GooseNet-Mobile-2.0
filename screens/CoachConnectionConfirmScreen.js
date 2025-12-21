import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import ProfilePic from '../components/ProfilePic';

export default function CoachConnectionConfirmScreen({ route }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { coachId, coachName } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const errorScale = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  const handleConnect = async () => {
    if (!coachId || !coachName) {
      Alert.alert('Error', 'Missing coach information. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('https://gooseapi.ddns.net/api/coachConnection/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey,
          coachId: coachId,
        }),
      });

      if (response.status === 200) {
        // Show success animation
        showSuccessAnimation();
        
        // After animation, navigate to home
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }, 2000);
      } else {
        try {
          const errorData = await response.json();
          if (errorData.message && errorData.message.includes('cannot connect to the same coach twice')) {
            // Show error animation with message
            showErrorAnimation(errorData.message);
          } else {
            const errorText = errorData.message || 'Failed to connect to coach. Please try again.';
            Alert.alert('Error', errorText);
            setLoading(false);
          }
        } catch (parseError) {
          const errorText = await response.text();
          console.error('Connection error:', response.status, errorText);
          Alert.alert('Error', 'Failed to connect to coach. Please try again.');
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error connecting to coach:', error);
      Alert.alert('Error', 'Failed to connect to server. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const showSuccessAnimation = () => {
    setShowSuccessModal(true);
    setLoading(false);
    // Reset animation values
    successScale.setValue(0);
    successOpacity.setValue(0);

    // Animate success
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showErrorAnimation = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
    setLoading(false);
    // Reset animation values
    errorScale.setValue(0);
    errorOpacity.setValue(0);

    // Animate error
    Animated.parallel([
      Animated.spring(errorScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(errorOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(errorScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(errorOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowErrorModal(false);
      });
    }, 3000);
  };

  const onRefresh = () => {
    // No refresh needed for this screen
  };

  if (!coachId || !coachName) {
    return (
      <BaseScreen showTopBar title="Connect to Coach" onRefresh={onRefresh}>
        <View style={[confirmStyles.container, { paddingTop: insets.top + 90 }]}>
          <View style={confirmStyles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text style={confirmStyles.errorText}>Missing coach information</Text>
            <TouchableOpacity
              style={confirmStyles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={confirmStyles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BaseScreen>
    );
  }

  return (
    <BaseScreen showTopBar title="Connect to Coach" onRefresh={onRefresh}>
      <View style={[confirmStyles.container, { paddingTop: insets.top + 90 }]}>
        <TouchableOpacity 
          style={[confirmStyles.backButtonTop, { top: insets.top + 50 }]} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={confirmStyles.content}>
          <Text style={confirmStyles.title}>Connect to Coach?</Text>
          
          <View style={confirmStyles.coachInfo}>
            <ProfilePic userName={coachName} size={100} />
            <Text style={confirmStyles.coachName}>{coachName}</Text>
          </View>

          <Text style={confirmStyles.confirmationText}>
            Are you sure you want to connect with coach {coachName}?
          </Text>

          <View style={confirmStyles.buttonContainer}>
            <TouchableOpacity
              style={[confirmStyles.cancelButton, loading && confirmStyles.buttonDisabled]}
              onPress={() => navigation.goBack()}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={confirmStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[confirmStyles.connectButton, loading && confirmStyles.buttonDisabled]}
              onPress={handleConnect}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={confirmStyles.connectButtonText}>Yes, Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Modal */}
        {showSuccessModal && (
          <View style={confirmStyles.successOverlay}>
            <Animated.View
              style={[
                confirmStyles.successContainer,
                {
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                },
              ]}
            >
              <View style={confirmStyles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
              </View>
              <Text style={confirmStyles.successTitle}>Connection Successful!</Text>
              <Text style={confirmStyles.successText}>
                You are now connected with {coachName}.
              </Text>
            </Animated.View>
          </View>
        )}

        {/* Error Modal */}
        {showErrorModal && (
          <View style={confirmStyles.errorOverlay}>
            <Animated.View
              style={[
                confirmStyles.errorContainer,
                {
                  opacity: errorOpacity,
                  transform: [{ scale: errorScale }],
                },
              ]}
            >
              <View style={confirmStyles.errorIconContainer}>
                <Ionicons name="close-circle" size={80} color="#EF4444" />
              </View>
              <Text style={confirmStyles.errorTitle}>Connection Failed</Text>
              <Text style={confirmStyles.errorText}>
                {errorMessage}
              </Text>
            </Animated.View>
          </View>
        )}
      </View>
    </BaseScreen>
  );
}

const confirmStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButtonTop: {
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
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  coachInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  coachName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
  },
  confirmationText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#F97316',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  successContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    minWidth: 280,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  successText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  errorContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    minWidth: 280,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
});

