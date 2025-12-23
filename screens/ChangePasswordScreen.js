import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import BaseScreen from '../components/BaseScreen';
import { styles } from '../utils/styles';

export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Validation: passwords must match and be over 8 characters
  const isPasswordValid = newPassword.length >= 8;
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isPasswordValid && doPasswordsMatch;

  const showSuccessAnimation = () => {
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
        // Clear password fields
        setNewPassword('');
        setConfirmPassword('');
        // Navigate back to Settings
        navigation.navigate('Settings');
      });
    }, 2000);
  };

  const handleChangePassword = async () => {
    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      // Hash the password using SHA256
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        newPassword
      );

      const url = `https://gooseapi.ddns.net/api/editprofile/changepassword?apiKey=${encodeURIComponent(apiKey)}`;
      const requestBody = {
        NewPassword: hashedPassword,
      };

      console.log('Change Password API Call:');
      console.log('URL:', url);
      console.log('Method: POST');
      console.log('Body:', JSON.stringify(requestBody));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (response.status === 200) {
        // Show success animation
        showSuccessAnimation();
      } else {
        let errorMessage = 'Failed to change password. Please try again.';
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
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = () => {
    // No refresh needed for this screen
  };

  return (
    <BaseScreen showTopBar title="Change Password" onRefresh={onRefresh}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            changePasswordStyles.scrollContent,
            { paddingTop: insets.top + 90 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[changePasswordStyles.backButton, { top: insets.top + 50 }]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={changePasswordStyles.content}>
            <Text style={changePasswordStyles.title}>Change Password</Text>
            <Text style={changePasswordStyles.description}>
              Enter your new password. It must be at least 8 characters long.
            </Text>

            {/* New Password Input */}
            <View style={changePasswordStyles.inputContainer}>
              <Text style={changePasswordStyles.inputLabel}>New Password</Text>
              <View style={changePasswordStyles.passwordInputWrapper}>
                <TextInput
                  style={changePasswordStyles.passwordInput}
                  placeholder="Enter new password (min 8 characters)"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={changePasswordStyles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="rgba(255, 255, 255, 0.7)"
                  />
                </TouchableOpacity>
              </View>
              {newPassword.length > 0 && !isPasswordValid && (
                <Text style={changePasswordStyles.errorText}>
                  Password must be at least 8 characters long
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={changePasswordStyles.inputContainer}>
              <Text style={changePasswordStyles.inputLabel}>Confirm Password</Text>
              <View style={changePasswordStyles.passwordInputWrapper}>
                <TextInput
                  style={changePasswordStyles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={changePasswordStyles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="rgba(255, 255, 255, 0.7)"
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && !doPasswordsMatch && (
                <Text style={changePasswordStyles.errorText}>
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                changePasswordStyles.submitButton,
                (!isFormValid || isLoading) && changePasswordStyles.submitButtonDisabled
              ]}
              onPress={handleChangePassword}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={changePasswordStyles.submitButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => {}}
      >
        <View style={changePasswordStyles.successOverlay}>
          <Animated.View
            style={[
              changePasswordStyles.successContainer,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={changePasswordStyles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={changePasswordStyles.successTitle}>Password Changed!</Text>
            <Text style={changePasswordStyles.successText}>
              Your password has been updated successfully.
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </BaseScreen>
  );
}

const changePasswordStyles = StyleSheet.create({
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
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
    width: '100%',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    height: 50,
  },
  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    color: '#F97316',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
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

