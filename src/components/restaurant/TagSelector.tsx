/**
 * Tag Selector Component
 * Handles cuisine/tag selection with pre-defined options and custom tag input
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface TagSelectorProps {
  availableTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onAddCustomTag: (tag: string) => void;
  maxTags?: number;
}

/**
 * Tag selector with toggleable chips and custom tag input
 */
export function TagSelector({
  availableTags,
  selectedTags,
  onTagToggle,
  onAddCustomTag,
  maxTags = 10,
}: TagSelectorProps) {
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleAddCustomTag = () => {
    const trimmedTag = customTagInput.trim();
    
    if (!trimmedTag) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    if (trimmedTag.length < 2 || trimmedTag.length > 30) {
      Alert.alert('Error', 'Tag must be between 2-30 characters');
      return;
    }

    if (selectedTags.includes(trimmedTag)) {
      Alert.alert('Error', 'Tag already selected');
      return;
    }

    if (selectedTags.length >= maxTags) {
      Alert.alert('Error', `Maximum ${maxTags} tags allowed`);
      return;
    }

    onAddCustomTag(trimmedTag);
    setCustomTagInput('');
    setShowCustomInput(false);
  };

  const handleToggleTag = (tag: string) => {
    if (!selectedTags.includes(tag) && selectedTags.length >= maxTags) {
      Alert.alert('Error', `Maximum ${maxTags} tags allowed`);
      return;
    }
    onTagToggle(tag);
  };

  const renderTagChip = (tag: string, isSelected: boolean) => (
    <TouchableOpacity
      key={tag}
      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
      onPress={() => handleToggleTag(tag)}
      activeOpacity={0.7}
    >
      <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
        {tag}
      </Text>
    </TouchableOpacity>
  );

  const renderCustomTagInput = () => {
    if (!showCustomInput) {
      return null;
    }

    return (
      <View style={styles.customTagContainer}>
        <View style={styles.customTagInputContainer}>
          <TextInput
            style={styles.customTagInput}
            placeholder="Enter custom tag"
            placeholderTextColor="#999"
            value={customTagInput}
            onChangeText={setCustomTagInput}
            maxLength={30}
            autoFocus
            onSubmitEditing={handleAddCustomTag}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleAddCustomTag}
            style={styles.addTagButton}
            disabled={!customTagInput.trim()}
          >
            <Ionicons 
              name="checkmark" 
              size={16} 
              color={customTagInput.trim() ? "#E8505B" : "#999"} 
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          onPress={() => {
            setShowCustomInput(false);
            setCustomTagInput('');
          }}
          style={styles.cancelCustomButton}
        >
          <Text style={styles.cancelCustomText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Pre-defined Tags */}
      <View style={styles.tagsGrid}>
        {availableTags.map((tag) => 
          renderTagChip(tag, selectedTags.includes(tag))
        )}
        
        {/* Custom tags that aren't in the available list */}
        {selectedTags
          .filter(tag => !availableTags.includes(tag))
          .map((tag) => renderTagChip(tag, true))
        }
      </View>

      {/* Add Custom Tag */}
      {renderCustomTagInput()}
      
      {!showCustomInput && selectedTags.length < maxTags && (
        <TouchableOpacity
          style={styles.addCustomTagButton}
          onPress={() => setShowCustomInput(true)}
        >
          <Ionicons name="add" size={16} color="#E8505B" />
          <Text style={styles.addCustomTagText}>Add Tag</Text>
        </TouchableOpacity>
      )}

      {/* Selected count */}
      <View style={styles.tagCounter}>
        <Text style={styles.tagCounterText}>
          {selectedTags.length}/{maxTags} tags selected
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  tagChipSelected: {
    backgroundColor: '#E8505B',
    borderColor: '#E8505B',
  },
  tagChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#FFF',
  },
  customTagContainer: {
    marginBottom: 16,
  },
  customTagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  customTagInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 12,
  },
  addTagButton: {
    padding: 4,
  },
  cancelCustomButton: {
    alignSelf: 'flex-start',
  },
  cancelCustomText: {
    fontSize: 14,
    color: '#999',
  },
  addCustomTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8505B',
    backgroundColor: '#FFF5F5',
    gap: 6,
    marginBottom: 12,
  },
  addCustomTagText: {
    fontSize: 14,
    color: '#E8505B',
    fontWeight: '500',
  },
  tagCounter: {
    alignItems: 'flex-end',
  },
  tagCounterText: {
    fontSize: 12,
    color: '#999',
  },
});