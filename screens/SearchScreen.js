import React, { useState, useCallback } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <BaseScreen>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView 
          style={styles.screenContent}
          contentContainerStyle={styles.screenContentContainer}
        >
        {refreshing && (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Search</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        <Text style={styles.centeredText}>Search functionality coming soon</Text>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}
