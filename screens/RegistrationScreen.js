import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { styles } from '../utils/styles';
import GridOverlay from '../components/GridOverlay';

const RegistrationScreen = ({ onRegistrationSuccess, onBackToLogin, initialData }) => {
  const [userName, setUserName] = useState(initialData?.userName || '');
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [role, setRole] = useState(initialData?.role || 'athlete');
  const [isLoading, setIsLoading] = useState(false);

  const validateUserName = (username) => {
    // No spaces and no . $ # [ ] /
    const invalidChars = /[\s.$#\[\]/]/;
    return !invalidChars.test(username);
  };

  const validatePassword = (pwd) => {
    return pwd.length >= 8;
  };

  const validateEmail = (email) => {
    // Standard email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = userName.trim().length > 0 && 
                      fullName.trim().length > 0 && 
                      email.trim().length > 0 && 
                      validateEmail(email.trim()) &&
                      password.trim().length > 0;

  const handleRegistration = async () => {
    // Validation
    if (!userName.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!validateUserName(userName.trim())) {
      Alert.alert('Error', 'Username cannot contain spaces or the characters: . $ # [ ] /');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Hash the password using SHA256
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      // Prepare the request body matching the User class
      const requestBody = {
        UserName: userName.trim(),
        FullName: fullName.trim(),
        Email: email.trim(),
        Password: hashedPassword,
        Role: role,
      };

      // Make POST request to the registration API
      const response = await fetch('https://gooseapi.ddns.net/api/registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 400) {
        // Username already exists
        Alert.alert('Registration Failed', 'Username already exists. Please choose a different username.');
        setIsLoading(false);
        // Clear username field so user can enter a new one
        setUserName('');
        return;
      }

      if (response.status === 200) {
        // Registration successful - auto-login the user
        try {
          // Hash password again for login
          const loginHashedPassword = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            password
          );

          const loginRequestBody = {
            userName: userName.trim(),
            hashedPassword: loginHashedPassword,
          };

          const loginResponse = await fetch('https://gooseapi.ddns.net/api/userAuth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginRequestBody),
          });

          if (loginResponse.status === 200) {
            const loginData = await loginResponse.json();
            
            // Save userName and apiKey
            await AsyncStorage.setItem('userName', userName.trim());
            const apiKey = loginData.apiKey || '';
            await AsyncStorage.setItem('apiKey', apiKey);
            await AsyncStorage.setItem('role', role);

            // Validate Garmin connection for athletes
            if (role === 'athlete') {
              try {
                const garminResponse = await fetch(
                  `https://gooseapi.ddns.net/api/ValidateGarminConnection?apiKey=${encodeURIComponent(apiKey)}`,
                  {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }
                );
                
                if (garminResponse.status === 200) {
                  const garminData = await garminResponse.json();
                  if (garminData.isConnected === true) {
                    await AsyncStorage.setItem('garminConnected', 'true');
                  } else {
                    await AsyncStorage.removeItem('garminConnected');
                  }
                }
              } catch (garminError) {
                console.error('Error validating Garmin connection:', garminError);
                // Continue with login even if Garmin validation fails
              }
            }

            // Fetch and cache the logged-in user's profile picture
            try {
              const picResponse = await fetch(
                `https://gooseapi.ddns.net/api/profilePic?userName=${encodeURIComponent(userName.trim())}`
              );
              
              if (picResponse.ok) {
                const base64Data = await picResponse.text();
                if (base64Data && base64Data.length > 0) {
                  const cacheKey = `profilePic_${userName.trim()}`;
                  const imageData = base64Data.startsWith('data:image') 
                    ? base64Data 
                    : `data:image/png;base64,${base64Data}`;
                  await AsyncStorage.setItem(cacheKey, imageData);
                  await AsyncStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
                }
              }
            } catch (picError) {
              console.log('Error fetching profile pic on registration:', picError);
            }

            setIsLoading(false);
            onRegistrationSuccess();
          } else {
            Alert.alert('Error', 'Registration successful but auto-login failed. Please login manually.');
            setIsLoading(false);
            onBackToLogin({
              userName: userName.trim(),
              fullName: fullName.trim(),
              email: email.trim(),
              password: password,
              role: role,
            });
          }
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          Alert.alert('Error', 'Registration successful but auto-login failed. Please login manually.');
          setIsLoading(false);
          onBackToLogin({
            userName: userName.trim(),
            fullName: fullName.trim(),
            email: email.trim(),
            password: password,
            role: role,
          });
        }
      } else {
        Alert.alert('Error', 'Registration failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to connect to server. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#3B82F6']}
      style={styles.container}
    >
      <GridOverlay />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.loginScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loginContent}>
            <Image
              source={require('../assets/app_images/gnmobile_loading_title.png')}
              style={styles.loginTitleLogo}
              resizeMode="contain"
            />
            
            <Image
              source={require('../assets/app_images/goose-logo-no-bg.png')}
              style={styles.loginGooseLogo}
              resizeMode="contain"
            />
            
            <View style={styles.loginForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>User Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={userName}
                  onChangeText={setUserName}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password (min 8 characters)"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.rolePickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.rolePickerButton,
                      role === 'athlete' && styles.rolePickerButtonActive
                    ]}
                    onPress={() => setRole('athlete')}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.rolePickerButtonText,
                      role === 'athlete' && styles.rolePickerButtonTextActive
                    ]}>
                      Athlete
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.rolePickerButton,
                      role === 'coach' && styles.rolePickerButtonActive
                    ]}
                    onPress={() => setRole('coach')}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.rolePickerButtonText,
                      role === 'coach' && styles.rolePickerButtonTextActive
                    ]}>
                      Coach
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, (!isFormValid || isLoading) && styles.loginButtonDisabled]}
                onPress={handleRegistration}
                activeOpacity={0.8}
                disabled={!isFormValid || isLoading}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'REGISTERING...' : 'REGISTER'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => onBackToLogin({
                  userName: userName.trim(),
                  fullName: fullName.trim(),
                  email: email.trim(),
                  password: password,
                  role: role,
                })}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <Text style={styles.backToLoginButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="light" />
    </LinearGradient>
  );
};

export default RegistrationScreen;

