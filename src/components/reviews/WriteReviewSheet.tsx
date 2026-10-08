import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '@/firebaseConfig';
import { CreateReviewData } from '@/types/review';

export interface ReviewFormData extends CreateReviewData {
  diningType: string;
  mealTime: string;
  visitedWith: string;
  anonymous: boolean;
  media: ImagePicker.ImagePickerAsset[];
}
interface WriteReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (review: ReviewFormData) => Promise<void>;
  restaurantId: string;
  restaurantName: string;
  restaurantPhoto?: string;
  restaurantDescription?: string;
}
const MAX_CHARACTERS = 580;
const MAX_MEDIA = 6;
const ratingLabels = ['Select your rating', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding!'];

export function WriteReviewSheet({ visible, onClose, onSubmit, restaurantId, restaurantName, restaurantPhoto, restaurantDescription }: WriteReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const pickingRef = useRef(false);
  const submittingRef = useRef(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [diningType, setDiningType] = useState('Dine-in');
  const [mealTime, setMealTime] = useState('Lunch');
  const [visitedWith, setVisitedWith] = useState('Family');
  const [anonymous, setAnonymous] = useState(false);
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const showFeedback = (title: string, message: string) => {
    setFeedback(`${title}: ${message}`);
    if (Platform.OS !== 'web') Alert.alert(title, message);
  };
  const addMedia = async () => {
    if (pickingRef.current || media.length >= MAX_MEDIA) return;
    pickingRef.current = true; setPicking(true);
    try {
      if (Platform.OS === 'ios') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showFeedback('Permission required', 'Allow photo library access to add photos and videos.'); return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'], allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA - media.length, quality: 0.8,
      });
      if (!result.canceled) setMedia(current => [...current, ...result.assets.filter(asset => !current.some(item => item.uri === asset.uri))].slice(0, MAX_MEDIA));
    } catch {
      showFeedback('Unable to add media', 'Please try selecting your photos or videos again.');
    } finally { pickingRef.current = false; setPicking(false); }
  };
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!rating || comment.trim().length < 10) {
      showFeedback('Complete your review', 'Select a rating and write at least 10 characters.'); return;
    }
    if (!onSubmit) {
      showFeedback('Publishing is not available yet', 'Your review and selected media remain in this draft. You can continue editing or save it for this visit.'); return;
    }
    const user = auth.currentUser;
    if (!user) { showFeedback('Sign in required', 'Please sign in before submitting your review.'); return; }
    submittingRef.current = true; setSubmitting(true);
    try {
      await onSubmit({ restaurantId, userId: user.uid, userName: anonymous ? 'Anonymous' : user.displayName || 'TasteTrail member', rating, comment: comment.trim(), diningType, mealTime, visitedWith, anonymous, media });
      setRating(0); setComment(''); setMedia([]); setAnonymous(false);
      showFeedback('Review submitted', 'Thank you for sharing your experience!');
      onClose();
    } catch { showFeedback('Unable to submit', 'Your draft is still here. Please try again.'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };
  const choices = (label: string, options: string[], value: string, select: (value: string) => void) => (
    <View style={styles.choiceGroup}><Text style={styles.label}>{label}</Text><View style={styles.choices}>
      {options.map(option => <TouchableOpacity key={option} disabled={submitting} onPress={() => select(option)} accessibilityRole="radio" accessibilityState={{ checked: value === option }} style={[styles.chip, value === option && styles.selectedChip]}><Text style={[styles.chipText, value === option && styles.selectedChipText]}>{option}</Text></TouchableOpacity>)}
    </View></View>
  );
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!submitting && !picking) onClose(); }}>
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Close review" disabled={submitting || picking} onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={23} color="#6B7488" /></TouchableOpacity>
          <View style={styles.heading}><Text style={styles.title}>Write a Review</Text><View style={styles.subtitleRow}><View style={styles.subtitleDot} /><Text numberOfLines={1} style={styles.subtitle}>{restaurantName.toUpperCase()}</Text></View></View>
          <View style={styles.avatar}><Ionicons name="person" size={18} color="#FFF" /></View>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {feedback && <View style={styles.feedback} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Text style={styles.feedbackText}>{feedback}</Text>
            <TouchableOpacity accessibilityLabel="Dismiss message" onPress={() => setFeedback(null)} style={styles.dismissFeedback}><Ionicons name="close" size={18} color="#B5213B" /></TouchableOpacity>
          </View>}
          <View style={[styles.card, styles.restaurantCard]}>
            {restaurantPhoto ? <Image source={{ uri: restaurantPhoto }} style={styles.restaurantPhoto} /> : <View style={[styles.restaurantPhoto, styles.photoPlaceholder]}><Ionicons name="restaurant" size={25} color="#B5213B" /></View>}
            <View style={styles.restaurantInfo}><Text style={styles.restaurantName}>{restaurantName}</Text>{!!restaurantDescription && <Text numberOfLines={2} style={styles.description}>{restaurantDescription}</Text>}<Text style={styles.supportText}>SHARING EXPERIENCE SUPPORTS LOCAL DINING</Text></View>
          </View>
          <View style={[styles.card, styles.ratingCard]}>
            <Text style={styles.label}>HOW WAS YOUR VISIT?</Text><View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => <TouchableOpacity key={star} disabled={submitting} onPress={() => setRating(star)} accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`} accessibilityRole="radio" accessibilityState={{ checked: rating === star }} style={styles.starButton}><Ionicons name={star <= rating ? 'star' : 'star-outline'} size={31} color="#F59A08" /></TouchableOpacity>)}
            </View><Text style={styles.ratingText}>{rating ? `${rating.toFixed(1)} - ${ratingLabels[rating]}` : ratingLabels[0]}</Text><Text style={styles.ratingHint}>{rating ? 'Share what stood out during your visit.' : 'Tap a star to rate your experience.'}</Text>
          </View>
          <View style={styles.card}>
            {choices('DINING TYPE', ['Dine-in', 'Takeaway', 'Delivery'], diningType, setDiningType)}
            {choices('MEAL TIME', ['Breakfast', 'Lunch', 'Dinner'], mealTime, setMealTime)}
            {choices('VISITED WITH', ['Solo', 'Couple', 'Family', 'Friends'], visitedWith, setVisitedWith)}
          </View>
          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your Review</Text><Text style={styles.count}>{comment.length}/{MAX_CHARACTERS}</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prompts}>
              {['Recommended dishes?', 'Wait time?', 'Parking?'].map(prompt => <TouchableOpacity key={prompt} disabled={submitting} style={styles.prompt} onPress={() => { setComment(current => `${current}${current.trim() ? '\n' : ''}${prompt} `.slice(0, MAX_CHARACTERS)); inputRef.current?.focus(); }}><Text style={styles.promptText}>+ {prompt}</Text></TouchableOpacity>)}
            </ScrollView>
            <TextInput ref={inputRef} style={styles.commentInput} multiline maxLength={MAX_CHARACTERS} editable={!submitting} placeholder="Share the dishes you loved and what made your visit memorable..." placeholderTextColor="#8A8C9D" value={comment} onChangeText={setComment} textAlignVertical="top" accessibilityLabel="Your review" />
          </View>
          <View style={styles.card}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Add Photos &amp; Videos</Text><Text style={styles.count}>{media.length} of {MAX_MEDIA} added</Text></View>
            <View style={styles.mediaGrid}>
              {media.map((asset, index) => <View key={asset.uri} style={styles.mediaTile}>
                {asset.type === 'video' ? <View style={styles.videoTile}><Ionicons name="videocam" size={28} color="#B5213B" /><Text numberOfLines={1} style={styles.mediaLabel}>{asset.fileName || 'Video'}</Text></View> : <Image source={{ uri: asset.uri }} style={styles.mediaImage} />}
                <TouchableOpacity accessibilityLabel={`Remove attachment ${index + 1}`} disabled={submitting} onPress={() => setMedia(current => current.filter((_, i) => i !== index))} style={styles.removeMedia}><Ionicons name="close" size={15} color="#FFF" /></TouchableOpacity>
              </View>)}
              {media.length < MAX_MEDIA && <TouchableOpacity style={[styles.mediaTile, styles.addMedia]} onPress={addMedia} disabled={picking || submitting} accessibilityLabel="Add photos or videos"><View style={styles.cameraCircle}><Ionicons name="camera-outline" size={22} color="#C72D49" /></View><Text style={styles.mediaLabel}>{picking ? 'OPENING...' : 'ADD MEDIA'}</Text></TouchableOpacity>}
            </View>
            <View style={styles.mediaHintRow}><Ionicons name="checkmark-circle-outline" size={14} color="#279A8C" /><Text style={styles.mediaHint}>Photos of food, menus, and ambiance help fellow diners!</Text></View>
          </View>
          <TouchableOpacity style={styles.anonymousRow} onPress={() => setAnonymous(value => !value)} disabled={submitting} accessibilityRole="checkbox" accessibilityState={{ checked: anonymous }}>
            <View style={[styles.checkbox, anonymous && styles.selectedChip]}>{anonymous && <Ionicons name="checkmark" size={15} color="#FFF" />}</View><View><Text style={styles.anonymousTitle}>Post anonymously</Text><Text style={styles.description}>Hide your profile details from public view</Text></View>
          </TouchableOpacity>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting || picking} style={[styles.submitButton, (submitting || picking) && styles.disabled]}><Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text><Ionicons name="send" size={18} color="#FFF" /></TouchableOpacity>
          <TouchableOpacity disabled={submitting || picking} style={styles.saveDraft} onPress={() => { showFeedback('Draft saved', 'Reopen Write a Review to continue. This draft is kept while you stay on this restaurant page.'); onClose(); }}><Text style={styles.saveDraftText}>Save as Draft</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FE' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, alignItems: 'center' },
  title: { fontSize: 19, fontWeight: '700', color: '#252B3F' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  subtitleDot: { width: 7, height: 7, borderRadius: 2, backgroundColor: '#E2788C' },
  subtitle: { fontSize: 9, color: '#7C7E8C', flexShrink: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#B5213B', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFE9EF', borderRadius: 10 },
  feedbackText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#8C1930' },
  dismissFeedback: { padding: 8 },
  contentInner: { paddingHorizontal: 12, paddingBottom: 10, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, gap: 12 },
  restaurantCard: { flexDirection: 'row', alignItems: 'center' },
  restaurantPhoto: { width: 62, height: 62, borderRadius: 9 },
  photoPlaceholder: { backgroundColor: '#F3F1FA', alignItems: 'center', justifyContent: 'center' },
  restaurantInfo: { flex: 1, gap: 4 },
  restaurantName: { fontSize: 17, fontWeight: '700', color: '#252B3F' },
  description: { fontSize: 11, color: '#85808B', lineHeight: 15 },
  supportText: { fontSize: 9, lineHeight: 12, color: '#7E7479' },
  ratingCard: { alignItems: 'center', gap: 8, paddingVertical: 18 },
  label: { fontSize: 10, fontWeight: '600', color: '#927C7C' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ratingText: { fontSize: 19, fontWeight: '700', color: '#252B3F' },
  ratingHint: { fontSize: 11, color: '#BF2945', textAlign: 'center' },
  choiceGroup: { gap: 7 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#F1F2FE', borderRadius: 24, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  selectedChip: { backgroundColor: '#B5213B' },
  chipText: { fontSize: 11, color: '#646879' },
  selectedChipText: { color: '#FFF', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#252B3F', flexShrink: 1 },
  count: { fontSize: 10, color: '#8C7B82' },
  prompts: { gap: 7 },
  prompt: { backgroundColor: '#F0F1FD', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18 },
  promptText: { fontSize: 10, color: '#63697B' },
  commentInput: { minHeight: 114, padding: 12, backgroundColor: '#F2F2FE', borderRadius: 10, fontSize: 13, lineHeight: 20, color: '#474B5E' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaTile: { width: '31%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#F1F2FF', overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 8 },
  removeMedia: { position: 'absolute', top: 3, right: 3, width: 28, height: 28, borderRadius: 14, backgroundColor: '#252B3FCC', alignItems: 'center', justifyContent: 'center' },
  addMedia: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  cameraCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFDDE5', alignItems: 'center', justifyContent: 'center' },
  mediaLabel: { fontSize: 9, fontWeight: '700', color: '#41475B' },
  mediaHintRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  mediaHint: { flex: 1, fontSize: 10, color: '#8C7B82', lineHeight: 14 },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingVertical: 8 },
  checkbox: { width: 23, height: 23, borderRadius: 5, backgroundColor: '#EAEBFF', alignItems: 'center', justifyContent: 'center' },
  anonymousTitle: { fontSize: 13, fontWeight: '700', color: '#252B3F' },
  footer: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#F8F8FE', width: '100%', maxWidth: 600, alignSelf: 'center' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#B5213B', borderRadius: 7, paddingVertical: 15 },
  submitText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  disabled: { opacity: 0.5 },
  saveDraft: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  saveDraftText: { fontSize: 11, color: '#85808B' },
});
