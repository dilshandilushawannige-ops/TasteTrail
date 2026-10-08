import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { addCategory, addMenuItem, subscribeToMenu, updateMenuItem } from '@/services/menuService';
import { getRestaurant } from '@/services/restaurantService';
import { uploadImageToCloudinary } from '@/services/imageUploadService';
import { DEFAULT_MENU_CATEGORIES } from '@/constants/menu';
import type { MenuBadge, MenuCategory, MenuItem, MenuItemInput, SpiceLevel } from '@/types/menu';

const manageRoute = '/admin/restaurant/[id]/menu' as any;
const emptyForm = { name: '', tagline: '', categoryId: '', description: '', price: '', spiceLevel: 'None' as SpiceLevel, badge: 'None' as MenuBadge, photoUrl: '', available: true };
const spiceLevels: SpiceLevel[] = ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'];
const badges: MenuBadge[] = ['None', 'Must Try', 'Vegan Delight', "Chef's Special", 'New'];

export default function MenuItemFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; itemId?: string; mode?: string }>();
  const editing = params.mode === 'edit' && !!params.itemId;
  const [restaurantName, setRestaurantName] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySubtitle, setNewCategorySubtitle] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const initializedItem = useRef<string | null>(null);
  const requestCloseRef = useRef<() => void>(() => undefined);

  const resetForm = useCallback((nextItem?: MenuItem | null) => {
    if (nextItem) {
      setForm({
        name: nextItem.name, tagline: nextItem.tagline, categoryId: nextItem.categoryId,
        description: nextItem.description, price: String(nextItem.price), spiceLevel: nextItem.spiceLevel,
        badge: nextItem.badge, photoUrl: nextItem.photoUrl || '', available: nextItem.available,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setDirty(false);
    setCategoryModal(false);
    setNewCategoryModal(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const requestClose = useCallback(() => {
    const leave = () => router.replace({ pathname: manageRoute, params: { id: params.id } } as any);
    if (!dirty) { leave(); return; }
    Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  }, [dirty, params.id, router]);

  useEffect(() => {
    requestCloseRef.current = requestClose;
  }, [requestClose]);

  useFocusEffect(useCallback(() => {
    if (!editing) resetForm();
    const hardwareBack = () => { requestCloseRef.current(); return true; };
    const subscription = BackHandler.addEventListener('hardwareBackPress', hardwareBack);
    return () => subscription.remove();
  }, [editing, resetForm]));

  useEffect(() => {
    if (!params.id) return;
    getRestaurant(params.id).then((restaurant) => setRestaurantName(restaurant?.name || 'Restaurant')).catch(() => setRestaurantName('Restaurant'));
    return subscribeToMenu(params.id, (items) => {
      if (!editing || !params.itemId || initializedItem.current === params.itemId) return;
      const existing = items.find((candidate) => candidate.id === params.itemId);
      if (existing) {
        initializedItem.current = params.itemId;
        setItem(existing);
        resetForm(existing);
      }
    }, setCategories);
  }, [editing, params.id, params.itemId, resetForm]);

  const availableCategories = useMemo(() => categories.length
    ? [...categories, ...DEFAULT_MENU_CATEGORIES
      .filter((name) => !categories.some((category) => category.name.trim().toLowerCase() === name.toLowerCase()))
      .map((name, index) => ({ id: `default-${index}`, name, subtitle: '', sortOrder: categories.length + index }))]
    : DEFAULT_MENU_CATEGORIES.map((name, sortOrder) => ({ id: `default-${sortOrder}`, name, subtitle: '', sortOrder })), [categories]);
  const selectedCategory = availableCategories.find((category) => category.id === form.categoryId);
  const setField = <K extends keyof typeof emptyForm>(key: K, value: typeof emptyForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: '' }));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed to choose an item photo.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]) {
        const uploaded = await uploadImageToCloudinary(result.assets[0].uri, { folder: 'tastetrail/menu-items' });
        setField('photoUrl', uploaded.url);
      }
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload the item photo.');
    }
  };

  const selectCategory = async (category: MenuCategory) => {
    setField('categoryId', category.id);
    setCategoryModal(false);
  };

  const save = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Item name is required';
    if (!form.categoryId) nextErrors.categoryId = 'Choose a category';
    const numericPrice = Number(form.price);
    if (!form.price || !Number.isFinite(numericPrice) || numericPrice <= 0) nextErrors.price = 'Enter a price greater than 0';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !params.id || saving) {
      if (nextErrors.name) scrollRef.current?.scrollTo({ y: 80, animated: true });
      return;
    }
    setSaving(true);
    let categoryId = form.categoryId;
    const selectedDefault = availableCategories.find((category) => category.id === categoryId);
    if (categoryId.startsWith('default-') && selectedDefault) {
      categoryId = await addCategory(params.id, {
        name: selectedDefault.name,
        subtitle: selectedDefault.subtitle,
        sortOrder: selectedDefault.sortOrder,
      });
    }
    const input: MenuItemInput = {
      restaurantId: params.id, name: form.name.trim(), tagline: form.tagline.trim(), categoryId,
      description: form.description.trim(), price: numericPrice, spiceLevel: form.spiceLevel, badge: form.badge,
      photoUrl: form.photoUrl || undefined, available: form.available, sortOrder: item?.sortOrder || 0,
    };
    try {
      if (editing && params.itemId) await updateMenuItem(params.id, params.itemId, input);
      else await addMenuItem(input);
      resetForm();
      router.replace({ pathname: manageRoute, params: { id: params.id } } as any);
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={requestClose}><Ionicons name="arrow-back" size={24} color="#1B2236" /></TouchableOpacity>
          <View style={styles.headerCopy}><Text style={styles.headerTitle}>{editing ? 'Edit Menu Item' : 'Add Menu Item'}</Text><Text style={styles.headerSubtitle}>{restaurantName}</Text></View>
        </View>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Menu Item Details</Text><Text style={styles.subtitle}>Add a delicious item to your restaurant menu.</Text>
          <Text style={styles.sectionCaption}>BASIC INFO</Text>
          <PhotoField photoUrl={form.photoUrl} onPick={pickPhoto} onRemove={() => setField('photoUrl', '')} />
          <Field label="Item Name" required value={form.name} onChange={(value) => setField('name', value)} maxLength={60} icon="restaurant-outline" error={errors.name} />
          <Field label="Tagline" value={form.tagline} onChange={(value) => setField('tagline', value)} maxLength={60} icon="text-outline" />
          <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={styles.select} onPress={() => setCategoryModal(true)}><Ionicons name="list-outline" size={20} color="#555" /><Text style={selectedCategory ? styles.selectText : styles.placeholder}>{selectedCategory?.name || 'Select a category'}</Text><Ionicons name="chevron-down" size={18} color="#777" /></TouchableOpacity>
          {!!errors.categoryId && <Text style={styles.error}>{errors.categoryId}</Text>}
          <Text style={styles.sectionCaption}>DESCRIPTION AND PRICE</Text>
          <Text style={styles.label}>Description</Text>
          <View style={styles.textAreaWrap}><TextInput style={styles.textArea} value={form.description} onChangeText={(value) => setField('description', value)} maxLength={300} multiline placeholder="Describe this menu item" placeholderTextColor="#999" /></View>
          <Text style={styles.counter}>{form.description.length}/300</Text>
          <View style={styles.priceField}><Field label="Price (LKR)" required value={form.price} onChange={(value) => setField('price', value.replace(/[^0-9.]/g, ''))} icon="cash-outline" keyboardType="decimal-pad" error={errors.price} /></View>
          <Text style={styles.sectionCaption}>TASTE AND LABELS</Text>
          <ChipGroup title="Spicy Level" values={spiceLevels} selected={form.spiceLevel} onSelect={(value) => setField('spiceLevel', value as SpiceLevel)} />
          <ChipGroup title="Badge" values={badges} selected={form.badge} onSelect={(value) => setField('badge', value as MenuBadge)} />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={requestClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
            {saving ? <Ionicons name="reload" size={19} color="#FFF" /> : <Ionicons name="checkmark" size={19} color="#FFF" />}
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Item'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={categoryModal} transparent animationType="slide" onRequestClose={() => setCategoryModal(false)}><View style={styles.modalBackdrop}><View style={styles.categorySheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Select Category</Text><TouchableOpacity onPress={() => setCategoryModal(false)}><Ionicons name="close" size={22} color="#555" /></TouchableOpacity></View><ScrollView style={styles.categoryList} keyboardShouldPersistTaps="handled">{availableCategories.map((category) => <TouchableOpacity key={category.id} style={styles.categoryOption} onPress={() => selectCategory(category)}><Text style={styles.categoryOptionText}>{category.name}</Text>{form.categoryId === category.id && <Ionicons name="checkmark-circle" size={20} color="#E8505B" />}</TouchableOpacity>)}</ScrollView><TouchableOpacity style={styles.newCategoryButton} onPress={() => setNewCategoryModal(true)}><Text style={styles.newCategoryText}>+ Add new category</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={newCategoryModal} transparent animationType="fade" onRequestClose={() => setNewCategoryModal(false)}><View style={styles.modalBackdrop}><View style={styles.newCategoryCard}><Text style={styles.sheetTitle}>New Category</Text><Text style={styles.label}>Category Name <Text style={styles.required}>*</Text></Text><TextInput style={styles.simpleInput} value={newCategoryName} onChangeText={setNewCategoryName} placeholder="Category name" /><Text style={styles.label}>Subtitle</Text><TextInput style={styles.simpleInput} value={newCategorySubtitle} onChangeText={setNewCategorySubtitle} placeholder="Optional subtitle" /><View style={styles.modalActions}><TouchableOpacity onPress={() => setNewCategoryModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.smallSave} onPress={async () => { if (!params.id || !newCategoryName.trim()) return; const id = await addCategory(params.id, { name: newCategoryName.trim(), subtitle: newCategorySubtitle.trim(), sortOrder: categories.length }); setField('categoryId', id); setNewCategoryName(''); setNewCategorySubtitle(''); setNewCategoryModal(false); setCategoryModal(false); }}><Text style={styles.saveText}>Create</Text></TouchableOpacity></View></View></View></Modal>
    </SafeAreaView>
  );
}

