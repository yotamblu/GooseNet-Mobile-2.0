import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../utils/styles';
import GridOverlay from '../components/GridOverlay';

const HomeScreen = ({ onLogout }) => {
  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#3B82F6']}
      style={styles.container}
    >
      <GridOverlay />
      <View style={styles.content}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Welcome to GooseNet</Text>
        
        <TouchableOpacity
          style={[styles.logoutButton, { position: 'relative', top: 'auto', right: 'auto', marginTop: 40 }]}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </LinearGradient>
  );
};

export default HomeScreen;
