import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { styles } from '../utils/styles';
import GridOverlay from '../components/GridOverlay';

const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      // Hash the password using SHA256
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      // Prepare the request body
      const requestBody = {
        userName: username.trim(),
        hashedPassword: hashedPassword,
      };

      // Make POST request to the API
      const response = await fetch('https://gooseapi.ddns.net/api/userAuth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 401) {
        // Unauthorized - wrong credentials
        Alert.alert('Login Failed', 'Username or password is incorrect');
        setIsLoading(false);
        return;
      }

      if (response.status === 200) {
        // Success - parse the response
        const data = await response.json();
        
        // Save userName and apiKey
        await AsyncStorage.setItem('userName', username.trim());
        const apiKey = data.apiKey || '';
        await AsyncStorage.setItem('apiKey', apiKey);
        
        // Fetch and cache the logged-in user's profile picture
        try {
          const picResponse = await fetch(
            `https://gooseapi.ddns.net/api/profilePic?userName=${encodeURIComponent(username.trim())}`
          );
          
          if (picResponse.ok) {
            const base64Data = await picResponse.text();
            if (base64Data && base64Data.length > 0) {
              // Store in cache with username as key
              const cacheKey = `profilePic_${username.trim()}`;
              const imageData = base64Data.startsWith('data:image') 
                ? base64Data 
                : `data:image/png;base64,${base64Data}`;
              await AsyncStorage.setItem(cacheKey, imageData);
              // Store timestamp for cache validation
              await AsyncStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
            }
          }
        } catch (picError) {
          console.log('Error fetching profile pic on login:', picError);
          // Continue with login even if pic fetch fails
        }
        
        // Get user role
        try {
          const roleResponse = await fetch(
            `https://gooseapi.ddns.net/api/getRole?apiKey=${encodeURIComponent(apiKey)}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (roleResponse.status === 200) {
            const roleData = await roleResponse.json();
            if (roleData.role) {
              await AsyncStorage.setItem('role', roleData.role);
            }
          } else {
            console.error('Failed to get user role:', roleResponse.status);
          }
        } catch (roleError) {
          console.error('Error fetching user role:', roleError);
          // Continue with login even if role fetch fails
        }
        
        setIsLoading(false);
        onLoginSuccess();
      } else {
        // Other error status
        Alert.alert('Error', 'Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
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
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? 'LOGGING IN...' : 'LOGIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="light" />
    </LinearGradient>
  );
};

export default LoginScreen;

