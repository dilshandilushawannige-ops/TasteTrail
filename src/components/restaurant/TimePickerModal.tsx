/**
 * Time Picker Modal Component
 * Modal for selecting opening/closing times with 15-minute intervals
 */

import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { generateTimeOptions, formatTimeTo12Hour } from '@/utils/time';

interface TimePickerModalProps {
  visible: boolean;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Time picker modal with 15-minute interval options
 */
export function TimePickerModal({
  visible,
  selectedTime,
  onTimeSelect,
  onClose,
  title = 'Select Time',
}: TimePickerModalProps) {
  const timeOptions = generateTimeOptions();

  const renderTimeOption = ({ item }: { item: { label: string; value: string } }) => {
    const isSelected = item.value === selectedTime;
    
    return (
      <TouchableOpacity
        style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
        onPress={() => onTimeSelect(item.value)}
      >
        <View style={styles.timeOptionContent}>
          <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
            {item.value}
          </Text>
          <Text style={[styles.timeOption12Text, isSelected && styles.timeOption12TextSelected]}>
            {formatTimeTo12Hour(item.value)}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>{title}</Text>
          
          <TouchableOpacity 
            onPress={() => {
              onTimeSelect(selectedTime);
              onClose();
            }} 
            style={styles.doneButton}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Time Options List */}
        <FlatList
          data={timeOptions}
          renderItem={renderTimeOption}
          keyExtractor={(item) => item.value}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
          initialScrollIndex={timeOptions.findIndex(option => option.value === selectedTime)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAF7',
  },
  closeButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E8505B',
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  timeOptionSelected: {
    backgroundColor: '#FFF5F5',
  },
  timeOptionContent: {
    flex: 1,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  timeOptionTextSelected: {
    color: '#E8505B',
    fontWeight: '600',
  },
  timeOption12Text: {
    fontSize: 14,
    color: '#999',
  },
  timeOption12TextSelected: {
    color: '#E8505B',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8505B',
  },
});