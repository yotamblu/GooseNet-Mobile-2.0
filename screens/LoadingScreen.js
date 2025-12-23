import React, { useState, useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../utils/styles';
import GridOverlay from '../components/GridOverlay';

const LoadingScreen = ({ isLoggedIn, onStartPress, onRedirectToHome }) => {
  const [showStartButton, setShowStartButton] = useState(false);
  const gooseLogoOpacity = useState(new Animated.Value(0))[0];
  const gooseLogoScale = useState(new Animated.Value(0.5))[0];
  const gooseLogoTranslateY = useState(new Animated.Value(50))[0];
  const startButtonOpacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Check login status first (async)
    const checkLoginStatus = async () => {
      // Small delay to ensure component is mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Animate goose logo: fade in, scale up, and slide up
      Animated.parallel([
        Animated.timing(gooseLogoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(gooseLogoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(gooseLogoTranslateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // When animation completes
        if (!isLoggedIn) {
          // Show start button if not logged in
          setShowStartButton(true);
          Animated.timing(startButtonOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        } else {
          // Automatically redirect to home if logged in
          setTimeout(() => {
            onRedirectToHome();
          }, 500);
        }
      });
    };
    
    checkLoginStatus();
  }, [isLoggedIn, onRedirectToHome]);

  const handleStartPress = () => {
    onStartPress();
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#3B82F6']}
      style={styles.container}
    >
      <GridOverlay />
      <View style={styles.loadingContent}>
        <Image
          source={require('../assets/app_images/gnmobile_loading_title.png')}
          style={styles.titleLogo}
          resizeMode="contain"
        />
        
        <Animated.View
          style={[
            styles.gooseLogoContainer,
            {
              opacity: gooseLogoOpacity,
              transform: [
                { scale: gooseLogoScale },
                { translateY: gooseLogoTranslateY },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/app_images/goose-logo-no-bg.png')}
            style={styles.gooseLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {showStartButton && !isLoggedIn && (
        <Animated.View
          style={[
            styles.startButtonContainer,
            { opacity: startButtonOpacity },
          ]}
        >
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartPress}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>START</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <StatusBar style="light" />
    </LinearGradient>
  );
};

export default LoadingScreen;

