import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import FlockComponent from '../components/FlockComponent';

export default function FlockScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [flocks, setFlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlockName, setNewFlockName] = useState('');

  const fetchFlocks = async () => {
    try {
      setError(null);
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        setError('No API key found');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://gooseapi.ddns.net/api/flocks/getFlocks?apiKey=${encodeURIComponent(apiKey)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Transform the flocks array (strings) to objects with flockName
      const flocksData = (data.flocks || []).map((flockName, index) => ({
        id: `flock-${index}`,
        flockName: flockName
      }));
      setFlocks(flocksData);
    } catch (err) {
      console.error('Failed to fetch flocks:', err);
      setError('Failed to load flocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlocks();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFlocks();
    setRefreshing(false);
  }, []);

  const handleCreateFlock = () => {
    setShowCreateModal(true);
  };

  const handleCreateFlockSubmit = async () => {
    if (!newFlockName || newFlockName.trim() === '') {
      Alert.alert('Error', 'Flock name cannot be empty');
      return;
    }

    try {
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'No API key found');
        return;
      }

      
      const response = await fetch(
        `https://gooseapi.ddns.net/api/flocks/createFlock?apiKey=${encodeURIComponent(apiKey)}&flockName=${encodeURIComponent(newFlockName.trim())}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      Alert.alert('Success', `Flock "${newFlockName}" created successfully`);
      setShowCreateModal(false);
      setNewFlockName('');
      await fetchFlocks();
    } catch (err) {
      console.error('Failed to create flock:', err);
      Alert.alert('Error', 'Failed to create flock. Please try again.');
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setNewFlockName('');
  };

  return (
    <BaseScreen showTopBar title="Flock" onRefresh={onRefresh}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
        >
          {refreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          {loading && flocks.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, minHeight: 300 }}>
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Loading flocks...</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#F97316' }}>{error}</Text>
            </View>
          ) : flocks.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#FFFFFF' }}>No flocks found</Text>
            </View>
          ) : (
            <View style={styles.flockGrid}>
              {flocks.map(flock => (
                <FlockComponent
                  key={flock.id}
                  flockName={flock.flockName}
                  onAddWorkout={() => Alert.alert('Add Workout', `Add workout to ${flock.flockName}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
        {refreshing && flocks.length > 0 && (
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
        {!loading && !error && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 30,
              right: 20,
              backgroundColor: '#F97316',
              width: 60,
              height: 60,
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 8,
              zIndex: 999,
            }}
            onPress={handleCreateFlock}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        transparent={true}
        animationType="slide"
        visible={showCreateModal}
        onRequestClose={handleCancelCreate}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={modalStyles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableOpacity
            style={modalStyles.modalOverlay}
            activeOpacity={1}
            onPress={handleCancelCreate}
          />
          <View style={modalStyles.modalContent}>
            <View style={modalStyles.modalHeader}>
              <TouchableOpacity onPress={handleCancelCreate}>
                <Text style={modalStyles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={modalStyles.modalTitle}>Create New Flock</Text>
              <TouchableOpacity onPress={handleCreateFlockSubmit}>
                <Text style={[modalStyles.modalButton, modalStyles.modalButtonConfirm]}>Create</Text>
              </TouchableOpacity>
            </View>
            <View style={modalStyles.inputContainer}>
              <Text style={modalStyles.inputLabel}>Flock Name</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="Enter flock name"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={newFlockName}
                onChangeText={setNewFlockName}
                autoCapitalize="words"
                autoFocus
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </BaseScreen>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E3A8A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 10,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalButton: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    color: '#F97316',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
