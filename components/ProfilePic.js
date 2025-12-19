import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, Image, Animated, Easing, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import { RefreshContext } from '../contexts/RefreshContext';

// Android AsyncStorage has a ~2MB limit per row
const MAX_CACHE_SIZE = Platform.OS === 'android' ? 1500000 : 5000000; // 1.5MB on Android, 5MB on iOS

const ProfilePic = ({ userName, size = 50 }) => {
  const refreshContext = useContext(RefreshContext);
  const refreshTrigger = refreshContext?.refreshTrigger ?? 0; 
   const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const checkInProgressRef = useRef(false);
  
  // Animation for loading state
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (loading) {
      // Start pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    }
  }, [loading, pulseAnim]);

  useEffect(() => {
    if (!userName) {
      setImageBase64(null);
      setError(false);
      return;
    }

    const loadProfilePic = async () => {
      const cacheKey = `profilePic_${userName}`;
      let cachedImage = null;
      
      // If refreshTrigger changed, clear cache to force fresh fetch
      if (refreshTrigger > 0) {
        try {
          await AsyncStorage.removeItem(cacheKey);
          await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
        } catch (err) {
          // Ignore cache clearing errors
        }
      }
      
      // First, try to load from cache (instant display) - skip if refresh was triggered
      if (refreshTrigger === 0) {
        try {
          cachedImage = await AsyncStorage.getItem(cacheKey);
          if (cachedImage) {
            // Check if cached image is too large (might cause issues on Android)
            if (cachedImage.length > MAX_CACHE_SIZE) {
              // Image too large, remove from cache and don't use it
              try {
                await AsyncStorage.removeItem(cacheKey);
                await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
              } catch (removeErr) {
                // Ignore removal errors
              }
              cachedImage = null;
              setLoading(true);
            } else {
              setImageBase64(cachedImage);
              setError(false);
              // Don't show loading state if we have cache
            }
          } else {
            setLoading(true);
          }
        } catch (err) {
          // On Android, "Row too big" errors are common - just skip cache
          if (Platform.OS === 'android' && err.message && err.message.includes('Row too big')) {
            // Try to remove the problematic cache entry
            try {
              await AsyncStorage.removeItem(cacheKey);
              await AsyncStorage.removeItem(`${cacheKey}_timestamp`);
            } catch (removeErr) {
              // Ignore removal errors
            }
          } else {
            console.log('Error loading cached profile pic:', err);
          }
          setLoading(true);
        }
      } else {
        // If refresh was triggered, skip cache and go straight to fetch
        setLoading(true);
      }

      // Asynchronously check for updates (don't block UI)
      if (checkInProgressRef.current) {
        return; // Prevent multiple simultaneous checks
      }
      
      checkInProgressRef.current = true;
      
      try {
        const response = await fetch(
          `https://gooseapi.ddns.net/api/profilePic?userName=${encodeURIComponent(userName)}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile pic');
        }
        
        const base64Data = await response.text();
        
        if (base64Data && base64Data.length > 0) {
          // Format the base64 data
          const imageData = base64Data.startsWith('data:image') 
            ? base64Data 
            : `data:image/png;base64,${base64Data}`;
          
          // Only update if the image is different from cached version
          if (cachedImage !== imageData) {
            setImageBase64(imageData);
            // Update cache only if image is not too large
            if (imageData.length <= MAX_CACHE_SIZE) {
              try {
                await AsyncStorage.setItem(cacheKey, imageData);
                await AsyncStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
              } catch (cacheErr) {
                // On Android, if image is too large, just skip caching
                if (Platform.OS === 'android' && cacheErr.message && cacheErr.message.includes('Row too big')) {
                  // Don't cache large images on Android - just use them directly
                  // This is expected behavior, no need to log
                } else {
                  console.log('Error caching profile pic:', cacheErr);
                }
              }
            } else {
              // Image too large to cache - use it directly without caching
              // This is fine, we just won't have instant load next time
            }
          }
          setError(false);
        } else {
          // If API returns empty but we have cache, keep using cache
          if (!cachedImage) {
            setError(true);
          }
        }
      } catch (err) {
        console.log('Error fetching profile pic:', err.message);
        // Don't set error if we have cached image
        if (!cachedImage) {
          setError(true);
        }
      } finally {
        setLoading(false);
        checkInProgressRef.current = false;
      }
    };

    loadProfilePic();
  }, [userName, refreshTrigger]);

  const borderStyle = {
    borderWidth: 2,
    borderColor: '#000000',
  };

  // Show loading animation
  if (loading) {
    return (
      <Animated.View 
        style={[
          styles.defaultProfilePic, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            opacity: pulseAnim,
          }, 
          borderStyle
        ]}
      >
        <Animated.Text 
          style={[
            styles.defaultProfilePicText, 
            { fontSize: size * 0.4 }
          ]}
        >
          {userName ? userName.charAt(0).toUpperCase() : '?'}
        </Animated.Text>
      </Animated.View>
    );
  }

  // Show default avatar if no image or error
  if (!userName || error || !imageBase64) {
    return (
      <View style={[styles.defaultProfilePic, { width: size, height: size, borderRadius: size / 2 }, borderStyle]}>
        <Text style={[styles.defaultProfilePicText, { fontSize: size * 0.4 }]}>
          {userName ? userName.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageBase64 }}
      style={[{ width: size, height: size, borderRadius: size / 2 }, borderStyle]}
      onError={() => setError(true)}
    />
  );
};

export default ProfilePic;
