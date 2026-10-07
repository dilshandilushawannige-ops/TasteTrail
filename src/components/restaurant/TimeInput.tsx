/**
 * Time Input Component
 * Masked input for HH:mm time format with validation
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { formatTimeTo12Hour } from '@/utils/time';

interface TimeInputProps {
  value: string;
  onChangeTime: (time: string) => void;
  placeholder?: string;
  error?: string;
  label: string;
}

/**
 * Masked time input component with HH:mm format
 */
export function TimeInput({
  value,
  onChangeTime,
  placeholder = '00:00',
  error,
  label,
}: TimeInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const formatTimeInput = (text: string): string => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');
    
    // Limit to 4 digits (HHMM)
    const limitedDigits = digits.slice(0, 4);
    
    // Format as HH:MM
    if (limitedDigits.length <= 2) {
      return limitedDigits;
    } else {
      return `${limitedDigits.slice(0, 2)}:${limitedDigits.slice(2)}`;
    }
  };

  const validateAndFormatTime = (formattedTime: string): string => {
    if (formattedTime.length !== 5) return formattedTime;
    
    const [hours, minutes] = formattedTime.split(':').map(Number);
    
    // Validate hours (0-23)
    let validHours = hours;
    if (hours > 23) validHours = 23;
    
    // Validate minutes (0-59)  
    let validMinutes = minutes;
    if (minutes > 59) validMinutes = 59;
    
    return `${validHours.toString().padStart(2, '0')}:${validMinutes.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (text: string) => {
    const formatted = formatTimeInput(text);
    const validated = validateAndFormatTime(formatted);
    onChangeTime(validated);
  };

  const get12HourHint = (): string => {
    if (value && value.length === 5) {
      return formatTimeTo12Hour(value);
    }
    return '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      
      <TouchableOpacity
        style={[styles.timeInput, error && styles.inputError, isFocused && styles.inputFocused]}
        activeOpacity={1}
      >
        <Ionicons name="time-outline" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType="number-pad"
          maxLength={5}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {get12HourHint() && (
          <Text style={styles.hint12Hour}>{get12HourHint()}</Text>
        )}
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#E8505B',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputError: {
    borderColor: '#E8505B',
  },
  inputFocused: {
    borderColor: '#E8505B',
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'monospace', // Use monospace for better digit alignment
  },
  hint12Hour: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#E8505B',
    marginTop: 4,
    marginLeft: 4,
  },
});