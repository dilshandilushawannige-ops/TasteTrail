/**
 * Step 1: Restaurant Details Form Component
 * Handles restaurant name, category, tags, description, and photos
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RESTAURANT_CATEGORIES, CUISINE_TAGS, MAX_ADDITIONAL_PHOTOS } from '@/constants/restaurant';
import { CategorySelector } from '@/components/restaurant/CategorySelector';
import { TagSelector } from '@/components/restaurant/TagSelector';
import { CoverPhotoUploader } from '@/components/restaurant/CoverPhotoUploader';
import { AdditionalPhotosUploader } from '@/components/restaurant/AdditionalPhotosUploader';
import { useRestaurantFormContext } from '@/contexts/RestaurantFormContext';

/**
 * Restaurant Details Step Component (Step 1 of 2)
 */
export function RestaurantDetailsStep() {
  const {
    formData,
    errors,
    updateField,
  } = useRestaurantFormContext();

  const renderIntroSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Restaurant Details</Text>
      <Text style={styles.introText}>
        Introduce your culinary sanctuary to heritage food lovers across the island.
      </Text>
    </View>
  );

  const renderNameField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Restaurant Name <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.inputContainer}>
        <Ionicons name="restaurant-outline" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Amma's Southern Kitchen"
          placeholderTextColor="#999"
          value={formData.name}
          onChangeText={(value) => updateField('name', value)}
          maxLength={100}
        />
      </View>
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
    </View>
  );

  const renderCategoryField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Category <Text style={styles.required}>*</Text>
      </Text>
      <CategorySelector
        categories={RESTAURANT_CATEGORIES}
        selectedCategory={formData.category}
        onSelect={(category) => updateField('category', category)}
        placeholder="Select dining concept"
        error={errors.category}
      />
      {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
    </View>
  );

  const renderTagsField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Cuisine / Tags</Text>
      <Text style={styles.fieldHint}>Tap to toggle</Text>
        <TagSelector
          availableTags={CUISINE_TAGS}
          selectedTags={formData.tags}
          onTagToggle={(tag) => {
            const newTags = formData.tags.includes(tag)
              ? formData.tags.filter((t: string) => t !== tag)
              : [...formData.tags, tag];
            updateField('tags', newTags);
          }}
          onAddCustomTag={(tag) => {
            if (!formData.tags.includes(tag)) {
              updateField('tags', [...formData.tags, tag]);
            }
          }}
          maxTags={10}
        />
    </View>
  );

  const renderSignatureDishField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Signature Dish</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="restaurant" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Black Pepper Claypot Fish Ambul Thiyal"
          placeholderTextColor="#999"
          value={formData.signatureDish}
          onChangeText={(value) => updateField('signatureDish', value)}
          maxLength={100}
        />
      </View>
      {errors.signatureDish && <Text style={styles.errorText}>{errors.signatureDish}</Text>}
    </View>
  );

  const renderDescriptionField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Description <Text style={styles.required}>*</Text>
      </Text>
      <Text style={styles.fieldHint}>Rich culinary narrative</Text>
      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the restaurant's authentic recipes, heritage story, and culinary atmosphere..."
          placeholderTextColor="#999"
          value={formData.description}
          onChangeText={(value) => updateField('description', value)}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>
      <View style={styles.characterCount}>
        <Text style={styles.characterCountText}>{formData.description.length}/500</Text>
      </View>
      {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
    </View>
  );

  const renderCoverPhotoField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        Cover Photo <Text style={styles.required}>*</Text>
      </Text>
      <Text style={styles.fieldHint}>Aspect ratio 16:9</Text>
      <CoverPhotoUploader
        photoUri={formData.coverPhotoUri}
        onPhotoSelected={(uri) => updateField('coverPhotoUri', uri)}
        onPhotoRemoved={() => updateField('coverPhotoUri', undefined)}
        error={errors.coverPhoto}
      />
      {errors.coverPhoto && <Text style={styles.errorText}>{errors.coverPhoto}</Text>}
    </View>
  );

  const renderAdditionalPhotosField = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Additional Photos</Text>
      <Text style={styles.fieldHint}>
        {formData.additionalPhotosUris.length}/{MAX_ADDITIONAL_PHOTOS} uploaded
      </Text>
      <AdditionalPhotosUploader
        photoUris={formData.additionalPhotosUris}
        onPhotosSelected={(uris) => updateField('additionalPhotosUris', uris)}
        onPhotoRemoved={(index) => {
          const newUris = formData.additionalPhotosUris.filter((_: string, i: number) => i !== index);
          updateField('additionalPhotosUris', newUris);
        }}
        maxPhotos={MAX_ADDITIONAL_PHOTOS}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderIntroSection()}
      {renderNameField()}
      {renderCategoryField()}
      {renderTagsField()}
      {renderSignatureDishField()}
      {renderDescriptionField()}
      {renderCoverPhotoField()}
      {renderAdditionalPhotosField()}
      
      {/* Bottom padding for footer */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  fieldContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#E8505B',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 15,
  },
  textAreaContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 120,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 120,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
    color: '#999',
  },
  errorText: {
    fontSize: 12,
    color: '#E8505B',
    marginTop: 4,
    marginLeft: 4,
  },
  bottomPadding: {
    height: 20,
  },
});