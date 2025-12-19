import React from 'react';
import { View } from 'react-native'; 
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import GridOverlay from './GridOverlay';
import TopBar from './TopBar';

export default function BaseScreen({ children, showTopBar = false, title = '', onRefresh }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#3B82F6']}
        style={{ flex: 1 }}
      >
        {showTopBar && <TopBar title={title} onRefresh={onRefresh} />}

        <View style={{ flex: 1 }}>
          {children}
        </View>

        <GridOverlay />
        <StatusBar style="light" />
      </LinearGradient>
    </View>
  );
}
