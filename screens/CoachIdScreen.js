import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';

export default function CoachIdScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [coachId, setCoachId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCoachId = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userName = await AsyncStorage.getItem('userName');
      
      if (!userName) {
        setError('No user name found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://gooseapi.ddns.net/api/coachConnection/getCoachId?coachName=${encodeURIComponent(userName)}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

      if (response.status === 200) {
        const data = await response.json();
        setCoachId(data.coachId || null);
      } else {
        setError('Failed to fetch coach ID. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching coach ID:', err);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoachId();
  }, [fetchCoachId]);

  const handleCopy = async () => {
    if (coachId) {
      try {
        await Clipboard.setStringAsync(coachId);
        Alert.alert('Copied!', 'Coach ID has been copied to clipboard.');
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        Alert.alert('Error', 'Failed to copy to clipboard.');
      }
    }
  };

  const onRefresh = useCallback(async () => {
    await fetchCoachId();
  }, [fetchCoachId]);

  return (
    <BaseScreen showTopBar title="Coach ID" onRefresh={onRefresh}>
      <View style={[coachIdStyles.container, { paddingTop: insets.top + 90 }]}>
        <TouchableOpacity 
          style={[coachIdStyles.backButton, { top: insets.top + 50 }]} 
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={coachIdStyles.logoContainer}>
          <Image
            source={require('../assets/app_images/goose-logo-no-bg.png')}
            style={coachIdStyles.logo}
            resizeMode="contain"
          />
        </View>
        {loading ? (
          <View style={coachIdStyles.centerContent}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={coachIdStyles.loadingText}>Loading Coach ID...</Text>
          </View>
        ) : error ? (
          <View style={coachIdStyles.centerContent}>
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text style={coachIdStyles.errorText}>{error}</Text>
            <TouchableOpacity
              style={coachIdStyles.retryButton}
              onPress={fetchCoachId}
              activeOpacity={0.8}
            >
              <Text style={coachIdStyles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : coachId ? (
          <View style={coachIdStyles.content}>
            <Text style={coachIdStyles.title}>Coach ID</Text>
            <Text style={coachIdStyles.label}>Your Coach ID</Text>
            <View style={coachIdStyles.idContainer}>
              <Text style={coachIdStyles.idText}>{coachId}</Text>
            </View>
            <TouchableOpacity
              style={coachIdStyles.copyButton}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={24} color="#FFFFFF" />
              <Text style={coachIdStyles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
            <Text style={coachIdStyles.description}>
              Share this ID with athletes so they can connect with you.
            </Text>
          </View>
        ) : (
          <View style={coachIdStyles.centerContent}>
            <Text style={coachIdStyles.errorText}>No Coach ID found.</Text>
          </View>
        )}
      </View>
    </BaseScreen>
  );
}

const coachIdStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    opacity: 0.8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    opacity: 0.9,
  },
  idContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    minWidth: '85%',
    maxWidth: 400,
  },
  idText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
    minWidth: '85%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 1000,
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

