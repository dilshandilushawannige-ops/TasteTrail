import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebaseConfig';
import { Review, ReviewMedia } from '@/types/review';
import { addReviewComment, deleteReview, reviewErrorMessage, subscribeToReviewComments, toggleReviewHelpful, type ReviewComment } from '@/services/reviewService';

interface ReviewCardProps { review: Review; signatureDish?: string; }
function relativeDate(date: Date) {
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
export function ReviewCard({ review, signatureDish }: ReviewCardProps) {
  const [preview, setPreview] = useState<ReviewMedia | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const uid = auth.currentUser?.uid;
  const helpful = !!uid && !!review.helpfulUserIds?.includes(uid);
  const name = review.anonymous ? 'Anonymous' : review.userName;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  useEffect(() => {
    if (!showComments) return;
    return subscribeToReviewComments(review.id, setComments, err => setError(err.message));
  }, [review.id, showComments]);
  const perform = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await action(); }
    catch (err) { setError(reviewErrorMessage(err)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const openMedia = async (media: ReviewMedia) => {
    if (media.type === 'image') setPreview(media);
    else {
      try { await Linking.openURL(media.url); }
      catch { setError('Unable to open this video. Please try again.'); }
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!review.anonymous && review.userAvatar ? <Image source={{ uri: review.userAvatar }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{initials || 'TT'}</Text></View>}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.stars}>{[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={13} color="#FFB51A" />)}</View>
            <Text style={styles.date}>· {relativeDate(review.createdAt)}</Text>
          </View>
        </View>
        {uid === review.userId && <TouchableOpacity accessibilityLabel="Review options" onPress={() => setMenuOpen(value => !value)} style={styles.options}><Ionicons name="ellipsis-horizontal" size={19} color="#8D9DB7" /></TouchableOpacity>}
      </View>
      {menuOpen && <View style={styles.menu}>
        <Text style={styles.menuText}>Delete your review?</Text>
        <TouchableOpacity disabled={busy} onPress={() => perform(() => deleteReview(review.id))}><Text style={styles.deleteText}>{busy ? 'Deleting...' : 'Delete'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuOpen(false)}><Text style={styles.date}>Cancel</Text></TouchableOpacity>
      </View>}
      <View style={styles.tags}>{[review.diningType, review.mealTime].filter(Boolean).map((tag, index) => <View key={`${tag}-${index}`} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}</View>
      <Text style={styles.comment}>{review.comment}</Text>
      {!!review.media?.length && <View style={styles.attachments}>
        {review.media.map((media, index) => <TouchableOpacity key={`${media.url}-${index}`} style={styles.thumbnail} accessibilityLabel={`Open review ${media.type} ${index + 1}`} onPress={() => openMedia(media)}>
          {media.type === 'image' ? <Image source={{ uri: media.url }} style={styles.thumbnailImage} /> : <View style={styles.video}><Ionicons name="play-circle" size={32} color="#B5213B" /><Text style={styles.tagText}>Video</Text></View>}
        </TouchableOpacity>)}
        {!!signatureDish && <View style={styles.dishTile}><Ionicons name="restaurant-outline" size={19} color="#DF7B08" /><Text style={styles.dishText}>{signatureDish}</Text></View>}
      </View>}
      <View style={styles.footer}>
        <TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityState={{ selected: helpful }} onPress={() => perform(() => toggleReviewHelpful(review.id))} style={styles.footerAction}>
          <Ionicons name={helpful ? 'thumbs-up' : 'thumbs-up-outline'} size={15} color={helpful ? '#B5213B' : '#8191AC'} /><Text style={[styles.actionText, helpful && styles.selectedText]}>Helpful ({review.helpfulUserIds?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowComments(value => !value)} style={styles.footerAction}><Ionicons name="chatbubble-outline" size={15} color="#8191AC" /><Text style={styles.actionText}>Comment</Text></TouchableOpacity>
      </View>
      {showComments && <View style={styles.commentArea}>
        {comments.map(reply => <View key={reply.id} style={styles.reply}><Text style={styles.replyName}>{reply.userName}</Text><Text style={styles.replyText}>{reply.text}</Text></View>)}
        <TextInput value={comment} onChangeText={setComment} placeholder="Write a comment..." placeholderTextColor="#8191AC" multiline maxLength={500} editable={!busy} style={styles.commentInput} accessibilityLabel="Comment on review" />
        <TouchableOpacity disabled={busy || !comment.trim()} onPress={() => perform(async () => { await addReviewComment(review.id, comment); setComment(''); })} style={styles.postComment}><Text style={styles.selectedText}>{busy ? 'Posting...' : 'Post comment'}</Text></TouchableOpacity>
      </View>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.preview}>
          <TouchableOpacity accessibilityLabel="Close review photo" style={styles.closePreview} onPress={() => setPreview(null)}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
          {preview && <Image source={{ uri: preview.url }} resizeMode="contain" style={styles.previewImage} />}
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderRadius: 17, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F65B73', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  userDetails: { flex: 1, gap: 5 },
  userName: { color: '#1B2236', fontSize: 15, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stars: { flexDirection: 'row', gap: 1 },
  date: { color: '#8D9DB7', fontSize: 11 },
  options: { padding: 8, alignSelf: 'flex-start' },
  tags: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  tag: { backgroundColor: '#F4F7FB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 11, color: '#7687A2' },
  comment: { color: '#54627B', fontSize: 13, lineHeight: 21 },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  thumbnail: { width: 82, height: 82, borderRadius: 13, borderWidth: 1, borderColor: '#EAF0F8', overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%' },
  video: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5FF', gap: 4 },
  dishTile: { width: 82, minHeight: 82, borderRadius: 13, backgroundColor: '#FFFBEA', borderColor: '#FFF0C6', borderWidth: 1, padding: 8, alignItems: 'center', justifyContent: 'center', gap: 6 },
  dishText: { fontSize: 11, lineHeight: 15, color: '#C96604', textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
  actionText: { fontSize: 12, color: '#8191AC' },
  selectedText: { color: '#B5213B', fontSize: 12, fontWeight: '600' },
  menu: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingVertical: 12 },
  menuText: { fontSize: 12, color: '#54627B' },
  deleteText: { fontSize: 12, color: '#B5213B', fontWeight: '700' },
  commentArea: { gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F3FA', paddingTop: 12 },
  reply: { gap: 3 },
  replyName: { fontSize: 12, color: '#1B2236', fontWeight: '600' },
  replyText: { fontSize: 12, lineHeight: 18, color: '#54627B' },
  commentInput: { backgroundColor: '#F5F7FC', borderRadius: 8, padding: 10, minHeight: 60, fontSize: 13, color: '#54627B', textAlignVertical: 'top' },
  postComment: { alignSelf: 'flex-end', padding: 8 },
  error: { color: '#B5213B', fontSize: 12, lineHeight: 18, marginTop: 8 },
  preview: { flex: 1, backgroundColor: '#000E', justifyContent: 'center' },
  closePreview: { position: 'absolute', top: 50, right: 20, zIndex: 1, padding: 8 },
  previewImage: { width: '100%', height: '80%' },
});
