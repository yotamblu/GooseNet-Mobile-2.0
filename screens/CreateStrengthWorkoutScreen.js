import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BaseScreen from '../components/BaseScreen';
import DatePickerModal from '../components/DatePickerModal';
import { styles } from '../utils/styles';

export default function CreateStrengthWorkoutScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { targetType, targetName } = route?.params || {};

  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [drills, setDrills] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Format date as MM/DD/YYYY with leading zeros
  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const addDrill = () => {
    const newDrill = {
      id: Date.now(),
      drillName: '',
      drillReps: '',
      drillSets: ''
    };
    setDrills([...drills, newDrill]);
  };

  const removeDrill = (drillId) => {
    setDrills(drills.filter(d => d.id !== drillId));
  };

  const updateDrill = (drillId, field, value) => {
    setDrills(drills.map(drill => 
      drill.id === drillId ? { ...drill, [field]: value } : drill
    ));
  };

  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current || isSubmitting) {
      console.log('=== SUBMISSION BLOCKED: Already submitting ===');
      return;
    }

    // Validate basic fields
    if (!workoutName.trim()) {
      Alert.alert('Validation Error', 'Please enter a workout name');
      return;
    }

    if (drills.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one drill');
      return;
    }

    // Validate drills
    for (let i = 0; i < drills.length; i++) {
      const drill = drills[i];
      if (!drill.drillName.trim()) {
        Alert.alert('Validation Error', `Drill ${i + 1}: Please enter a drill name`);
        return;
      }
      if (!drill.drillReps || drill.drillReps.trim() === '' || parseInt(drill.drillReps) <= 0) {
        Alert.alert('Validation Error', `Drill ${i + 1}: Please enter valid reps`);
        return;
      }
      if (!drill.drillSets || drill.drillSets.trim() === '' || parseInt(drill.drillSets) <= 0) {
        Alert.alert('Validation Error', `Drill ${i + 1}: Please enter valid sets`);
        return;
      }
    }

    // Set submitting state
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Build JSON structure matching C# class
    const workoutJson = {
      workoutName: workoutName.trim(),
      workoutDescription: workoutDescription.trim(),
      workoutDate: formatDate(workoutDate),
      workoutDrills: drills.map(drill => ({
        drillName: drill.drillName.trim(),
        drillReps: parseInt(drill.drillReps),
        drillSets: parseInt(drill.drillSets)
      }))
    };

    // Convert to JSON string
    const jsonBody = JSON.stringify(workoutJson);

    // Log the JSON
    console.log('=== STRENGTH WORKOUT JSON ===');
    console.log('JSON String:', jsonBody);
    console.log('JSON Object:', JSON.stringify(workoutJson, null, 2));
    console.log('===========================');

    // Submit to API
    try {
      // Get API key from AsyncStorage
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'No API key found. Please log in again.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // Determine if it's a flock
      const isFlock = targetType === 'flock';

      // Format date as yyyy-MM-dd for API
      const year = workoutDate.getFullYear();
      const month = String(workoutDate.getMonth() + 1).padStart(2, '0');
      const day = String(workoutDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Build request body
      const requestBody = {
        targetName: targetName || '',
        isFlock: isFlock,
        jsonBody: jsonBody,
        date: formattedDate
      };

      // Log request details
      const apiUrl = `https://gooseapi.ddns.net/api/strength/addWorkout?apiKey=${encodeURIComponent(apiKey)}`;
      console.log('=== API REQUEST ===');
      console.log('URL:', apiUrl);
      console.log('Method: POST');
      console.log('Query Params:');
      console.log('  - apiKey:', apiKey);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Request Body (parsed):');
      console.log('  - targetName:', requestBody.targetName);
      console.log('  - isFlock:', requestBody.isFlock);
      console.log('  - date:', requestBody.date);
      console.log('  - jsonBody:', requestBody.jsonBody);
      console.log('==================');

      // Make API call
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // Log response details
      console.log('=== API RESPONSE ===');
      console.log('Status Code:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('===================');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log('=== ERROR RESPONSE ===');
        console.log('Error Data:', JSON.stringify(errorData, null, 2));
        console.log('=====================');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        Alert.alert('Error', errorData.message || `HTTP error! status: ${response.status}`);
        return;
      }

      // Success
      const result = await response.json();
      console.log('=== SUCCESS RESPONSE ===');
      console.log('Response Data:', JSON.stringify(result, null, 2));
      console.log('========================');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      Alert.alert('Success', 'Strength workout created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to submit workout:', error);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      Alert.alert('Error', `Failed to submit workout: ${error.message}`);
    }
  };

  return (
    <BaseScreen showTopBar>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={[workoutStyles.backButton, { top: insets.top + 85 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          disabled={isSubmitting}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingTop: 90, 
            paddingBottom: 120, 
            paddingHorizontal: 20 
          }}
        >
          <Text style={styles.screenTitle}>Create Strength Workout</Text>

          {/* Workout Name */}
          <View style={workoutStyles.section}>
            <Text style={workoutStyles.label}>Workout Name *</Text>
            <TextInput
              style={workoutStyles.input}
              placeholder="Enter workout name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={workoutName}
              onChangeText={setWorkoutName}
              editable={!isSubmitting}
            />
          </View>

          {/* Workout Description */}
          <View style={workoutStyles.section}>
            <Text style={workoutStyles.label}>Workout Description</Text>
            <TextInput
              style={[workoutStyles.input, workoutStyles.textArea]}
              placeholder="Enter workout description"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={workoutDescription}
              onChangeText={setWorkoutDescription}
              multiline
              numberOfLines={3}
              editable={!isSubmitting}
            />
          </View>

          {/* Workout Date */}
          <View style={workoutStyles.section}>
            <Text style={workoutStyles.label}>Workout Date *</Text>
            <TouchableOpacity
              style={workoutStyles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={isSubmitting}
            >
              <Text style={workoutStyles.dateButtonText}>
                {formatDate(workoutDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <DatePickerModal
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              onDateSelect={(date) => {
                setWorkoutDate(date);
                setShowDatePicker(false);
              }}
              initialDate={workoutDate}
            />
          </View>

          {/* Drills */}
          <View style={workoutStyles.section}>
            <View style={workoutStyles.sectionHeader}>
              <Text style={workoutStyles.label}>Drills *</Text>
              <TouchableOpacity
                style={workoutStyles.addButton}
                onPress={addDrill}
                disabled={isSubmitting}
              >
                <Ionicons name="add-circle" size={20} color="#F97316" />
                <Text style={workoutStyles.addButtonText}>Add Drill</Text>
              </TouchableOpacity>
            </View>

            {drills.map((drill, index) => (
              <View key={drill.id} style={workoutStyles.drillCard}>
                <View style={workoutStyles.drillHeader}>
                  <Text style={workoutStyles.drillTitle}>Drill {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeDrill(drill.id)}
                    style={workoutStyles.removeButton}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={workoutStyles.section}>
                  <Text style={workoutStyles.label}>Drill Name *</Text>
                  <TextInput
                    style={workoutStyles.input}
                    placeholder="Enter drill name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={drill.drillName}
                    onChangeText={(text) => updateDrill(drill.id, 'drillName', text)}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={workoutStyles.section}>
                  <Text style={workoutStyles.label}>Drill Reps *</Text>
                  <TextInput
                    style={workoutStyles.input}
                    placeholder="Enter number of reps"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={drill.drillReps}
                    onChangeText={(text) => updateDrill(drill.id, 'drillReps', text)}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>

                <View style={workoutStyles.section}>
                  <Text style={workoutStyles.label}>Drill Sets *</Text>
                  <TextInput
                    style={workoutStyles.input}
                    placeholder="Enter number of sets"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={drill.drillSets}
                    onChangeText={(text) => updateDrill(drill.id, 'drillSets', text)}
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[workoutStyles.submitButton, isSubmitting && workoutStyles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={workoutStyles.submitButtonText}>Create Workout</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </BaseScreen>
  );
}

const workoutStyles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  addButtonText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  drillCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  drillTitle: {
    color: '#F97316',
    fontSize: 18,
    fontWeight: '700',
  },
  removeButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});

