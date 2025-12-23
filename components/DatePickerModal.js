import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';

const DatePickerModal = ({ visible, onClose, onDateSelect, initialDate }) => {
  const currentDate = initialDate || new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
  
  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  // Reset to today when modal opens and no initialDate is provided
  useEffect(() => {
    if (visible && !initialDate) {
      const today = new Date();
      setSelectedYear(today.getFullYear());
      setSelectedMonth(today.getMonth() + 1);
      setSelectedDay(today.getDate());
    } else if (visible && initialDate) {
      // Reset to initialDate when modal opens with a date
      setSelectedYear(initialDate.getFullYear());
      setSelectedMonth(initialDate.getMonth() + 1);
      setSelectedDay(initialDate.getDate());
    }
  }, [visible, initialDate]);

  // Scroll to selected values when modal opens
  useEffect(() => {
    if (visible) {
      // Small delay to ensure the ScrollViews are rendered
      setTimeout(() => {
        const itemHeight = 48; // Approximate height of each picker item (12 padding + 24 text + 12 padding)
        const scrollOffset = (selectedMonth - 1) * itemHeight - 80; // 80 is paddingVertical
        monthScrollRef.current?.scrollTo({ y: Math.max(0, scrollOffset), animated: true });
        
        const dayOffset = (selectedDay - 1) * itemHeight - 80;
        dayScrollRef.current?.scrollTo({ y: Math.max(0, dayOffset), animated: true });
        
        const currentYear = new Date().getFullYear();
        const yearIndex = selectedYear - (currentYear - 50);
        const yearOffset = yearIndex * itemHeight - 80;
        yearScrollRef.current?.scrollTo({ y: Math.max(0, yearOffset), animated: true });
      }, 100);
    }
  }, [visible, selectedMonth, selectedDay, selectedYear]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
    onDateSelect(date);
    onClose();
  };

  const renderPickerColumn = (items, selectedValue, onValueChange, formatter = (val) => val, scrollRef = null) => {
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.pickerColumn}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerContent}
      >
        {items.map((item, index) => {
          const isSelected = item === selectedValue;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
              onPress={() => onValueChange(item)}
            >
              <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                {formatter(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={[styles.modalButton, styles.modalButtonConfirm]}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerContainer}>
            {renderPickerColumn(months, selectedMonth, setSelectedMonth, (val) => monthNames[val - 1], monthScrollRef)}
            {renderPickerColumn(days, selectedDay, (day) => {
              setSelectedDay(day);
              // Adjust day if it exceeds days in new month
              const maxDays = new Date(selectedYear, selectedMonth, 0).getDate();
              if (day > maxDays) {
                setSelectedDay(maxDays);
              }
            }, (val) => val, dayScrollRef)}
            {renderPickerColumn(years, selectedYear, (year) => {
              setSelectedYear(year);
              // Adjust day if current day doesn't exist in new year
              const maxDays = new Date(year, selectedMonth, 0).getDate();
              if (selectedDay > maxDays) {
                setSelectedDay(maxDays);
              }
            }, (val) => val, yearScrollRef)}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E3A8A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '60%',
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
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
    paddingVertical: 10,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 80,
  },
  pickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderRadius: 8,
  },
  pickerItemText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
  },
  pickerItemTextSelected: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default DatePickerModal;

