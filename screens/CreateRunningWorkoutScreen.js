import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BaseScreen from '../components/BaseScreen';
import DatePickerModal from '../components/DatePickerModal';
import { styles } from '../utils/styles';

export default function CreateRunningWorkoutScreen({ route }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { targetType, targetName } = route?.params || {};

  const [workoutName, setWorkoutName] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [intervals, setIntervals] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const errorScale = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  const addInterval = () => {
    const newInterval = {
      id: Date.now(),
      type: 'WORKOUT_STEP', // or 'REST'
      repeatCount: 1,
      restDurationType: 'SECONDS', // SECONDS or MINUTES (for REST type)
      restTime: 0, // for REST type
      subIntervals: []
    };
    
    // If it's a WORKOUT_STEP, add one sub-interval automatically
    if (newInterval.type === 'WORKOUT_STEP') {
      newInterval.subIntervals = [{
        id: Date.now() + 1,
        type: 'WORKOUT_STEP',
        durationType: 'SECONDS',
        durationValue: 0,
        restDurationType: 'SECONDS',
        restTime: 0,
        paceValue: '',
        paceRange: false,
        paceValueLow: '',
        paceValueHigh: ''
      }];
    }
    
    setIntervals([...intervals, newInterval]);
  };

  const removeInterval = (intervalId) => {
    setIntervals(intervals.filter(i => i.id !== intervalId));
  };

  const updateInterval = (intervalId, field, value) => {
    setIntervals(intervals.map(interval => {
      if (interval.id === intervalId) {
        const updatedInterval = { ...interval, [field]: value };
        // If type is changed to WORKOUT_STEP and has no sub-intervals, add one
        if (field === 'type' && value === 'WORKOUT_STEP' && updatedInterval.subIntervals.length === 0) {
          updatedInterval.subIntervals = [{
            id: Date.now(),
            type: 'WORKOUT_STEP',
            durationType: 'SECONDS',
            durationValue: 0,
            restDurationType: 'SECONDS',
            restTime: 0,
            paceValue: '',
            paceRange: false,
            paceValueLow: '',
            paceValueHigh: ''
          }];
        }
        return updatedInterval;
      }
      return interval;
    }));
  };

  const addSubInterval = (intervalId) => {
    const newSubInterval = {
      id: Date.now(),
      type: 'WORKOUT_STEP', // or 'REST'
      durationType: 'SECONDS', // KILOMETERS, METERS, SECONDS, MINUTES (for WORKOUT_STEP)
      durationValue: 0,
      restDurationType: 'SECONDS', // SECONDS or MINUTES (for REST type)
      restTime: 0, // for REST type
      paceValue: '', // mm:ss format
      paceRange: false,
      paceValueLow: '', // mm:ss format
      paceValueHigh: '' // mm:ss format
    };
    setIntervals(intervals.map(interval => 
      interval.id === intervalId 
        ? { ...interval, subIntervals: [...interval.subIntervals, newSubInterval] }
        : interval
    ));
  };

  const removeSubInterval = (intervalId, subIntervalId) => {
    setIntervals(intervals.map(interval => 
      interval.id === intervalId 
        ? { ...interval, subIntervals: interval.subIntervals.filter(si => si.id !== subIntervalId) }
        : interval
    ));
  };

  const updateSubInterval = (intervalId, subIntervalId, field, value) => {
    setIntervals(intervals.map(interval => 
      interval.id === intervalId 
        ? { 
            ...interval, 
            subIntervals: interval.subIntervals.map(si => 
              si.id === subIntervalId ? { ...si, [field]: value } : si
            )
          }
        : interval
    ));
  };

  // Convert mm:ss format to decimal minutes
  const parsePace = (paceString) => {
    if (!paceString || paceString.trim() === '') return null;
    const parts = paceString.split(':');
    if (parts.length !== 2) return null;
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    if (isNaN(minutes) || isNaN(seconds) || seconds < 0 || seconds >= 60) return null;
    return minutes + (seconds / 60);
  };

  // Convert decimal minutes to mm:ss format
  const formatPace = (decimalMinutes) => {
    if (!decimalMinutes || decimalMinutes === 0) return '';
    const minutes = Math.floor(decimalMinutes);
    const seconds = Math.round((decimalMinutes - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Convert min/km (decimal) to m/s
  const paceToMs = (paceMinKm) => {
    if (!paceMinKm || paceMinKm === 0) return 0;
    const secondsPerKm = paceMinKm * 60;
    return 1000 / secondsPerKm; // meters per second
  };

  // Convert to meters
  const toMeters = (value, type) => {
    switch(type) {
      case 'KILOMETERS': return value * 1000;
      case 'METERS': return value;
      default: return 0;
    }
  };

  const showSuccessAnimation = () => {
    setShowSuccessModal(true);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    
    // Reset animation values
    successScale.setValue(0);
    successOpacity.setValue(0);

    // Animate success
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-close after 2 seconds and navigate back
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(successScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccessModal(false);
        navigation.goBack();
      });
    }, 2000);
  };

  const showErrorAnimation = (message) => {
    setShowErrorModal(true);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    
    // Reset animation values
    errorScale.setValue(0);
    errorOpacity.setValue(0);

    // Animate error
    Animated.parallel([
      Animated.spring(errorScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(errorOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(errorScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(errorOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowErrorModal(false);
      });
    }, 3000);
  };

  // Convert to seconds
  const toSeconds = (value, type) => {
    switch(type) {
      case 'SECONDS': return value;
      case 'MINUTES': return value * 60;
      default: return 0;
    }
  };

  const validateAndSubmit = async () => {
    // Prevent duplicate submissions using ref (synchronous check)
    if (isSubmittingRef.current) {
      console.log('=== SUBMISSION BLOCKED: Already submitting (ref check) ===');
      return;
    }
    
    // Prevent duplicate submissions using state (async check)
    if (isSubmitting) {
      console.log('=== SUBMISSION BLOCKED: Already submitting (state check) ===');
      return;
    }

    console.log('=== SUBMISSION STARTED ===');
    console.log('Target Type:', targetType);
    console.log('Target Name:', targetName);
    console.log('Timestamp:', new Date().toISOString());
    console.log('========================');

    // Set both ref and state to prevent race conditions
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    // Validate basic fields
    if (!workoutName.trim()) {
      console.log('=== VALIDATION FAILED: Missing workout name ===');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      Alert.alert('Validation Error', 'Please enter a workout name');
      return;
    }

    if (intervals.length === 0) {
      console.log('=== VALIDATION FAILED: No intervals ===');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      Alert.alert('Validation Error', 'Please add at least one interval');
      return;
    }

    // Validate intervals
    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      
      if (interval.type === 'REST') {
        if (!interval.restDurationType || !interval.restTime || interval.restTime <= 0) {
          console.log(`=== VALIDATION FAILED: Interval ${i + 1} invalid rest time ===`);
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          Alert.alert('Validation Error', `Interval ${i + 1}: Please enter a valid rest time`);
          return;
        }
      } else if (interval.type === 'WORKOUT_STEP') {
        if (!interval.repeatCount || interval.repeatCount <= 0) {
          console.log(`=== VALIDATION FAILED: Interval ${i + 1} invalid repeat count ===`);
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          Alert.alert('Validation Error', `Interval ${i + 1}: Please enter a valid repeat count`);
          return;
        }
        
        if (interval.subIntervals.length === 0) {
          console.log(`=== VALIDATION FAILED: Interval ${i + 1} no sub-intervals ===`);
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          Alert.alert('Validation Error', `Interval ${i + 1}: Please add at least one sub-interval`);
          return;
        }

        // Validate sub-intervals
        for (let j = 0; j < interval.subIntervals.length; j++) {
          const sub = interval.subIntervals[j];
          
          if (sub.type === 'REST') {
            if (!sub.restDurationType || !sub.restTime || sub.restTime <= 0) {
              console.log(`=== VALIDATION FAILED: Interval ${i + 1}, Sub-interval ${j + 1} invalid rest time ===`);
              isSubmittingRef.current = false;
              setIsSubmitting(false);
              Alert.alert('Validation Error', `Interval ${i + 1}, Sub-interval ${j + 1}: Please enter a valid rest time`);
              return;
            }
          } else {
            if (!sub.durationType || !sub.durationValue || sub.durationValue <= 0) {
              console.log(`=== VALIDATION FAILED: Interval ${i + 1}, Sub-interval ${j + 1} invalid duration ===`);
              isSubmittingRef.current = false;
              setIsSubmitting(false);
              Alert.alert('Validation Error', `Interval ${i + 1}, Sub-interval ${j + 1}: Please enter valid duration type and value`);
              return;
            }

            if (sub.paceRange) {
              const paceLow = parsePace(sub.paceValueLow);
              const paceHigh = parsePace(sub.paceValueHigh);
              if (paceLow === null || paceLow <= 0 || paceHigh === null || paceHigh <= 0) {
                console.log(`=== VALIDATION FAILED: Interval ${i + 1}, Sub-interval ${j + 1} invalid pace range ===`);
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                Alert.alert('Validation Error', `Interval ${i + 1}, Sub-interval ${j + 1}: Please enter valid pace range values in mm:ss format`);
                return;
              }
              if (paceLow >= paceHigh) {
                console.log(`=== VALIDATION FAILED: Interval ${i + 1}, Sub-interval ${j + 1} pace range invalid ===`);
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                Alert.alert('Validation Error', `Interval ${i + 1}, Sub-interval ${j + 1}: Low pace must be less than high pace`);
                return;
              }
            } else {
              const pace = parsePace(sub.paceValue);
              if (pace === null || pace <= 0) {
                console.log(`=== VALIDATION FAILED: Interval ${i + 1}, Sub-interval ${j + 1} invalid pace ===`);
                isSubmittingRef.current = false;
                setIsSubmitting(false);
                Alert.alert('Validation Error', `Interval ${i + 1}, Sub-interval ${j + 1}: Please enter a valid pace value in mm:ss format (e.g., 5:30)`);
                return;
              }
            }
          }
        }
      }
    }

    // Build JSON structure
    const workoutJson = {
      workoutName: workoutName.trim(),
      description: workoutDesc.trim(),
      sport: "RUNNING",
      steps: []
    };

    let stepOrder = 1;

    intervals.forEach((interval, idx) => {
      if (interval.type === 'REST') {
        // Convert to seconds
        const restTimeInSeconds = interval.restDurationType === 'MINUTES' 
          ? interval.restTime * 60 
          : interval.restTime;
        workoutJson.steps.push({
          stepOrder: stepOrder++,
          type: "WorkoutStep",
          intensity: "REST",
          description: "",
          durationType: "TIME",
          durationValue: restTimeInSeconds
        });
      } else if (interval.type === 'WORKOUT_STEP') {
        // Build sub-intervals as WorkoutStep array
        const subIntervalSteps = [];
        let subStepOrder = 1;

        interval.subIntervals.forEach((sub) => {
          if (sub.type === 'REST') {
            // REST sub-interval - convert to seconds
            const restTimeInSeconds = sub.restDurationType === 'MINUTES' 
              ? sub.restTime * 60 
              : sub.restTime;
            subIntervalSteps.push({
              stepOrder: subStepOrder++,
              type: "WorkoutStep",
              intensity: "REST",
              description: "",
              durationType: "TIME",
              durationValue: restTimeInSeconds
            });
          } else {
            // WORKOUT_STEP sub-interval
            const durationInSeconds = toSeconds(sub.durationValue, sub.durationType);
            const distanceInMeters = toMeters(sub.durationValue, sub.durationType);
            
            // Parse pace values
            const paceDecimal = sub.paceRange ? null : parsePace(sub.paceValue);
            const paceLowDecimal = sub.paceRange ? parsePace(sub.paceValueLow) : null;
            const paceHighDecimal = sub.paceRange ? parsePace(sub.paceValueHigh) : null;
            
            const step = {
              stepOrder: subStepOrder++,
              type: "WorkoutStep",
              intensity: "ACTIVE",
              description: "",
              durationType: sub.durationType === 'KILOMETERS' ? 'DISTANCE' : 
                           sub.durationType === 'METERS' ? 'DISTANCE' :
                           sub.durationType === 'SECONDS' ? 'TIME' : 'TIME',
              durationValue: sub.durationType === 'KILOMETERS' || sub.durationType === 'METERS' 
                ? distanceInMeters 
                : durationInSeconds,
              targetType: "PACE"
            };

            // Only add pace/target fields if pace is specified
            if (sub.paceRange) {
              step.targetValueLow = paceToMs(paceHighDecimal); // High pace = slower = higher m/s
              step.targetValueHigh = paceToMs(paceLowDecimal);  // Low pace = faster = lower m/s
              step.targetValueType = "KILOMETER";
            } else if (paceDecimal) {
              const paceMs = paceToMs(paceDecimal);
              step.targetValueLow = paceMs;
              step.targetValueHigh = paceMs;
              step.targetValueType = "KILOMETER";
            }

            subIntervalSteps.push(step);
          }
        });

        // If repeat count > 1, wrap in WorkoutRepeatStep with nested steps
        if (interval.repeatCount > 1) {
          workoutJson.steps.push({
            stepOrder: stepOrder++,
            type: "WorkoutRepeatStep",
            repeatType: "REPEAT_UNTIL_STEPS_CMPLT",
            repeatValue: interval.repeatCount,
            skipLastRestStep: false,
            steps: subIntervalSteps
          });
        } else {
          // If no repeat, add steps directly to main steps array
          subIntervalSteps.forEach(step => {
            step.stepOrder = stepOrder++;
            workoutJson.steps.push(step);
          });
        }
      }
    });

    console.log('Workout JSON:', JSON.stringify(workoutJson, null, 2));
    
    // Submit to API
    try {
      // Get API key from AsyncStorage
      const apiKey = await AsyncStorage.getItem('apiKey');
      if (!apiKey) {
        Alert.alert('Error', 'No API key found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // Format date as yyyy-MM-dd
      const year = workoutDate.getFullYear();
      const month = String(workoutDate.getMonth() + 1).padStart(2, '0');
      const day = String(workoutDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Determine if it's a flock
      const isFlock = targetType === 'flock';

      // Build request body
      const requestBody = {
        targetName: targetName || '',
        isFlock: isFlock,
        jsonBody: JSON.stringify(workoutJson),
        date: formattedDate
      };

      // Log request details
      const apiUrl = `https://gooseapi.ddns.net/api/addWorkout?apiKey=${encodeURIComponent(apiKey)}`;
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
      console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
      console.log('===================');

      if (response.status === 500) {
        // Show error animation for 500 status
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log('=== ERROR RESPONSE (500) ===');
        console.log('Error Data:', JSON.stringify(errorData, null, 2));
        console.log('=====================');
        showErrorAnimation('Failed to Plan Workout there are no athletes in this Flock');
        return;
      }

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

      if (response.status === 200) {
        // Show success animation for 200 status
        const result = await response.json();
        console.log('=== SUCCESS RESPONSE (200) ===');
        console.log('Response Data:', JSON.stringify(result, null, 2));
        console.log('========================');
        showSuccessAnimation();
        return;
      }

      // Fallback for other success statuses
      const result = await response.json();
      console.log('=== SUCCESS RESPONSE ===');
      console.log('Response Data:', JSON.stringify(result, null, 2));
      console.log('========================');
      showSuccessAnimation();
    } catch (error) {
      console.error('Failed to submit workout:', error);
      Alert.alert('Error', `Failed to submit workout: ${error.message}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
          <Text style={styles.screenTitle}>Create Running Workout</Text>

          {/* Basic Fields */}
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

          <View style={workoutStyles.section}>
            <Text style={workoutStyles.label}>Workout Description</Text>
            <TextInput
              style={[workoutStyles.input, workoutStyles.textArea]}
              placeholder="Enter workout description"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={workoutDesc}
              onChangeText={setWorkoutDesc}
              multiline
              numberOfLines={3}
              editable={!isSubmitting}
            />
          </View>

          <View style={workoutStyles.section}>
            <Text style={workoutStyles.label}>Workout Date *</Text>
            <TouchableOpacity
              style={workoutStyles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={isSubmitting}
            >
              <Text style={workoutStyles.dateButtonText}>
                {workoutDate.toLocaleDateString()}
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

          {/* Intervals */}
          <View style={workoutStyles.section}>
            <View style={workoutStyles.sectionHeader}>
              <Text style={workoutStyles.label}>Intervals *</Text>
            </View>

            {intervals.map((interval, idx) => (
              <View key={interval.id} style={workoutStyles.intervalCard}>
                <View style={workoutStyles.intervalHeader}>
                  <Text style={workoutStyles.intervalTitle}>Interval {idx + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeInterval(interval.id)}
                    style={workoutStyles.removeButton}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Interval Type Selector */}
                <View style={workoutStyles.typeSelector}>
                              <TouchableOpacity
                                style={[
                                  workoutStyles.typeButton,
                                  interval.type === 'WORKOUT_STEP' && workoutStyles.typeButtonActive
                                ]}
                                onPress={() => updateInterval(interval.id, 'type', 'WORKOUT_STEP')}
                                disabled={isSubmitting}
                              >
                    <Text style={[
                      workoutStyles.typeButtonText,
                      interval.type === 'WORKOUT_STEP' && workoutStyles.typeButtonTextActive
                    ]}>
                      Workout Step
                    </Text>
                  </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  workoutStyles.typeButton,
                                  interval.type === 'REST' && workoutStyles.typeButtonActive
                                ]}
                                onPress={() => updateInterval(interval.id, 'type', 'REST')}
                                disabled={isSubmitting}
                              >
                    <Text style={[
                      workoutStyles.typeButtonText,
                      interval.type === 'REST' && workoutStyles.typeButtonTextActive
                    ]}>
                      Rest
                    </Text>
                  </TouchableOpacity>
                </View>

                {interval.type === 'REST' ? (
                  <>
                    <View style={workoutStyles.section}>
                      <Text style={workoutStyles.label}>Duration Type *</Text>
                      <View style={workoutStyles.durationTypeSelector}>
                        {['SECONDS', 'MINUTES'].map((type) => (
                                    <TouchableOpacity
                                      key={type}
                                      style={[
                                        workoutStyles.durationTypeButton,
                                        interval.restDurationType === type && workoutStyles.durationTypeButtonActive
                                      ]}
                                      onPress={() => updateInterval(interval.id, 'restDurationType', type)}
                                      disabled={isSubmitting}
                                    >
                            <Text style={[
                              workoutStyles.durationTypeButtonText,
                              interval.restDurationType === type && workoutStyles.durationTypeButtonTextActive
                            ]}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={workoutStyles.section}>
                      <Text style={workoutStyles.label}>Rest Time ({interval.restDurationType === 'MINUTES' ? 'minutes' : 'seconds'}) *</Text>
                      <TextInput
                        style={workoutStyles.input}
                        placeholder={`Enter rest time in ${interval.restDurationType === 'MINUTES' ? 'minutes' : 'seconds'}`}
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={interval.restTime ? interval.restTime.toString() : ''}
                        onChangeText={(text) => updateInterval(interval.id, 'restTime', parseFloat(text) || 0)}
                        keyboardType="decimal-pad"
                        editable={!isSubmitting}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={workoutStyles.section}>
                      <Text style={workoutStyles.label}>Repeat Count *</Text>
                      <TextInput
                        style={workoutStyles.input}
                        placeholder="Enter repeat count"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        value={interval.repeatCount ? interval.repeatCount.toString() : ''}
                        onChangeText={(text) => updateInterval(interval.id, 'repeatCount', parseInt(text) || 0)}
                        keyboardType="numeric"
                        editable={!isSubmitting}
                      />
                    </View>

                    <View style={workoutStyles.section}>
                      <View style={workoutStyles.sectionHeader}>
                        <Text style={workoutStyles.label}>Sub-Intervals</Text>
                        <TouchableOpacity
                          style={workoutStyles.addButton}
                          onPress={() => addSubInterval(interval.id)}
                          disabled={isSubmitting}
                        >
                          <Ionicons name="add-circle" size={20} color="#F97316" />
                          <Text style={[workoutStyles.addButtonText, { fontSize: 12 }]}>Add</Text>
                        </TouchableOpacity>
                      </View>

                      {interval.subIntervals.map((sub, subIdx) => (
                        <View key={sub.id} style={workoutStyles.subIntervalCard}>
                          <View style={workoutStyles.intervalHeader}>
                            <Text style={workoutStyles.subIntervalTitle}>Sub-Interval {subIdx + 1}</Text>
                            <TouchableOpacity
                              onPress={() => removeSubInterval(interval.id, sub.id)}
                              style={workoutStyles.removeButton}
                              disabled={isSubmitting}
                            >
                              <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          <View style={workoutStyles.section}>
                            <Text style={workoutStyles.label}>Type *</Text>
                            <View style={workoutStyles.typeSelector}>
                              <TouchableOpacity
                                style={[
                                  workoutStyles.typeButton,
                                  sub.type === 'WORKOUT_STEP' && workoutStyles.typeButtonActive
                                ]}
                                onPress={() => updateSubInterval(interval.id, sub.id, 'type', 'WORKOUT_STEP')}
                                disabled={isSubmitting}
                              >
                                <Text style={[
                                  workoutStyles.typeButtonText,
                                  sub.type === 'WORKOUT_STEP' && workoutStyles.typeButtonTextActive
                                ]}>
                                  Workout Step
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  workoutStyles.typeButton,
                                  sub.type === 'REST' && workoutStyles.typeButtonActive
                                ]}
                                onPress={() => updateSubInterval(interval.id, sub.id, 'type', 'REST')}
                                disabled={isSubmitting}
                              >
                                <Text style={[
                                  workoutStyles.typeButtonText,
                                  sub.type === 'REST' && workoutStyles.typeButtonTextActive
                                ]}>
                                  REST
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {sub.type === 'REST' ? (
                            <>
                              <View style={workoutStyles.section}>
                                <Text style={workoutStyles.label}>Duration Type *</Text>
                                <View style={workoutStyles.durationTypeSelector}>
                                  {['SECONDS', 'MINUTES'].map((type) => (
                                    <TouchableOpacity
                                      key={type}
                                      style={[
                                        workoutStyles.durationTypeButton,
                                        sub.restDurationType === type && workoutStyles.durationTypeButtonActive
                                      ]}
                                      onPress={() => updateSubInterval(interval.id, sub.id, 'restDurationType', type)}
                                      disabled={isSubmitting}
                                    >
                                      <Text style={[
                                        workoutStyles.durationTypeButtonText,
                                        sub.restDurationType === type && workoutStyles.durationTypeButtonTextActive
                                      ]}>
                                        {type}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                              <View style={workoutStyles.section}>
                                <Text style={workoutStyles.label}>Rest Time ({sub.restDurationType === 'MINUTES' ? 'minutes' : 'seconds'}) *</Text>
                                <TextInput
                                  style={workoutStyles.input}
                                  placeholder={`Enter rest time in ${sub.restDurationType === 'MINUTES' ? 'minutes' : 'seconds'}`}
                                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                  value={sub.restTime ? sub.restTime.toString() : ''}
                                  onChangeText={(text) => updateSubInterval(interval.id, sub.id, 'restTime', parseFloat(text) || 0)}
                                  keyboardType="decimal-pad"
                                  editable={!isSubmitting}
                                />
                              </View>
                            </>
                          ) : (
                            <>
                              <View style={workoutStyles.section}>
                                <Text style={workoutStyles.label}>Duration Type *</Text>
                                <View style={workoutStyles.durationTypeSelector}>
                                  {['KILOMETERS', 'METERS', 'SECONDS', 'MINUTES'].map((type) => (
                                    <TouchableOpacity
                                      key={type}
                                      style={[
                                        workoutStyles.durationTypeButton,
                                        sub.durationType === type && workoutStyles.durationTypeButtonActive
                                      ]}
                                      onPress={() => updateSubInterval(interval.id, sub.id, 'durationType', type)}
                                      disabled={isSubmitting}
                                    >
                                      <Text style={[
                                        workoutStyles.durationTypeButtonText,
                                        sub.durationType === type && workoutStyles.durationTypeButtonTextActive
                                      ]}>
                                        {type}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>

                              <View style={workoutStyles.section}>
                                <Text style={workoutStyles.label}>Duration Value *</Text>
                                <TextInput
                                  style={workoutStyles.input}
                                  placeholder="Enter duration value"
                                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                  value={sub.durationValue ? sub.durationValue.toString() : ''}
                                  onChangeText={(text) => updateSubInterval(interval.id, sub.id, 'durationValue', parseFloat(text) || 0)}
                                  keyboardType="decimal-pad"
                                  editable={!isSubmitting}
                                />
                              </View>

                              <View style={workoutStyles.section}>
                                <View style={workoutStyles.checkboxRow}>
                                  <TouchableOpacity
                                    style={workoutStyles.checkbox}
                                    onPress={() => updateSubInterval(interval.id, sub.id, 'paceRange', !sub.paceRange)}
                                    disabled={isSubmitting}
                                  >
                                    {sub.paceRange && <Ionicons name="checkmark" size={16} color="#F97316" />}
                                  </TouchableOpacity>
                                  <Text style={workoutStyles.checkboxLabel}>Use Pace Range</Text>
                                </View>
                              </View>

                              {sub.paceRange ? (
                                <>
                                  <View style={workoutStyles.section}>
                                    <Text style={workoutStyles.label}>Pace Low (mm:ss) *</Text>
                                    <TextInput
                                      style={workoutStyles.input}
                                      placeholder="e.g., 5:30"
                                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                      value={sub.paceValueLow || ''}
                                      onChangeText={(text) => updateSubInterval(interval.id, sub.id, 'paceValueLow', text)}
                                      keyboardType="default"
                                      editable={!isSubmitting}
                                    />
                                  </View>
                                  <View style={workoutStyles.section}>
                                    <Text style={workoutStyles.label}>Pace High (mm:ss) *</Text>
                                    <TextInput
                                      style={workoutStyles.input}
                                      placeholder="e.g., 6:00"
                                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                      value={sub.paceValueHigh || ''}
                                      onChangeText={(text) => updateSubInterval(interval.id, sub.id, 'paceValueHigh', text)}
                                      keyboardType="default"
                                      editable={!isSubmitting}
                                    />
                                  </View>
                                </>
                              ) : (
                                <View style={workoutStyles.section}>
                                  <Text style={workoutStyles.label}>Pace (mm:ss) *</Text>
                                  <TextInput
                                    style={workoutStyles.input}
                                    placeholder="e.g., 5:30"
                                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                    value={sub.paceValue || ''}
                                    onChangeText={(text) => updateSubInterval(interval.id, sub.id, 'paceValue', text)}
                                    keyboardType="default"
                                    editable={!isSubmitting}
                                  />
                                </View>
                              )}
                            </>
                          )}
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={workoutStyles.addButton}
              onPress={addInterval}
              disabled={isSubmitting}
            >
              <Ionicons name="add-circle" size={24} color="#F97316" />
              <Text style={workoutStyles.addButtonText}>Add Interval</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[workoutStyles.submitButton, isSubmitting && workoutStyles.submitButtonDisabled]}
            onPress={validateAndSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={workoutStyles.submitButtonText}>Submit Workout</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Success Modal */}
      {showSuccessModal && (
        <View style={workoutStyles.successOverlay}>
          <Animated.View
            style={[
              workoutStyles.successContainer,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={workoutStyles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={workoutStyles.successTitle}>Workout Planned!</Text>
            <Text style={workoutStyles.successText}>
              Workout created and scheduled successfully!
            </Text>
          </Animated.View>
        </View>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <View style={workoutStyles.errorOverlay}>
          <Animated.View
            style={[
              workoutStyles.errorContainer,
              {
                opacity: errorOpacity,
                transform: [{ scale: errorScale }],
              },
            ]}
          >
            <View style={workoutStyles.errorIconContainer}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={workoutStyles.errorTitle}>Failed to Plan Workout</Text>
            <Text style={workoutStyles.errorText}>
              Failed to Plan Workout there are no athletes in this Flock
            </Text>
          </Animated.View>
        </View>
      )}
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
    marginBottom: 10,
  },
  label: {
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
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
  },
  intervalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  intervalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  intervalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subIntervalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  typeButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  subIntervalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  durationTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationTypeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  durationTypeButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  durationTypeButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  durationTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#F97316',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  successContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    minWidth: 280,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  successText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  errorContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    minWidth: 280,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
});

