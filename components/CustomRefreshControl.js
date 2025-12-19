import React from 'react';
import { RefreshControl } from 'react-native';

export default function CustomRefreshControl({ refreshing, onRefresh }) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#2563EB"
      colors={['#2563EB']}
      progressBackgroundColor="#0F172A"
    />
  );
}

