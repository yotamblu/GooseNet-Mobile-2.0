import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfilePic from './ProfilePic';

export default function TopBar({ title, onRefresh }) {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUserName = async () => {
      const name = await AsyncStorage.getItem('userName');
      setUserName(name || '');
    };
    loadUserName();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.leftIcons}>
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconButton, { marginLeft: 10 }]}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      
      <View style={styles.rightIcons}>
        {onRefresh && (
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.profileButton, onRefresh && { marginLeft: 10 }]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <ProfilePic userName={userName} size={36} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 90 : 90,
    paddingTop: Platform.OS === 'android' ? 45 : 45,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 31, 74, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 95, 191, 0.3)',
    zIndex: 100,
    elevation: Platform.OS === 'android' ? 10 : 0,
  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(58, 134, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 15,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
