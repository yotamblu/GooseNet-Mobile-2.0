import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from './screens/LoadingScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import FollowersListScreen from './screens/FollowersListScreen';
import FollowingListScreen from './screens/FollowingListScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Profile Stack Navigator (for nested screens)
function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FollowersList" 
        component={FollowersListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FollowingList" 
        component={FollowingListScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Home Screen Wrapper to pass onLogout
function HomeScreenWrapper({ route, ...props }) {
  const onLogout = route?.params?.onLogout;
  return <HomeScreen {...props} onLogout={onLogout} />;
}


export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading'); // 'loading', 'login', 'home'
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      setIsLoggedIn(userName !== null);
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    }
  };

  const handleStartPress = () => {
    setCurrentScreen('login');
  };

  const handleLoginSuccess = async () => {
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  const handleRedirectToHome = async () => {
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('apiKey');
      await AsyncStorage.removeItem('role');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
    setIsLoggedIn(false);
    setCurrentScreen('loading');
  };

  // Function to manually clear all storage (for dev/testing)
  const clearAllStorage = async () => {
    try {
      await AsyncStorage.clear();
      setIsLoggedIn(false);
      setCurrentScreen('loading');
      Alert.alert('Success', 'All storage cleared. You are now logged out.');
    } catch (error) {
      console.error('Error clearing storage:', error);
      Alert.alert('Error', 'Failed to clear storage.');
    }
  };

  // Expose clearAllStorage globally for console access
  useEffect(() => {
    if (__DEV__) {
      global.clearStorage = clearAllStorage;
      global.logout = handleLogout;
      console.log('Dev helpers available:');
      console.log('  - global.logout() - Logout current user');
      console.log('  - global.clearStorage() - Clear all AsyncStorage');
    }
  }, []);

  // Always start with loading screen
  if (currentScreen === 'loading') {
    return (
      <LoadingScreen
        isLoggedIn={isLoggedIn}
        onStartPress={handleStartPress}
        onRedirectToHome={handleRedirectToHome}
      />
    );
  }

  if (currentScreen === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentScreen === 'home') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#0B1F4A',
                borderTopColor: '#2A5FBF',
                borderTopWidth: 1,
              },
              tabBarActiveTintColor: '#3A86FF',
              tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: 'bold',
              },
            }}
          >
            <Tab.Screen 
              name="Home"
              options={{ 
                tabBarLabel: 'Home',
                headerShown: false,
              }}
            >
              {props => <HomeScreenWrapper {...props} route={{ ...props.route, params: { ...props.route.params, onLogout: handleLogout } }} />}
            </Tab.Screen>
            <Tab.Screen 
              name="Profile" 
              component={ProfileStack}
              options={{ 
                tabBarLabel: 'Profile',
                headerShown: false,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    );
  }

  return null;
}
