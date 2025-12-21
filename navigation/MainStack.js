import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import FollowersListScreen from '../screens/FollowersListScreen';
import FollowingListScreen from '../screens/FollowingListScreen';
import AthleteProfileScreen from '../screens/AthleteProfileScreen';
import CoachIdScreen from '../screens/CoachIdScreen';

const Stack = createStackNavigator();

const MainStack = ({ role, onLogout }) => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs">
        {props => <MainTabs {...props} role={role} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen 
        name="FollowersList" 
        component={FollowersListScreen}
      />
      <Stack.Screen 
        name="FollowingList" 
        component={FollowingListScreen}
      />
      <Stack.Screen 
        name="AthleteProfile" 
        component={AthleteProfileScreen}
      />
      <Stack.Screen 
        name="CoachId" 
        component={CoachIdScreen}
      />
    </Stack.Navigator>
  );
};

export default MainStack;
