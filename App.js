import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Alert, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// FORCE JS SCREENS (critical)
import { enableScreens } from 'react-native-screens';
enableScreens(false);

// Screens
import LoadingScreen from './screens/LoadingScreen';
import LoginScreen from './screens/LoginScreen';
import HomeFeedScreen from './screens/HomeFeedScreen';
import SearchScreen from './screens/SearchScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import PlannedWorkoutsScreen from './screens/PlannedWorkoutsScreen';
import SleepDataScreen from './screens/SleepDataScreen';
import MyAthletesScreen from './screens/MyAthletesScreen';
import FlockScreen from './screens/FlockScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import FollowersListModal from './screens/FollowersListModal';
import FollowingListModal from './screens/FollowingListModal';
import AthleteProfileModal from './screens/AthleteProfileModal';

// Contexts
import { ModalContext } from './contexts/ModalContext';
import { RefreshContext } from './contexts/RefreshContext';

const Tab = createBottomTabNavigator();

/* ================= TAB ICON ================= */
function TabIcon({ name, color }) {
  return <Ionicons name={name} size={24} color={color} />;
}

/* ================= SETTINGS WRAPPER ================= */
function SettingsWrapper({ onLogout }) {
  return function SettingsTab() {
    return <SettingsScreen onLogout={onLogout} />;
  };
}

/* ================= MAIN TABS ================= */
function MainTabs({ onLogout, role }) {
  const isAthlete = role === 'athlete';
  const isCoach = role === 'coach';
  const SettingsTab = SettingsWrapper({ onLogout });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#2A5FBF',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeFeedScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />

      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarItemStyle: { display: 'none' } }} />

      <Tab.Screen
        name="Planned"
        component={PlannedWorkoutsScreen}
        options={{
          tabBarItemStyle: isAthlete ? {} : { display: 'none' },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Sleep"
        component={SleepDataScreen}
        options={{
          tabBarItemStyle: isAthlete ? {} : { display: 'none' },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'moon' : 'moon-outline'} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Athletes"
        component={MyAthletesScreen}
        options={{
          tabBarItemStyle: isCoach ? {} : { display: 'none' },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Flock"
        component={FlockScreen}
        options={{
          tabBarItemStyle: isCoach ? {} : { display: 'none' },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'layers' : 'layers-outline'} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/* ================= APP ROOT ================= */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [userRole, setUserRole] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger(v => v + 1), []);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      const role = await AsyncStorage.getItem('role');
      setUserRole(role === 'athlete' || role === 'coach' ? role : null);
      setCurrentScreen(userName ? 'home' : 'login');
    } catch {
      setCurrentScreen('login');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['userName', 'apiKey', 'role']);
    setUserRole(null);
    setCurrentScreen('login');
  };

  const openModal = (type, data = null) => {
    setModalType(type);
    setModalData(data);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
    setModalData(null);
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'followers':
        return <FollowersListModal onClose={closeModal} />;
      case 'following':
        return <FollowingListModal onClose={closeModal} />;
      case 'athlete':
        return (
          <AthleteProfileModal
            athleteName={modalData?.athleteName}
            athleteUserName={modalData?.athleteUserName}
            onClose={closeModal}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <RefreshContext.Provider value={{ refreshTrigger, triggerRefresh }}>
        <ModalContext.Provider value={{ openModal, closeModal }}>

          {currentScreen === 'loading' && <LoadingScreen />}
          {currentScreen === 'login' && <LoginScreen onLoginSuccess={bootstrap} />}
          {currentScreen === 'home' && (
            <NavigationContainer>
              <MainTabs onLogout={handleLogout} role={userRole} />
            </NavigationContainer>
          )}

          {modalVisible && (
            <Modal visible animationType="slide" onRequestClose={closeModal}>
              {renderModalContent()}
            </Modal>
          )}

        </ModalContext.Provider>
      </RefreshContext.Provider>
    </SafeAreaProvider>
  );
}
