import React, { useState, useCallback, useContext, useEffect } from 'react';
import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import MyAthleteComponent from '../components/MyAthleteComponent';
import { ModalContext } from '../contexts/ModalContext';
import { RefreshContext } from '../contexts/RefreshContext';

export default function MyAthletesScreen() {
  const { openModal } = useContext(ModalContext);
  const { triggerRefresh } = useContext(RefreshContext);
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAthletes = async () => {
    try {
      setError(null);
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://gooseapi.ddns.net/api/athletes?apiKey=${encodeURIComponent(apiKey)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAthletes(data.athletesData || []);
    } catch (err) {
      console.error('Failed to fetch athletes:', err);
      setError('Failed to load athletes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRefresh();
    await fetchAthletes();
    setRefreshing(false);
  }, [triggerRefresh]);

  return (
    <BaseScreen showTopBar title="My Athletes" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
      >
          {refreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          {loading && athletes.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, minHeight: 300 }}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Loading athletes...</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#F97316' }}>{error}</Text>
            </View>
          ) : athletes.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#FFFFFF' }}>No athletes found</Text>
            </View>
          ) : (
            <View style={styles.athletesGrid}>
              {athletes.map((athlete, index) => (
                <MyAthleteComponent
                  key={athlete.athleteName + index}
                  athleteName={athlete.athleteName}
                  imageData={athlete.imageData}
                  onPress={() => openModal('athlete', { 
                    athleteName: athlete.athleteName,
                    athleteUserName: athlete.athleteName 
                  })}
                />
              ))}
            </View>
          )}
        </ScrollView>
        {refreshing && athletes.length > 0 && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Refreshing...</Text>
          </View>
        )}
    </BaseScreen>
  );
}
