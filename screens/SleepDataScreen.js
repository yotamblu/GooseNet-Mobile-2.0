import React, { useState, useCallback } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { styles } from '../utils/styles';
import BaseScreen from '../components/BaseScreen';
import SleepDataComponent from '../components/SleepDataComponent';

export default function SleepDataScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <BaseScreen showTopBar title="Sleep Data" onRefresh={onRefresh}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 90, paddingBottom: 120 }}
      >
          {refreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          <SleepDataComponent />
        </ScrollView>
    </BaseScreen>
  );
}
