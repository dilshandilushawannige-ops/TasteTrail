import { auth, db } from '@/firebaseConfig';
import { styles } from '@/styles/addRecipe.styles';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Ingredient = {
  name: string;
  amount: string;
  unit: string;
};

/**
 * Add Recipe Screen
 * Allows users to add new traditional Sri Lankan recipes to Firestore
 */
export default function AddRecipeScreen() {
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  const [category, setCategory] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '', unit: 'g' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [creditPublicly, setCreditPublicly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const user = auth.currentUser;

  // Cloudinary configuration - Replace with your actual Cloudinary details
  const CLOUDINARY_CLOUD_NAME = 'dknhx6ap7'; // Replace this
  const CLOUDINARY_UPLOAD_PRESET = 'taste_trail_recipes'; // Replace this

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
            console.log('Fetched user data:', userData);
            setUserName(userData.name || user.email || 'Anonymous');
          } else {
            console.log('User document does not exist');
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

  useEffect(() => {
    if (!recipeId) return;
    getDoc(doc(db, 'recipes', recipeId)).then(snapshot => {
      if (!snapshot.exists() || snapshot.data().createdBy !== user?.uid) {
        Alert.alert('Unable to edit recipe', 'You can only edit your own recipes.');
        router.back();
        return;
      }
      const data = snapshot.data();
      setCategory(data.category || '');
      setRecipeName(data.name || '');
      setIngredients(
        Array.isArray(data.ingredients)
          ? data.ingredients.map((item: Partial<Ingredient>) => ({
              name: typeof item.name === 'string' ? item.name : '',
              amount: typeof item.amount === 'string' ? item.amount : '',
              unit: typeof item.unit === 'string' ? item.unit : 'g',
            }))
          : [{ name: typeof data.ingredients === 'string' ? data.ingredients : '', amount: '', unit: 'g' }],
      );
      setSteps(Array.isArray(data.steps) && data.steps.length ? data.steps : ['']);
      setCreditPublicly(data.creditPublicly !== false);
      setExistingImageUrl(typeof data.imageUrl === 'string' ? data.imageUrl : null);
    }).catch(error => {
      console.error('Error loading recipe for editing:', error);
      Alert.alert('Unable to edit recipe', 'Could not load this recipe. Please try again.');
      router.back();
    });
  }, [recipeId, user?.uid]);

  /**
   * Pick image from device gallery
   */
  const pickImage = async () => {
    const { status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  /**
   * Upload image to Cloudinary using a platform-compatible multipart payload
   */
  const uploadImageToCloudinary = async (uri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const imageResponse = await fetch(uri);
        if (!imageResponse.ok) {
          throw new Error(`Failed to read selected image (${imageResponse.status})`);
        }
        formData.append('file', await imageResponse.blob(), 'recipe-image.jpg');
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        formData.append('file', `data:image/jpeg;base64,${base64}`);
      }
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok && data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error(data.error?.message || 'Failed to get image URL from Cloudinary');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please check your Cloudinary settings and try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

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

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const addIngredient = () => {
    setIngredients((current) => [...current, { name: '', amount: '', unit: 'g' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  /**
   * Validate and save recipe to Firestore
   */
  const handleSaveRecipe = async () => {
    if (!category) {
      Alert.alert('Missing Information', 'Please select a category');
      return;
    }

    if (!recipeName.trim()) {
      Alert.alert('Missing Information', 'Please enter a recipe name');
      return;
    }

    const filledIngredients = ingredients.filter((ingredient) => ingredient.name.trim() !== '');
    if (filledIngredients.length === 0) {
      Alert.alert('Missing Information', 'Please enter the ingredients');
      return;
    }
    if (filledIngredients.some((ingredient) => !ingredient.amount.trim() || !ingredient.unit.trim())) {
      Alert.alert('Missing Information', 'Please add an amount and unit for every ingredient');
      return;
    }

    const filledSteps = steps.filter((step) => step.trim() !== '');
    if (filledSteps.length === 0) {
      Alert.alert('Missing Information', 'Please enter at least one step');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImageToCloudinary(imageUri);
        if (!imageUrl) {
          setLoading(false);
          return;
        }
      }

      const recipeData = {
        category,
        name: recipeName.trim(),
        ingredients: filledIngredients.map((ingredient) => ({
          name: ingredient.name.trim(),
          amount: ingredient.amount.trim(),
          unit: ingredient.unit.trim(),
        })),
        steps: filledSteps,
        imageUrl: imageUrl || existingImageUrl,
        creditPublicly,
        createdBy: user?.uid || null,
        createdByName: userName || 'Anonymous',
      };

      if (recipeId) {
        await updateDoc(doc(db, 'recipes', recipeId), recipeData);
      } else {
        await addDoc(collection(db, 'recipes'), {
          ...recipeData,
          createdAt: serverTimestamp(),
          likes: 0,
          saves: 0,
        });
      }

      Alert.alert('Success', recipeId ? 'Recipe updated successfully!' : 'Recipe saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setCategory('');
            setRecipeName('');
            setIngredients([{ name: '', amount: '', unit: 'g' }]);
            setSteps(['']);
            setImageUri(null);
            setExistingImageUrl(null);
            setCreditPublicly(true);
            if (recipeId) router.back();
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
        <View style={styles.header}>
          <Text style={styles.title}>Preserve your family recipes</Text>
          <Text style={styles.subtitle}>
            Preserve your family culinary heritage with simple voice or text entry.
          </Text>
        </View>

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
              Can&apos;t type easily? Simply speak in Sinhala, Tamil, or English and we&apos;ll write it
              down for you.
            </Text>
          </View>
        </View>

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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Ingredients <Text style={styles.required}>*</Text>
          </Text>
          {ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientItem}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>Ingredient {index + 1}</Text>
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredient(index)} disabled={loading}>
                    <Ionicons name="trash-outline" size={19} color="#FF5252" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ingredient name, e.g. Yellowfin tuna"
                placeholderTextColor="#CCC"
                value={ingredient.name}
                onChangeText={(value) => updateIngredient(index, 'name', value)}
                editable={!loading}
              />
              <View style={styles.ingredientAmountRow}>
                <TextInput
                  style={[styles.input, styles.ingredientAmountInput]}
                  placeholder="Amount"
                  placeholderTextColor="#CCC"
                  value={ingredient.amount}
                  onChangeText={(value) => updateIngredient(index, 'amount', value)}
                  keyboardType="decimal-pad"
                  editable={!loading}
                />
                <TextInput
                  style={[styles.input, styles.ingredientUnitInput]}
                  placeholder="Unit (g, kg, tsp)"
                  placeholderTextColor="#CCC"
                  value={ingredient.unit}
                  onChangeText={(value) => updateIngredient(index, 'unit', value)}
                  editable={!loading}
                />
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addStepButton} onPress={addIngredient} disabled={loading}>
            <Ionicons name="add-circle-outline" size={24} color="#E8505B" />
            <Text style={styles.addStepText}>Add ingredient</Text>
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Add an amount and unit, such as 500 g tuna or 2 tsp pepper.
            </Text>
          </View>
        </View>

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

          <TouchableOpacity
            style={styles.addStepButton}
            onPress={addStep}
            disabled={loading}
          >
            <Ionicons name="add-circle-outline" size={24} color="#E8505B" />
            <Text style={styles.addStepText}>Add another step</Text>
          </TouchableOpacity>

          <Text style={styles.tip}>
            Describe it like you&apos;re teaching your grandchild at the stove.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipe Photo</Text>
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImage}
            disabled={loading || uploadingImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.selectedImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="camera" size={40} color="#E8505B" />
                <Text style={styles.imagePickerText}>Add a photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImageUri(null)}
              disabled={loading || uploadingImage}
            >
              <Ionicons name="close-circle" size={20} color="#FF5252" />
              <Text style={styles.removeImageText}>Remove photo</Text>
            </TouchableOpacity>
          )}
        </View>

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

        {creditPublicly && (
          <View style={styles.displayInfo}>
            <Ionicons name="information-circle" size={16} color="#4CAF50" />
            <Text style={styles.displayText}>
              Will display: <Text style={styles.displayName}>{userName || 'Loading...'}</Text>
            </Text>
          </View>
        )}

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
