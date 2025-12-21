import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { ScrollView, View, TouchableOpacity, Text, Image, Alert, Modal, StyleSheet, ActivityIndicator, Animated, Platform, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import ProfilePic from '../components/ProfilePic';
import { RefreshContext } from '../contexts/RefreshContext';
import { Ionicons } from '@expo/vector-icons';

// Import InAppBrowser for both iOS and Android (Garmin blocks WebView)
let InAppBrowser = null;
try {
  const InAppBrowserModule = require('react-native-inappbrowser-reborn');
  InAppBrowser = InAppBrowserModule.default || InAppBrowserModule;
  console.log('InAppBrowser module require successful');
  console.log('InAppBrowser type:', typeof InAppBrowser);
  if (InAppBrowser) {
    console.log('InAppBrowser methods:', Object.keys(InAppBrowser));
  }
  // Verify the module has the required methods
  if (!InAppBrowser || typeof InAppBrowser.isAvailable !== 'function') {
    console.warn('⚠️ InAppBrowser module loaded but methods not available');
    console.warn('This usually means you need a development build (not Expo Go)');
    console.warn('InAppBrowser requires native code and won\'t work in Expo Go');
    InAppBrowser = null;
  } else {
    console.log('✅ InAppBrowser module loaded with required methods');
  }
} catch (e) {
  console.warn('⚠️ InAppBrowser not available:', e.message);
  console.warn('Error details:', e);
  console.warn('Note: InAppBrowser requires a development build, not Expo Go');
  InAppBrowser = null;
}

export default function SettingsScreen({ onLogout }) {
  const navigation = useNavigation();
  const { triggerRefresh } = useContext(RefreshContext);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [garminConnected, setGarminConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showGarminModal, setShowGarminModal] = useState(false);
  const [garminUrl, setGarminUrl] = useState('');
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [oauthToken, setOauthToken] = useState('');
  const [oauthTokenSecret, setOauthTokenSecret] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const processOAuthCallbackRef = useRef(null);

  const validateGarminConnection = useCallback(async () => {
    try {
      const apiKey = await AsyncStorage.getItem('apiKey');
      const role = await AsyncStorage.getItem('role');
      
      // Only validate for athletes
      if (!apiKey || role !== 'athlete') {
        return;
      }
      
      console.log('Validating Garmin connection status...');
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
        const isConnected = garminData.isConnected === true;
        
        if (isConnected) {
          await AsyncStorage.setItem('garminConnected', 'true');
          setGarminConnected(true);
          console.log('✅ Garmin connection validated: Connected');
        } else {
          await AsyncStorage.removeItem('garminConnected');
          setGarminConnected(false);
          console.log('✅ Garmin connection validated: Not connected');
        }
      } else {
        console.warn('⚠️ Garmin validation failed with status:', garminResponse.status);
        // Don't change state if validation fails - keep current status
      }
    } catch (garminError) {
      console.error('Error validating Garmin connection:', garminError);
      // Don't change state on error - keep current status
    }
  }, []);

  const loadData = useCallback(async () => {
    const name = await AsyncStorage.getItem('userName');
    const role = await AsyncStorage.getItem('role');
    const garminStatus = await AsyncStorage.getItem('garminConnected');
    setUserName(name || '');
    setUserRole(role);
    setGarminConnected(garminStatus === 'true');
    
    // Validate Garmin connection status for athletes
    if (role === 'athlete') {
      await validateGarminConnection();
    }
  }, [validateGarminConnection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep link listener for Android OAuth callback (EAS builds only)
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return; // Only needed on Android
    }

    const handleDeepLink = async (event) => {
      const url = event.url || event;
      console.log('=== DEEP LINK RECEIVED ===');
      console.log('URL:', url);
      
      if (url && url.startsWith('goosenet://oauth')) {
        console.log('Processing OAuth deep link...');
        
        try {
          // Parse the deep link URL
          let oauthVerifier = null;
          
          try {
            const urlObj = new URL(url.replace('goosenet://', 'https://'));
            oauthVerifier = urlObj.searchParams.get('oauth_verifier');
          } catch (parseError) {
            // Fallback: manual extraction
            console.log('URL parsing failed, using manual extraction');
            const verifierMatch = url.match(/[?&]oauth_verifier=([^&]+)/);
            if (verifierMatch) oauthVerifier = decodeURIComponent(verifierMatch[1]);
          }
          
          console.log('Extracted oauth_verifier:', oauthVerifier ? 'Found' : 'Missing');
          
          if (oauthVerifier && !isProcessingCallback) {
            setIsProcessingCallback(true);
            
            // Close InAppBrowser if it's still open
            try {
              if (InAppBrowser && typeof InAppBrowser.closeAuth === 'function') {
                await InAppBrowser.closeAuth();
                console.log('✅ InAppBrowser closed from deep link handler');
              }
            } catch (closeError) {
              console.warn('Could not close InAppBrowser:', closeError);
            }
            
            // Process the OAuth callback
            // Use setTimeout to ensure processOAuthCallback is defined (it's defined later in component)
            setTimeout(async () => {
              try {
                await processOAuthCallback(oauthVerifier);
              } catch (err) {
                console.error('Error processing OAuth callback from deep link:', err);
                setIsProcessingCallback(false);
              }
            }, 100);
          } else if (!oauthVerifier) {
            console.error('No oauth_verifier found in deep link');
            Alert.alert('Error', 'Invalid OAuth callback. Please try again.');
            setIsProcessingCallback(false);
          } else if (isProcessingCallback) {
            console.log('Already processing callback, ignoring duplicate deep link');
          }
        } catch (error) {
          console.error('Error parsing deep link:', error);
          Alert.alert('Error', 'Failed to process OAuth callback. Please try again.');
          setIsProcessingCallback(false);
        }
      }
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with initial URL:', url);
        handleDeepLink(url);
      }
    }).catch(err => {
      console.error('Error getting initial URL:', err);
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, [isProcessingCallback]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh(); // Refresh all profile pics
    await loadData(); // This will also validate Garmin connection for athletes
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  }, [loadData, triggerRefresh]);

  const handlePairWithGarmin = async () => {
    try {
      // Clear any old OAuth tokens from previous pairing attempts
      try {
        await AsyncStorage.removeItem('garmin_oauth_token');
        await AsyncStorage.removeItem('garmin_oauth_token_secret');
        console.log('✅ Cleared old OAuth tokens');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clear old OAuth tokens:', cleanupError);
      }
      
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'Unable to pair. Please log in again.');
        return;
      }

      // Step 1: Fetch request token
      setWebViewLoading(true);
      const requestTokenResponse = await fetch(
        `https://gooseapi.ddns.net/api/request-token?apiKey=${encodeURIComponent(apiKey)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (requestTokenResponse.status !== 200) {
        // Log detailed error information for debugging
        console.error('=== GARMIN REQUEST TOKEN ERROR ===');
        console.error('Status:', requestTokenResponse.status);
        console.error('Status Text:', requestTokenResponse.statusText);
        console.error('URL:', requestTokenResponse.url);
        
        let errorBody = '';
        try {
          errorBody = await requestTokenResponse.text();
          console.error('Error Response Body:', errorBody);
          
          // Try to parse as JSON if possible
          try {
            const errorJson = JSON.parse(errorBody);
            console.error('Error Response JSON:', JSON.stringify(errorJson, null, 2));
          } catch (e) {
            // Not JSON, that's fine
          }
        } catch (textError) {
          console.error('Error reading error response:', textError);
        }
        
        // Log headers if available
        if (requestTokenResponse.headers) {
          console.error('Response Headers:', Object.fromEntries(requestTokenResponse.headers.entries()));
        }
        
        console.error('=== END REQUEST TOKEN ERROR ===');
        
        throw new Error(`Failed to get request token (Status: ${requestTokenResponse.status})`);
      }

      const tokenData = await requestTokenResponse.json();
      const token = tokenData.oauth_token;
      const tokenSecret = tokenData.oauth_token_secret;

      setOauthToken(token);
      setOauthTokenSecret(tokenSecret);
      
      // Persist tokens to AsyncStorage so they survive app backgrounding
      try {
        await AsyncStorage.setItem('garmin_oauth_token', token);
        await AsyncStorage.setItem('garmin_oauth_token_secret', tokenSecret);
        console.log('✅ OAuth tokens saved to AsyncStorage');
      } catch (storageError) {
        console.error('⚠️ Failed to save OAuth tokens to AsyncStorage:', storageError);
        // Continue anyway - state should still work
      }
      
      setIsProcessingCallback(false); // Reset flag when starting new pairing

      // Step 2: Build Garmin OAuth URL
      // NOTE: oauth_token_secret should NOT be in the URL - it's only used server-side
      const callbackUrl = 'https://goosenet.space/auth-success.html';
      const encodedCallback = encodeURIComponent(callbackUrl);
      console.log('Callback URL:', callbackUrl);
      console.log('Encoded callback:', encodedCallback);
      
      // URL with callback for InAppBrowser
      const pairingUrlWithCallback = `https://connect.garmin.com/oauthConfirm?oauth_token=${encodeURIComponent(token)}&oauth_callback=${encodedCallback}`;
      // URL without callback for WebView (Garmin may handle this differently)
      const pairingUrlNoCallback = `https://connect.garmin.com/oauthConfirm?oauth_token=${encodeURIComponent(token)}`;
      
      console.log('%c🔗 GARMIN OAUTH URL (with callback):', 'color: #F97316; font-size: 16px; font-weight: bold;');
      console.log('%c' + pairingUrlWithCallback, 'color: #3B82F6; font-size: 14px; background: #0F172A; padding: 5px;');
      console.log('%c🔗 GARMIN OAUTH URL (no callback for WebView):', 'color: #F97316; font-size: 16px; font-weight: bold;');
      console.log('%c' + pairingUrlNoCallback, 'color: #3B82F6; font-size: 14px; background: #0F172A; padding: 5px;');
      
      // Use InAppBrowser for both iOS and Android (Garmin blocks WebView)
      console.log('=== INAPPBROWSER AVAILABILITY CHECK ===');
      console.log('InAppBrowser module loaded:', !!InAppBrowser);
      console.log('Platform:', Platform.OS);
      
      if (InAppBrowser) {
        console.log('InAppBrowser object:', Object.keys(InAppBrowser));
        console.log('has isAvailable method:', typeof InAppBrowser.isAvailable === 'function');
        console.log('has openAuth method:', typeof InAppBrowser.openAuth === 'function');
      }
      
      if (InAppBrowser && typeof InAppBrowser.isAvailable === 'function') {
        try {
          const isAvailable = await InAppBrowser.isAvailable();
          console.log('InAppBrowser.isAvailable() result:', isAvailable);
          
          if (isAvailable) {
            console.log('✅ Using InAppBrowser for Garmin OAuth');
            const result = await InAppBrowser.openAuth(pairingUrlWithCallback, callbackUrl, {
              // Android options
              showTitle: false,
              enableUrlBarHiding: true,
              enableDefaultShare: false,
              showInRecents: true,
              // iOS options
              ephemeralWebSession: false,
            });
            
            console.log('=== INAPPBROWSER RESULT ===');
            console.log('Full result object:', JSON.stringify(result, null, 2));
            console.log('Result type:', result?.type);
            console.log('Result URL:', result?.url);
            console.log('Result keys:', result ? Object.keys(result) : 'null');
            
            // Handle different result types - Android might return 'dismiss' or other types
            const isSuccess = result && (
              result.type === 'success' || 
              (result.url && (result.url.includes('auth-success.html') || result.url.includes('oauth_verifier')))
            );
            
            if (isSuccess && result.url) {
              // Extract oauth_verifier from the callback URL
              const url = result.url;
              console.log('=== CALLBACK URL PROCESSING ===');
              console.log('Callback URL:', url);
              console.log('URL length:', url.length);
              
              // Check if URL contains oauth_verifier
              const hasOAuthVerifier = url.includes('oauth_verifier');
              console.log('URL contains oauth_verifier:', hasOAuthVerifier);
              
              let oauthVerifier = null;
              try {
                const urlObj = new URL(url);
                console.log('URL parsed successfully');
                console.log('URL search params:', urlObj.search);
                console.log('URL hash:', urlObj.hash);
                console.log('Full URL pathname:', urlObj.pathname);
                
                // Try query params first
                oauthVerifier = urlObj.searchParams.get('oauth_verifier');
                console.log('Extracted oauth_verifier (query param):', oauthVerifier ? `${oauthVerifier.substring(0, 20)}...` : 'null');
                
                // If not in query params, try hash fragment
                if (!oauthVerifier && urlObj.hash) {
                  const hashParams = new URLSearchParams(urlObj.hash.substring(1)); // Remove #
                  oauthVerifier = hashParams.get('oauth_verifier');
                  console.log('Extracted oauth_verifier (hash):', oauthVerifier ? `${oauthVerifier.substring(0, 20)}...` : 'null');
                }
              } catch (e) {
                console.warn('URL parsing failed:', e.message);
                // If URL parsing fails, try manual extraction from query string
                const queryMatch = url.match(/[?&]oauth_verifier=([^&]+)/);
                if (queryMatch) {
                  oauthVerifier = decodeURIComponent(queryMatch[1]);
                  console.log('Extracted oauth_verifier (query regex):', oauthVerifier ? `${oauthVerifier.substring(0, 20)}...` : 'null');
                } else {
                  // Try hash fragment
                  const hashMatch = url.match(/#.*oauth_verifier=([^&]+)/);
                  if (hashMatch) {
                    oauthVerifier = decodeURIComponent(hashMatch[1]);
                    console.log('Extracted oauth_verifier (hash regex):', oauthVerifier ? `${oauthVerifier.substring(0, 20)}...` : 'null');
                  } else {
                    console.warn('No oauth_verifier found in URL with regex');
                    // Try URL-encoded patterns
                    const encodedMatch = url.match(/oauth_verifier%3D([^&%]+)/);
                    if (encodedMatch) {
                      oauthVerifier = decodeURIComponent(encodedMatch[1]);
                      console.log('Extracted oauth_verifier (encoded regex):', oauthVerifier ? `${oauthVerifier.substring(0, 20)}...` : 'null');
                    }
                  }
                }
              }
              
              console.log('Final oauth_verifier:', oauthVerifier ? 'Found' : 'NOT FOUND');
              
              if (oauthVerifier) {
                console.log('✅ Calling processOAuthCallback with verifier');
                
                // Close InAppBrowser before processing callback (Android needs this)
                try {
                  if (InAppBrowser && typeof InAppBrowser.closeAuth === 'function') {
                    await InAppBrowser.closeAuth();
                    console.log('✅ InAppBrowser closed successfully');
                  }
                } catch (closeError) {
                  console.warn('Could not close InAppBrowser:', closeError);
                  // Continue anyway - processing is more important
                }
                
                await processOAuthCallback(oauthVerifier);
              } else {
                console.error('❌ Could not extract oauth_verifier from URL');
                console.error('URL was:', url);
                console.error('Trying to check if URL is just the base callback URL...');
                
                // Check if URL is just the base callback URL without params
                if (url === callbackUrl || url === callbackUrl + '/' || url.startsWith(callbackUrl + '#')) {
                  console.warn('⚠️ URL is base callback URL - Garmin may have redirected without query params');
                  console.warn('Checking if verifier might be in the URL in a different format...');
                  
                  // Try one more time with more aggressive extraction
                  const allMatches = url.match(/oauth[_-]?verifier[=:]([^&#\s]+)/gi);
                  if (allMatches && allMatches.length > 0) {
                    console.log('Found potential verifier matches:', allMatches);
                    const lastMatch = allMatches[allMatches.length - 1];
                    const verifierMatch = lastMatch.match(/oauth[_-]?verifier[=:](.+)/i);
                    if (verifierMatch) {
                      oauthVerifier = decodeURIComponent(verifierMatch[1].trim());
                      console.log('✅ Extracted verifier with aggressive matching');
                      
                      // Close InAppBrowser before processing callback
                      try {
                        if (InAppBrowser && typeof InAppBrowser.closeAuth === 'function') {
                          await InAppBrowser.closeAuth();
                          console.log('✅ InAppBrowser closed successfully');
                        }
                      } catch (closeError) {
                        console.warn('Could not close InAppBrowser:', closeError);
                      }
                      
                      await processOAuthCallback(oauthVerifier);
                      return;
                    }
                  }
                  
                  console.warn('This might mean the OAuth flow completed but verifier was lost');
                  Alert.alert(
                    'Authorization Issue',
                    'The authorization page loaded but the verification code was not found. This might mean:\n\n1. The OAuth flow completed but the code was lost\n2. Garmin redirected incorrectly\n\nPlease try pairing again.',
                    [{ text: 'OK' }]
                  );
                } else {
                  console.error('URL does not match expected callback format');
                  console.error('Expected callback URL:', callbackUrl);
                  console.error('Actual URL:', url);
                  
                  // Close InAppBrowser on error
                  try {
                    if (InAppBrowser && typeof InAppBrowser.closeAuth === 'function') {
                      await InAppBrowser.closeAuth();
                      console.log('✅ InAppBrowser closed after error');
                    }
                  } catch (closeError) {
                    console.warn('Could not close InAppBrowser:', closeError);
                  }
                  
                  Alert.alert('Error', 'Could not extract authorization code from callback. Please try again.');
                }
                setWebViewLoading(false);
              }
            } else if (result && result.url) {
              // Result has URL but might not be marked as 'success' - try to extract anyway
              console.log('=== INAPPBROWSER RESULT (has URL but type != success) ===');
              console.log('Result type:', result.type);
              console.log('Result URL:', result.url);
              console.log('Attempting to extract oauth_verifier anyway...');
              
              const url = result.url;
              let oauthVerifier = null;
              
              // Try to extract oauth_verifier even if type isn't 'success'
              try {
                const urlObj = new URL(url);
                oauthVerifier = urlObj.searchParams.get('oauth_verifier');
                if (!oauthVerifier && urlObj.hash) {
                  const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                  oauthVerifier = hashParams.get('oauth_verifier');
                }
              } catch (e) {
                const match = url.match(/[?&#]oauth_verifier=([^&]+)/);
                if (match) {
                  oauthVerifier = decodeURIComponent(match[1]);
                }
              }
              
              if (oauthVerifier) {
                console.log('✅ Found oauth_verifier despite result type');
                
                // Close InAppBrowser before processing callback
                try {
                  if (InAppBrowser && typeof InAppBrowser.closeAuth === 'function') {
                    await InAppBrowser.closeAuth();
                    console.log('✅ InAppBrowser closed successfully');
                  }
                } catch (closeError) {
                  console.warn('Could not close InAppBrowser:', closeError);
                }
                
                await processOAuthCallback(oauthVerifier);
              } else {
                console.warn('Could not extract oauth_verifier from URL');
                console.warn('URL:', url);
                
                // Close InAppBrowser on error
                try {
                  if (InAppBrowser && typeof InAppBrowser.closeAuth === 'function') {
                    await InAppBrowser.closeAuth();
                    console.log('✅ InAppBrowser closed after error');
                  }
                } catch (closeError) {
                  console.warn('Could not close InAppBrowser:', closeError);
                }
                
                Alert.alert('Error', 'Could not extract authorization code. Please try again.');
                setWebViewLoading(false);
              }
            } else {
              // User cancelled or error
              console.log('=== INAPPBROWSER RESULT (no URL) ===');
              console.log('Result:', result);
              console.log('Result type:', result?.type);
              if (result && result.type === 'cancel') {
                console.log('User cancelled Garmin pairing');
              } else if (result && result.type === 'dismiss') {
                console.log('InAppBrowser was dismissed');
                console.log('This might mean the user closed it or the callback completed');
                // On Android, dismiss might still mean success - check if we can get the URL another way
              } else {
                console.warn('Unexpected result type or missing URL');
                console.warn('Full result:', JSON.stringify(result, null, 2));
              }
              setWebViewLoading(false);
            }
            return;
          } else {
            console.warn('❌ InAppBrowser.isAvailable() returned false');
            if (Platform.OS === 'ios') {
              console.warn('Falling back to WebView (iOS only)...');
            } else {
              console.warn('Android requires InAppBrowser - pairing will fail');
            }
          }
        } catch (error) {
          console.error('❌ InAppBrowser error:', error);
          console.error('Error type:', error.constructor.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          if (Platform.OS === 'ios') {
            console.error('Falling back to WebView (iOS only)...');
          } else {
            console.error('Android requires InAppBrowser - pairing will fail');
          }
        }
      } else {
        console.warn('❌ InAppBrowser module not available or missing methods');
        if (!InAppBrowser) {
          console.warn('InAppBrowser module is null/undefined');
          console.warn('💡 Solution: Create a development build (npx expo prebuild + npx expo run:ios/android)');
          console.warn('   InAppBrowser does NOT work in Expo Go - it requires native code');
        } else if (typeof InAppBrowser.isAvailable !== 'function') {
          console.warn('InAppBrowser.isAvailable is not a function');
          console.warn('Available methods:', Object.keys(InAppBrowser));
        }
      }
      console.log('=== END INAPPBROWSER AVAILABILITY CHECK ===');
      
      // Fallback to WebView ONLY on iOS if InAppBrowser is not available
      if (Platform.OS === 'ios') {
        console.log('🌐 Using WebView fallback (iOS only) with custom user agent');
        console.log('WebView URL (no callback):', pairingUrlNoCallback);
        setGarminUrl(pairingUrlNoCallback);
        setShowGarminModal(true);
      } else {
        // Android requires InAppBrowser - show error if not available
        console.error('❌ Android requires InAppBrowser for Garmin pairing');
        Alert.alert(
          'Pairing Not Available',
          'Garmin pairing requires InAppBrowser which is not available. Please create a development build:\n\n1. Run: npx expo prebuild\n2. Run: npx expo run:android\n\nInAppBrowser does not work in Expo Go.',
          [{ text: 'OK' }]
        );
        setWebViewLoading(false);
      }
    } catch (error) {
      console.error('=== ERROR STARTING GARMIN PAIRING ===');
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Check if it's a network error
      if (error.message && (error.message.includes('Network') || error.message.includes('fetch'))) {
        console.error('This appears to be a network error.');
        console.error('Please check your internet connection.');
      }
      
      // Check if it's related to the request token
      if (error.message && error.message.includes('request token')) {
        console.error('Error occurred during request token fetch.');
        console.error('This might be a server-side issue with the API.');
      }
      
      console.error('=== END GARMIN PAIRING ERROR ===');
      Alert.alert('Error', 'Failed to start Garmin pairing. Please try again.');
      setWebViewLoading(false);
    }
  };

  const handleWebViewNavigation = async (navState) => {
    console.log('=== handleWebViewNavigation called ===');
    console.log('navState:', navState);
    
    if (!navState || !navState.url) {
      console.log('Early return: no navState or url');
      return;
    }
    
    const { url } = navState;
    console.log('URL:', url);
    console.log('isProcessingCallback:', isProcessingCallback);
    console.log('URL includes oauth_verifier:', url && url.includes('oauth_verifier='));
    
    // Check if this is the callback URL with oauth_verifier and we haven't processed it yet
    if (url && url.includes('oauth_verifier=') && !isProcessingCallback) {
      console.log('Processing callback...');
      setIsProcessingCallback(true);
      
      try {
        // Extract oauth_verifier from URL
        let oauthVerifier = null;
        
        if (url.startsWith('about:blank')) {
          console.log('URL starts with about:blank');
          // Parse query string from about:blank?oauth_verifier=...
          const queryString = url.split('?')[1];
          console.log('Query string:', queryString);
          if (queryString) {
            const params = new URLSearchParams(queryString);
            oauthVerifier = params.get('oauth_verifier');
            console.log('Extracted oauth_verifier from about:blank:', oauthVerifier);
          }
        } else {
          console.log('URL does not start with about:blank, extracting from regular URL');
          // Extract from regular URL
          try {
            const urlObj = new URL(url);
            oauthVerifier = urlObj.searchParams.get('oauth_verifier');
            console.log('Extracted oauth_verifier from URL object:', oauthVerifier);
          } catch (e) {
            console.log('URL parsing failed, trying manual extraction. Error:', e);
            // If URL parsing fails, try manual extraction
            const match = url.match(/oauth_verifier=([^&]+)/);
            if (match) {
              oauthVerifier = decodeURIComponent(match[1]);
              console.log('Extracted oauth_verifier manually:', oauthVerifier);
            }
          }
          
          // If we got the verifier from a non-about:blank URL, process it directly
          if (oauthVerifier) {
            console.log('Processing oauth_verifier from callback URL');
            console.log('Calling processOAuthCallback...');
            processOAuthCallback(oauthVerifier).catch(err => {
              console.error('Error in processOAuthCallback:', err);
              console.error('Error stack:', err.stack);
              setIsProcessingCallback(false);
            });
            return;
          }
        }
        
        // If we have the verifier, process it
        if (oauthVerifier && (url.includes('auth-success.html') || url.startsWith('about:blank'))) {
          console.log('Processing oauth_verifier from callback URL');
          await processOAuthCallback(oauthVerifier);
        } else if (!oauthVerifier) {
          console.error('Could not extract oauth_verifier from URL:', url);
          Alert.alert('Error', 'Invalid callback. Please try again.');
          setShowGarminModal(false);
          setIsProcessingCallback(false);
        }
      } catch (error) {
        console.error('Error processing callback:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        Alert.alert('Error', 'Failed to process callback. Please try again.');
        setShowGarminModal(false);
        setIsProcessingCallback(false);
      }
    } else {
      console.log('Skipping callback processing - conditions not met');
    }
  };

  const processOAuthCallback = async (oauthVerifier) => {
    console.log('=== processOAuthCallback called ===');
    console.log('oauthVerifier:', oauthVerifier);
    
    try {
      if (!oauthVerifier) {
        console.error('No oauth_verifier provided');
        Alert.alert('Error', 'Invalid callback. Please try again.');
        setShowGarminModal(false);
        setIsProcessingCallback(false);
        return;
      }

      // Validate we have the required tokens
      // Try to get from AsyncStorage first (survives app backgrounding), then fallback to state
      console.log('Checking oauth tokens...');
      let finalOauthToken = oauthToken;
      let finalOauthTokenSecret = oauthTokenSecret;
      
      // Retrieve from AsyncStorage if state is empty (app may have been backgrounded)
      if (!finalOauthToken || !finalOauthTokenSecret) {
        console.log('OAuth tokens missing from state, checking AsyncStorage...');
        try {
          const storedToken = await AsyncStorage.getItem('garmin_oauth_token');
          const storedTokenSecret = await AsyncStorage.getItem('garmin_oauth_token_secret');
          
          if (storedToken && storedTokenSecret) {
            console.log('✅ Found OAuth tokens in AsyncStorage');
            finalOauthToken = storedToken;
            finalOauthTokenSecret = storedTokenSecret;
            // Update state for consistency
            setOauthToken(storedToken);
            setOauthTokenSecret(storedTokenSecret);
          } else {
            console.log('⚠️ OAuth tokens not found in AsyncStorage either');
          }
        } catch (storageError) {
          console.error('Error retrieving OAuth tokens from AsyncStorage:', storageError);
        }
      } else {
        console.log('✅ OAuth tokens found in state');
      }
      
      console.log('finalOauthToken exists:', !!finalOauthToken);
      console.log('finalOauthTokenSecret exists:', !!finalOauthTokenSecret);
      
      if (!finalOauthToken || !finalOauthTokenSecret) {
        console.error('Missing oauth tokens:', { 
          stateToken: !!oauthToken, 
          stateSecret: !!oauthTokenSecret,
          finalToken: !!finalOauthToken,
          finalSecret: !!finalOauthTokenSecret
        });
        Alert.alert('Error', 'Session expired. Please try pairing again.');
        setShowGarminModal(false);
        setIsProcessingCallback(false);
        return;
      }

      // Step 3: Get access token
      console.log('Getting apiKey from AsyncStorage...');
      let apiKey = null;
      try {
        apiKey = await AsyncStorage.getItem('apiKey');
        console.log('apiKey retrieved successfully');
        console.log('apiKey exists:', !!apiKey);
        console.log('apiKey length:', apiKey ? apiKey.length : 0);
      } catch (storageError) {
        console.error('Error getting apiKey from AsyncStorage:', storageError);
        console.error('Storage error stack:', storageError.stack);
        Alert.alert('Error', 'Failed to retrieve session data. Please try again.');
        setShowGarminModal(false);
        setIsProcessingCallback(false);
        return;
      }
      
      if (!apiKey) {
        console.error('No apiKey found in AsyncStorage');
        Alert.alert('Error', 'Session expired. Please log in again.');
        setShowGarminModal(false);
        setIsProcessingCallback(false);
        return;
      }

      console.log('Building access token URL...');
      const accessTokenUrl = `https://gooseapi.ddns.net/api/access-token?apiKey=${encodeURIComponent(apiKey)}&oauth_token=${encodeURIComponent(finalOauthToken)}&token_secret=${encodeURIComponent(finalOauthTokenSecret)}&oauth_verifier=${encodeURIComponent(oauthVerifier)}`;

      console.log('Making access token request...');
      console.log('Access token URL:', accessTokenUrl);

      let accessTokenResponse = null;
      try {
        accessTokenResponse = await fetch(accessTokenUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Access token response received');
        console.log('Response status:', accessTokenResponse.status);
        console.log('Response ok:', accessTokenResponse.ok);
      } catch (fetchError) {
        console.error('Error making fetch request:', fetchError);
        console.error('Fetch error stack:', fetchError.stack);
        Alert.alert('Error', 'Failed to connect to server. Please check your connection and try again.');
        setShowGarminModal(false);
        setIsProcessingCallback(false);
        return;
      }

      if (accessTokenResponse.status === 200) {
        console.log('Access token request successful!');
        // Success! Save connection status and show success animation
        try {
          console.log('Saving garminConnected to AsyncStorage...');
          await AsyncStorage.setItem('garminConnected', 'true');
          console.log('AsyncStorage save successful');
          
          // Clean up OAuth tokens from AsyncStorage after successful pairing
          try {
            await AsyncStorage.removeItem('garmin_oauth_token');
            await AsyncStorage.removeItem('garmin_oauth_token_secret');
            console.log('✅ Cleaned up OAuth tokens from AsyncStorage');
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup OAuth tokens:', cleanupError);
          }
        } catch (storageError) {
          console.error('Error saving to AsyncStorage:', storageError);
          // Continue anyway as the pairing was successful
        }
        
        try {
          console.log('Updating state...');
          setGarminConnected(true);
          console.log('Closing modal...');
          setShowGarminModal(false);
          console.log('Showing success animation...');
          showSuccessAnimation();
          console.log('Success flow completed');
        } catch (stateError) {
          console.error('Error updating state:', stateError);
          console.error('State error stack:', stateError.stack);
          // Still show success even if state update fails
          Alert.alert('Success', 'Garmin pairing completed successfully!');
          setShowGarminModal(false);
        }
      } else {
        // Log detailed error information for debugging
        console.error('=== GARMIN ACCESS TOKEN ERROR ===');
        console.error('Status:', accessTokenResponse.status);
        console.error('Status Text:', accessTokenResponse.statusText);
        console.error('URL:', accessTokenResponse.url);
        console.error('Response OK:', accessTokenResponse.ok);
        
        let errorText = '';
        try {
          errorText = await accessTokenResponse.text();
          console.error('Error Response Body:', errorText);
          
          // Try to parse as JSON if possible
          try {
            const errorJson = JSON.parse(errorText);
            console.error('Error Response JSON:', JSON.stringify(errorJson, null, 2));
          } catch (e) {
            // Not JSON, that's fine
          }
        } catch (textError) {
          console.error('Error reading error response:', textError);
        }
        
        // Log headers if available
        if (accessTokenResponse.headers) {
          console.error('Response Headers:', Object.fromEntries(accessTokenResponse.headers.entries()));
        }
        
        // Log request details
        console.error('Request URL:', accessTokenUrl);
        console.error('OAuth Token:', finalOauthToken ? `${finalOauthToken.substring(0, 20)}...` : 'missing');
        console.error('OAuth Token Secret:', finalOauthTokenSecret ? `${finalOauthTokenSecret.substring(0, 20)}...` : 'missing');
        console.error('OAuth Verifier:', oauthVerifier ? `${oauthVerifier.substring(0, 20)}...` : 'missing');
        
        // Special handling for 500 errors
        if (accessTokenResponse.status === 500) {
          console.error('=== 500 INTERNAL SERVER ERROR FROM GARMIN ===');
          console.error('This is a server-side error. Possible causes:');
          console.error('- Garmin API is experiencing issues');
          console.error('- Invalid OAuth tokens or verifier');
          console.error('- Server configuration problem');
          console.error('- Rate limiting or quota exceeded');
        }
        
        console.error('=== END ACCESS TOKEN ERROR ===');
        
        // Clean up OAuth tokens on error
        try {
          await AsyncStorage.removeItem('garmin_oauth_token');
          await AsyncStorage.removeItem('garmin_oauth_token_secret');
          console.log('✅ Cleaned up OAuth tokens after error');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup OAuth tokens:', cleanupError);
        }
        
        Alert.alert('Error', `Failed to complete pairing (Status: ${accessTokenResponse.status}). Please try again.`);
        setShowGarminModal(false);
      }
    } catch (error) {
      console.error('=== Error in processOAuthCallback ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Clean up OAuth tokens on exception
      try {
        await AsyncStorage.removeItem('garmin_oauth_token');
        await AsyncStorage.removeItem('garmin_oauth_token_secret');
        console.log('✅ Cleaned up OAuth tokens after exception');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup OAuth tokens:', cleanupError);
      }
      
      Alert.alert('Error', 'Failed to complete pairing. Please try again.');
      setShowGarminModal(false);
    } finally {
      console.log('Setting isProcessingCallback to false');
      setIsProcessingCallback(false);
      console.log('=== processOAuthCallback finished ===');
    }
  };
  
  // Store processOAuthCallback in ref for deep link handler
  useEffect(() => {
    processOAuthCallbackRef.current = processOAuthCallback;
  }, [processOAuthCallback]);
  

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

    // Auto-close after 2 seconds
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
      });
    }, 2000);
  };

  return (
    <BaseScreen showTopBar title="Settings" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
      >
        <View style={styles.settingsProfileSection}>
          <ProfilePic userName={userName} size={100} />
          {userName && (
            <Text style={styles.settingsUserName}>@{userName}</Text>
          )}
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Change Profile Picture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Change Password</Text>
          </TouchableOpacity>
          {userRole === 'coach' && (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('CoachId')}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsButtonText}>Show Coach ID</Text>
            </TouchableOpacity>
          )}
          {userRole === 'athlete' && (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('CoachIdInput')}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsButtonText}>Connect to Coach via Coach ID</Text>
            </TouchableOpacity>
          )}
          {userRole === 'athlete' && !garminConnected && (
            <TouchableOpacity 
              style={[styles.settingsButton, styles.garminButton]}
              onPress={handlePairWithGarmin}
              activeOpacity={0.8}
            >
              <Image 
                source={require('../assets/app_images/garmin_connect_logo.png')}
                style={styles.garminLogo}
                resizeMode="contain"
              />
              <Text style={styles.settingsButtonText}>Pair with Garmin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.settingsButton, styles.logoutButtonSettings]} onPress={onLogout}>
            <Text style={styles.settingsButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Garmin Pairing Modal - iOS only (Android uses InAppBrowser) */}
      <Modal
        visible={showGarminModal && Platform.OS === 'ios'}
        animationType="slide"
        onRequestClose={() => setShowGarminModal(false)}
      >
        <View style={garminModalStyles.container}>
          <View style={garminModalStyles.header}>
            <TouchableOpacity
              style={garminModalStyles.closeButton}
              onPress={() => setShowGarminModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={garminModalStyles.headerTitle}>Pair with Garmin</Text>
            <View style={{ width: 40 }} />
          </View>
          
          {webViewLoading && (
            <View style={garminModalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          
          <WebView
            source={{ uri: garminUrl }}
            style={garminModalStyles.webview}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onNavigationStateChange={handleWebViewNavigation}
            // Set real browser user agent for both platforms (Garmin blocks default WebView user agents)
            userAgent={
              Platform.OS === 'ios'
                ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
                : 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
            }
            // Android-specific props for OAuth flow
            {...(Platform.OS === 'android' && {
              javaScriptEnabled: true,
              domStorageEnabled: true,
              thirdPartyCookiesEnabled: true,
              sharedCookiesEnabled: true,
              startInLoadingState: true,
              mixedContentMode: 'always',
            })}
            // iOS-specific props
            {...(Platform.OS === 'ios' && {
              javaScriptEnabled: true,
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            })}
            injectedJavaScript={`
              (function() {
                // Monitor for authorization completion
                function checkForCompletion() {
                  const url = window.location.href;
                  console.log('Current URL:', url);
                  
                  // Check if we're on the callback URL
                  if (url.includes('auth-success.html') || url.includes('oauth_verifier=')) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'OAUTH_CALLBACK',
                      url: url
                    }));
                    return;
                  }
                  
                  // Check if permissions are updated (authorization complete)
                  if (url.includes('permissionsUpdated=true') || url.includes('selectedCapabilities=')) {
                    // Try to find and click the continue/authorize button
                    const buttons = document.querySelectorAll('button, a, input[type="submit"]');
                    for (let btn of buttons) {
                      const text = btn.textContent || btn.value || '';
                      if (text.toLowerCase().includes('continue') || 
                          text.toLowerCase().includes('authorize') ||
                          text.toLowerCase().includes('allow') ||
                          btn.className.includes('continue') ||
                          btn.className.includes('authorize')) {
                        console.log('Found button, clicking:', text);
                        btn.click();
                        setTimeout(() => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'BUTTON_CLICKED',
                            url: window.location.href
                          }));
                        }, 1000);
                        return;
                      }
                    }
                    
                    // If no button found, check URL params for callback
                    const params = new URLSearchParams(window.location.search);
                    const callback = params.get('oauth_callback');
                    if (callback) {
                      console.log('Found callback URL, redirecting:', callback);
                      window.location.href = callback + '?oauth_verifier=' + (params.get('oauth_verifier') || '');
                    }
                  }
                  
                  // Monitor for any redirects
                  const observer = new MutationObserver(() => {
                    if (window.location.href !== url) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'URL_CHANGED',
                        url: window.location.href
                      }));
                    }
                  });
                  
                  observer.observe(document.body, { childList: true, subtree: true });
                }
                
                // Run immediately and on load
                checkForCompletion();
                window.addEventListener('load', checkForCompletion);
                
                // Also monitor URL changes
                let lastUrl = window.location.href;
                setInterval(() => {
                  if (window.location.href !== lastUrl) {
                    lastUrl = window.location.href;
                    checkForCompletion();
                  }
                }, 500);
              })();
              true; // Required for injected JavaScript
            `}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                console.log('WebView message:', data);
                
                if (data.type === 'OAUTH_CALLBACK' || data.type === 'URL_CHANGED') {
                  // Manually trigger navigation handler
                  handleWebViewNavigation({ url: data.url });
                }
              } catch (e) {
                console.log('Error parsing WebView message:', e);
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (!request || !request.url) return true;
              
              const { url } = request;
              
              // If we're processing callback, only allow auth-success page or about:blank
              if (isProcessingCallback && !url.includes('auth-success.html') && !url.startsWith('about:blank')) {
                return false;
              }
              
              // Allow all navigation (we'll handle redirect in onNavigationStateChange)
              return true;
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              // Don't show error for about:blank as it's expected
              if (!nativeEvent.url || !nativeEvent.url.startsWith('about:blank')) {
                console.error('WebView error: ', nativeEvent);
                Alert.alert('Error', 'Failed to load page. Please try again.');
                setWebViewLoading(false);
              }
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('=== GARMIN WEBVIEW HTTP ERROR ===');
              console.error('Status Code:', nativeEvent.statusCode);
              console.error('URL:', nativeEvent.url);
              console.error('Description:', nativeEvent.description);
              console.error('Title:', nativeEvent.title);
              console.error('Full Error Object:', JSON.stringify(nativeEvent, null, 2));
              
              // Special handling for 500 errors
              if (nativeEvent.statusCode === 500) {
                console.error('=== 500 INTERNAL SERVER ERROR FROM GARMIN (WebView) ===');
                console.error('This is a server-side error from Garmin Connect.');
                console.error('The error occurred while loading:', nativeEvent.url);
                console.error('Possible causes:');
                console.error('- Garmin Connect is experiencing issues');
                console.error('- Invalid OAuth request');
                console.error('- Server configuration problem');
                console.error('- Rate limiting or quota exceeded');
              }
              
              console.error('=== END WEBVIEW HTTP ERROR ===');
              
              if (nativeEvent.statusCode >= 400) {
                setWebViewLoading(false);
              }
            }}
          />
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={garminModalStyles.successOverlay}>
          <Animated.View
            style={[
              garminModalStyles.successContainer,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={garminModalStyles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={garminModalStyles.successTitle}>Pairing Successful!</Text>
            <Text style={garminModalStyles.successText}>
              Your Garmin account has been connected.
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </BaseScreen>
  );
}

const garminModalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    zIndex: 1,
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
    marginBottom: 10,
  },
  successText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
});
