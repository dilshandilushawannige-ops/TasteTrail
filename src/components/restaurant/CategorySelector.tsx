/**
 * Category Selector Component
 * Dropdown/bottom sheet for selecting restaurant category
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { RestaurantCategory } from '@/types/restaurant';

interface CategorySelectorProps {
  categories: RestaurantCategory[];
  selectedCategory: RestaurantCategory | '';
  onSelect: (category: RestaurantCategory) => void;
  placeholder?: string;
  error?: string;
}

/**
 * Category selector with bottom sheet modal
 */
export function CategorySelector({
  categories,
  selectedCategory,
  onSelect,
  placeholder = 'Select category',
  error,
}: CategorySelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSelect = (category: RestaurantCategory) => {
    onSelect(category);
    setIsModalVisible(false);
  };

  const renderTrigger = () => (
    <TouchableOpacity
      style={[styles.trigger, error && styles.triggerError]}
      onPress={() => setIsModalVisible(true)}
      activeOpacity={0.7}
    >
      <View style={styles.triggerContent}>
        <Ionicons name="grid" size={20} color="#333" style={styles.triggerIcon} />
        <Text style={[
          styles.triggerText,
          !selectedCategory && styles.placeholderText
        ]}>
          {selectedCategory || placeholder}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderModal = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setIsModalVisible(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Category</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Categories List */}
        <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryOption,
                selectedCategory === category && styles.categoryOptionSelected
              ]}
              onPress={() => handleSelect(category)}
            >
              <Text style={[
                styles.categoryOptionText,
                selectedCategory === category && styles.categoryOptionTextSelected
              ]}>
                {category}
              </Text>
              {selectedCategory === category && (
                <Ionicons name="checkmark" size={20} color="#E8505B" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View>
      {renderTrigger()}
      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  triggerError: {
    borderColor: '#E8505B',
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  triggerIcon: {
    marginRight: 12,
  },
  triggerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  modal: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#E8505B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 60, // Match close button width for centering
  },
  categoriesList: {
    flex: 1,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  categoryOptionSelected: {
    backgroundColor: '#FFF5F5',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: '#E8505B',
    fontWeight: '500',
  },
});