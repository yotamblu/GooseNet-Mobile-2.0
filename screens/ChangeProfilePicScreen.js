import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BaseScreen from '../components/BaseScreen';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';

export default function ChangeProfilePicScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { triggerRefresh } = useContext(RefreshContext);
  const [userName, setUserName] = useState('');
  const [currentProfilePic, setCurrentProfilePic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Load user name on mount
  useEffect(() => {
    const loadUserName = async () => {
      const name = await AsyncStorage.getItem('userName');
      setUserName(name || '');
    };
    loadUserName();
  }, []);

  // Refresh profile picture from API every time screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshProfilePic = async () => {
        const name = await AsyncStorage.getItem('userName');
        if (!name) return;

        try {
          // Clear cache to force fresh fetch
          const cacheKey = `profilePic_${name}`;
          await AsyncStorage.removeItem(cacheKey);
          await AsyncStorage.removeItem(`${cacheKey}_timestamp`);

          // Fetch fresh from API
          const response = await fetch(
            `https://gooseapi.ddns.net/api/profilePic?userName=${encodeURIComponent(name)}`
          );
          if (response.ok) {
            const base64Data = await response.text();
            if (base64Data && base64Data.length > 0) {
              const imageData = base64Data.startsWith('data:image') 
                ? base64Data 
                : `data:image/png;base64,${base64Data}`;
              setCurrentProfilePic(imageData);
            } else {
              // No image from API, clear current pic
              setCurrentProfilePic(null);
            }
          } else {
            // API error, clear current pic
            setCurrentProfilePic(null);
          }
        } catch (error) {
          console.error('Error refreshing profile pic:', error);
          // On error, try to load from cache as fallback
          try {
            const cacheKey = `profilePic_${name}`;
            const cachedImage = await AsyncStorage.getItem(cacheKey);
            if (cachedImage) {
              setCurrentProfilePic(cachedImage);
            }
          } catch (cacheError) {
            setCurrentProfilePic(null);
          }
        }
      };

      refreshProfilePic();
    }, [])
  );

  const showSuccessAnimation = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
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

    // Auto-close after 2 seconds and navigate back
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(successScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessModal(false);
        // Trigger refresh to update profile pics
        triggerRefresh();
        // Navigate back to Settings
        navigation.navigate('Settings');
      });
    }, 2000);
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and media library permissions to change your profile picture.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const convertImageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result;
          // Remove data:image/...;base64, prefix if present
          const base64Data = base64String.includes(',') 
            ? base64String.split(',')[1] 
            : base64String;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS === 'ios', // Only enable editing on iOS (Android has UI issues)
        aspect: Platform.OS === 'ios' ? [1, 1] : undefined, // Aspect only works with allowsEditing
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProfilePic(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: Platform.OS === 'ios', // Only enable editing on iOS (Android has UI issues)
        aspect: Platform.OS === 'ios' ? [1, 1] : undefined, // Aspect only works with allowsEditing
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProfilePic(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: handleTakePhoto },
        { text: 'Photo Library', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadProfilePic = async (imageUri) => {
    setIsLoading(true);
    try {
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      // Convert image to base64
      const base64Data = await convertImageToBase64(imageUri);

      const url = `https://gooseapi.ddns.net/api/editProfile/changePIc?apiKey=${encodeURIComponent(apiKey)}&isRevert=false`;
      const requestBody = {
        PicString: base64Data,
      };

      console.log('Change Profile Pic API Call:');
      console.log('URL:', url);
      console.log('Method: POST');
      console.log('Body size:', base64Data.length, 'characters');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (response.status === 200) {
        // Clear cache to force refresh
        if (userName) {
          const cacheKey = `profilePic_${userName}`;
          await AsyncStorage.removeItem(cacheKey);
          await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
        }
        showSuccessAnimation('Profile picture updated successfully!');
      } else {
        let errorMessage = 'Failed to update profile picture. Please try again.';
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Use default error message
        }
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error uploading profile pic:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToDefault = async () => {
    Alert.alert(
      'Revert to Default',
      'Are you sure you want to revert to the default profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const apiKey = await AsyncStorage.getItem('apiKey');
              if (!apiKey) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                setIsLoading(false);
                return;
              }

              const url = `https://gooseapi.ddns.net/api/editProfile/changePIc?apiKey=${encodeURIComponent(apiKey)}&isRevert=true`;

              console.log('Revert Profile Pic API Call:');
              console.log('URL:', url);
              console.log('Method: POST');
              console.log('Body: {} (empty)');

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
              });

              console.log('Response status:', response.status);

              if (response.status === 200) {
                // Clear cache to force refresh
                if (userName) {
                  const cacheKey = `profilePic_${userName}`;
                  await AsyncStorage.removeItem(cacheKey);
                  await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
                }
                showSuccessAnimation('Profile picture reverted to default!');
              } else {
                let errorMessage = 'Failed to revert profile picture. Please try again.';
                try {
                  const errorData = await response.json();
                  if (errorData.message) {
                    errorMessage = errorData.message;
                  }
                } catch (e) {
                  // Use default error message
                }
                Alert.alert('Error', errorMessage);
              }
            } catch (error) {
              console.error('Error reverting profile pic:', error);
              Alert.alert('Error', 'Failed to revert profile picture. Please check your connection and try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    // No refresh needed for this screen
  };

  return (
    <BaseScreen showTopBar title="Change Profile Picture" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          changeProfilePicStyles.scrollContent,
          { paddingTop: insets.top + 90 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[changeProfilePicStyles.backButton, { top: insets.top + 50 }]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={changeProfilePicStyles.content}>
          <Text style={changeProfilePicStyles.title}>Change Profile Picture</Text>
          <Text style={changeProfilePicStyles.description}>
            Tap the camera icon to take a new photo or choose from your gallery.
          </Text>

          {/* Profile Picture with Overlay */}
          <View style={changeProfilePicStyles.profilePicContainer}>
            {currentProfilePic ? (
              <Image
                source={{ uri: currentProfilePic }}
                style={changeProfilePicStyles.profilePic}
              />
            ) : (
              <View style={changeProfilePicStyles.defaultProfilePic}>
                <Text style={changeProfilePicStyles.defaultProfilePicText}>
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={changeProfilePicStyles.overlay}
              onPress={handleImagePicker}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={changeProfilePicStyles.cameraIconContainer}>
                <Ionicons name="camera" size={40} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={changeProfilePicStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={changeProfilePicStyles.loadingText}>Uploading...</Text>
            </View>
          )}

          {/* Revert Button */}
          <TouchableOpacity
            style={[
              changeProfilePicStyles.revertButton,
              isLoading && changeProfilePicStyles.revertButtonDisabled
            ]}
            onPress={handleRevertToDefault}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            <Text style={changeProfilePicStyles.revertButtonText}>Revert to Default</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => {}}
      >
        <View style={changeProfilePicStyles.successOverlay}>
          <Animated.View
            style={[
              changeProfilePicStyles.successContainer,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={changeProfilePicStyles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={changeProfilePicStyles.successTitle}>Success!</Text>
            <Text style={changeProfilePicStyles.successText}>
              {successMessage}
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </BaseScreen>
  );
}

const changeProfilePicStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  profilePicContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  defaultProfilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  defaultProfilePicText: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginTop: 12,
  },
  revertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
    minWidth: 200,
  },
  revertButtonDisabled: {
    opacity: 0.5,
  },
  revertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