function PhotoField({ photoUrl, onPick, onRemove }: { photoUrl: string; onPick: () => void; onRemove: () => void }) {
  return <View style={styles.photoField}>{photoUrl ? <View style={styles.photoPreview}><Image source={{ uri: photoUrl }} style={styles.photoImage} /><View style={styles.photoOverlay}><TouchableOpacity style={styles.replaceButton} onPress={onPick}><Ionicons name="camera" size={15} color="#FFF" /><Text style={styles.replaceText}>Replace</Text></TouchableOpacity><TouchableOpacity style={styles.removeButton} onPress={onRemove}><Ionicons name="trash" size={15} color="#FFF" /></TouchableOpacity></View></View> : <TouchableOpacity style={styles.photoPlaceholder} onPress={onPick}><Ionicons name="camera-outline" size={30} color="#999" /><Text style={styles.photoTitle}>Add item photo</Text><Text style={styles.photoHint}>Recommended 16:9</Text></TouchableOpacity>}</View>;
}

function Field({ label, required, value, onChange, maxLength, icon, keyboardType, error }: { label: string; required?: boolean; value: string; onChange: (value: string) => void; maxLength?: number; icon: keyof typeof Ionicons.glyphMap; keyboardType?: 'decimal-pad'; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label} {required && <Text style={styles.required}>*</Text>}</Text><View style={styles.inputWrap}><Ionicons name={icon} size={20} color="#555" /><TextInput style={styles.input} value={value} onChangeText={onChange} maxLength={maxLength} keyboardType={keyboardType} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor="#999" /></View>{!!error && <Text style={styles.error}>{error}</Text>}</View>;
}
function ChipGroup({ title, values, selected, onSelect }: { title: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.chipGroup}><Text style={styles.label}>{title}</Text><View style={styles.chips}>{values.map((value) => <TouchableOpacity key={value} style={[styles.chip, value === selected && styles.chipSelected]} onPress={() => onSelect(value)}><Ionicons name={value === selected ? 'checkmark' : 'ellipse-outline'} size={13} color={value === selected ? '#FFF' : '#68758A'} /><Text style={[styles.chipText, value === selected && styles.chipTextSelected]}>{value}</Text></TouchableOpacity>)}</View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }, headerCopy: { marginLeft: 14 }, headerTitle: { fontSize: 20, color: '#1B2236' }, headerSubtitle: { fontSize: 12, color: '#7B8493', marginTop: 3 }, content: { padding: 20 }, heading: { fontSize: 22, fontWeight: '700', color: '#1B2236' }, subtitle: { fontSize: 14, color: '#7B8493', marginTop: 5, marginBottom: 23 }, sectionCaption: { color: '#8993A1', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 3, marginBottom: 12 }, field: { marginBottom: 20 }, priceField: { marginTop: 20 }, chipGroup: { marginBottom: 24 }, label: { color: '#333', fontSize: 15, fontWeight: '600', marginBottom: 8 }, required: { color: '#E8505B' }, inputWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15 }, input: { flex: 1, color: '#333', fontSize: 16, paddingVertical: 13, paddingLeft: 11 }, error: { color: '#E8505B', fontSize: 12, marginTop: 5 }, select: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, marginBottom: 4 }, selectText: { flex: 1, color: '#333', fontSize: 16, marginLeft: 11 }, placeholder: { flex: 1, color: '#999', fontSize: 16, marginLeft: 11 }, textAreaWrap: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12 }, textArea: { minHeight: 115, padding: 15, fontSize: 16, color: '#333', textAlignVertical: 'top' }, counter: { textAlign: 'right', color: '#999', fontSize: 12, marginTop: 6 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2F7', borderRadius: 18, paddingHorizontal: 12 }, chipSelected: { backgroundColor: '#E8505B' }, chipText: { color: '#68758A', fontSize: 13 }, chipTextSelected: { color: '#FFF', fontWeight: '600' },
  photoField: { marginBottom: 20 }, photoPlaceholder: { aspectRatio: 16 / 9, minHeight: 140, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8', borderWidth: 2, borderStyle: 'dashed', borderColor: '#DDD', borderRadius: 16 }, photoTitle: { color: '#555', fontSize: 15, fontWeight: '600', marginTop: 8 }, photoHint: { color: '#999', fontSize: 12, marginTop: 4 }, photoPreview: { aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: '#EEE' }, photoImage: { width: '100%', height: '100%' }, photoOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 10, backgroundColor: 'rgba(0,0,0,.25)' }, replaceButton: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(0,0,0,.65)', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 }, replaceText: { color: '#FFF', fontSize: 12 }, removeButton: { backgroundColor: '#E8505B', borderRadius: 7, padding: 7 },
  footer: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E5E5', paddingHorizontal: 20, paddingTop: 12 }, cancelButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CCC', borderRadius: 26, backgroundColor: '#FFF' }, cancelText: { color: '#666', fontWeight: '600' }, saveButton: { flex: 2, height: 52, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8505B', borderRadius: 26 }, saveText: { color: '#FFF', fontWeight: '700' }, disabled: { opacity: .65 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.35)' }, categorySheet: { maxHeight: '60%', backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }, categoryList: { flexGrow: 0 }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, sheetTitle: { color: '#333', fontSize: 19, fontWeight: '700' }, categoryOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F1F1' }, categoryOptionText: { color: '#333', fontSize: 15 }, newCategoryButton: { paddingVertical: 16 }, newCategoryText: { color: '#E8505B', fontWeight: '700' }, newCategoryCard: { backgroundColor: '#FFF', margin: 20, borderRadius: 16, padding: 20 }, simpleInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, marginBottom: 13, fontSize: 15 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 8 }, smallSave: { backgroundColor: '#E8505B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
});
