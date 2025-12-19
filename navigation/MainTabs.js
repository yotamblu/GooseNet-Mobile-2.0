import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FollowersListScreen from '../screens/FollowersListScreen';
import FollowingListScreen from '../screens/FollowingListScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Profile Stack Navigator (for nested screens)
const ProfileStack = () => {
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
};

// Home Screen Wrapper to pass onLogout
const HomeScreenWrapper = ({ onLogout, ...props }) => {
  return <HomeScreen {...props} onLogout={onLogout} />;
};

const MainTabs = ({ onLogout }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#2A5FBF',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#2563EB',
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
        {props => <HomeScreenWrapper {...props} onLogout={onLogout} />}
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
  );
};

export default MainTabs;
