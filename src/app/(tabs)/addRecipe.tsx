import { auth, db } from '@/firebaseConfig';
import { styles } from '@/styles/addRecipe.styles';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Add Recipe Screen
 * Allows users to add new traditional Sri Lankan recipes to Firestore
 */
export default function AddRecipeScreen() {
  const [category, setCategory] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [creditPublicly, setCreditPublicly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const user = auth.currentUser;

  // Available categories
  const categories = [
    'Curries & Sambols',
    'Hoppers & Roti',
    'Coastal Seafood',
    'Heritage Specialties',
    'Village Sweets',
  ];

  // Fetch user's full name from Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Fetched user data:', userData); // Debug log
            setUserName(userData.name || user.email || 'Anonymous');
          } else {
            console.log('User document does not exist'); // Debug log
            setUserName(user.email || 'Anonymous');
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
          setUserName(user.email || 'Anonymous');
        }
      }
    };

    fetchUserName();
  }, [user]);

  /**
   * Add a new empty step to the steps array
   */
  const addStep = () => {
    setSteps([...steps, '']);
  };

  /**
   * Remove a step from the steps array
   */
  const removeStep = (index: number) => {
    if (steps.length === 1) {
      Alert.alert('Cannot Remove', 'You must have at least one step');
      return;
    }
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  /**
   * Update a specific step's text
   */
  const updateStep = (index: number, text: string) => {
    const newSteps = [...steps];
    newSteps[index] = text;
    setSteps(newSteps);
  };

  /**
   * Validate and save recipe to Firestore
   */
  const handleSaveRecipe = async () => {
    // Validate inputs
    if (!category) {
      Alert.alert('Missing Information', 'Please select a category');
      return;
    }

    if (!recipeName.trim()) {
      Alert.alert('Missing Information', 'Please enter a recipe name');
      return;
    }

    if (!ingredients.trim()) {
      Alert.alert('Missing Information', 'Please enter the ingredients');
      return;
    }

    const filledSteps = steps.filter((step) => step.trim() !== '');
    if (filledSteps.length === 0) {
      Alert.alert('Missing Information', 'Please enter at least one step');
      return;
    }

    setLoading(true);

    try {
      // Add recipe to Firestore
      await addDoc(collection(db, 'recipes'), {
        category,
        name: recipeName.trim(),
        ingredients: ingredients.trim(),
        steps: filledSteps,
        creditPublicly,
        createdBy: user?.uid || null,
        createdByName: userName || 'Anonymous',
        createdAt: serverTimestamp(),
        likes: 0,
        saves: 0,
      });

      Alert.alert('Success', 'Recipe saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Clear form
            setCategory('');
            setRecipeName('');
            setIngredients('');
            setSteps(['']);
            setCreditPublicly(true);
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Preserve your family recipes</Text>
          <Text style={styles.subtitle}>
            Preserve your family culinary heritage with simple voice or text entry.
          </Text>
        </View>

        {/* Voice Feature Card */}
        <View style={styles.voiceCard}>
          <View style={styles.voiceIconContainer}>
            <Ionicons name="mic" size={20} color="#4CAF50" />
          </View>
          <View style={styles.voiceContent}>
            <View style={styles.voiceHeader}>
              <Text style={styles.voiceTitle}>Voice-Friendly Kitchen</Text>
              <View style={styles.easyBadge}>
                <Text style={styles.easyText}>EASY</Text>
              </View>
            </View>
            <Text style={styles.voiceDescription}>
              Can't type easily? Simply speak in Sinhala, Tamil, or English and we'll write it
              down for you.
            </Text>
          </View>
        </View>

        {/* Category Selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            disabled={loading}
          >
            <Text style={category ? styles.categorySelectedText : styles.categoryPlaceholderText}>
              {category || 'Select a category'}
            </Text>
            <Ionicons
              name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>

          {/* Category Options */}
          {showCategoryPicker && (
            <View style={styles.categoryOptions}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat && styles.categoryOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                  {category === cat && (
                    <Ionicons name="checkmark-circle" size={20} color="#E8505B" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recipe Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Recipe name <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={styles.inputFlex}
              placeholder="e.g. Grandma's Kukul Mas Curry"
              placeholderTextColor="#CCC"
              value={recipeName}
              onChangeText={setRecipeName}
              editable={!loading}
            />
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic" size={18} color="#E8505B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tip}>Tip: You can include the village or region name too.</Text>
        </View>

        {/* Ingredients Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Ingredients <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={[styles.inputFlex, styles.textArea]}
              placeholder="Speak or type ingredients, e.g. 500g tuna, 2 sprigs curry leaves..."
              placeholderTextColor="#CCC"
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              numberOfLines={4}
              editable={!loading}
            />
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic" size={18} color="#E8505B" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Just list what you use; measurements can be approximate.
            </Text>
          </View>
        </View>

        {/* Steps Input - Multiple Dynamic Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.label}>
            Steps <Text style={styles.required}>*</Text>
          </Text>

          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>Step {index + 1}</Text>
                {steps.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeStep(index)}
                    style={styles.removeButton}
                    disabled={loading}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF5252" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.stepInputRow}>
                <TextInput
                  style={styles.stepInput}
                  placeholder="Explain step by step or narrate naturally..."
                  placeholderTextColor="#CCC"
                  value={step}
                  onChangeText={(text) => updateStep(index, text)}
                  multiline
                  editable={!loading}
                />
                <TouchableOpacity style={styles.micButton}>
                  <Ionicons name="mic" size={18} color="#E8505B" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add Step Button */}
          <TouchableOpacity
            style={styles.addStepButton}
            onPress={addStep}
            disabled={loading}
          >
            <Ionicons name="add-circle-outline" size={24} color="#E8505B" />
            <Text style={styles.addStepText}>Add another step</Text>
          </TouchableOpacity>

          <Text style={styles.tip}>
            Describe it like you're teaching your grandchild at the stove.
          </Text>
        </View>

        {/* Credit Publicly Option */}
        <View style={styles.creditCard}>
          <View style={styles.creditLeft}>
            <View style={styles.creditIconContainer}>
              <Ionicons name="person" size={20} color="#FF9800" />
            </View>
            <View style={styles.creditContent}>
              <Text style={styles.creditTitle}>Credit me publicly</Text>
              <Text style={styles.creditDescription}>Help food lovers discover authentic heritage</Text>
            </View>
          </View>
          <Switch
            value={creditPublicly}
            onValueChange={setCreditPublicly}
            trackColor={{ false: '#E5E5E5', true: '#E8505B' }}
            thumbColor={creditPublicly ? '#FFFFFF' : '#f4f3f4'}
            disabled={loading}
          />
        </View>

        {/* Display Name Info */}
        {creditPublicly && (
          <View style={styles.displayInfo}>
            <Ionicons name="information-circle" size={16} color="#4CAF50" />
            <Text style={styles.displayText}>
              Will display: <Text style={styles.displayName}>{userName || 'Loading...'}</Text>
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveRecipe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FAFAF7" />
          ) : (
            <>
              <Ionicons name="bookmark" size={20} color="#FAFAF7" />
              <Text style={styles.saveButtonText}>Save recipe</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.saveNote}>
          Saved recipes are safely stored in your offline personal cookbook.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
