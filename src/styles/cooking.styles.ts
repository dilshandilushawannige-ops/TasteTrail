import { StyleSheet } from 'react-native';

export const cookingStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scroll: {
    padding: 20,
    paddingBottom: 80,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },

  between: {
    justifyContent: 'space-between',
  },

  label: {
    color: '#E8505B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  title: {
    color: '#202536',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 35,
  },

  muted: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E3',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },

  heading: {
    color: '#202536',
    fontSize: 20,
    fontWeight: '700',
  },

  text: {
    color: '#303746',
    fontSize: 17,
    lineHeight: 28,
  },

  instruction: {
    color: '#202536',
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '500',
  },

  tabs: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#EEEDE9',
    padding: 4,
    gap: 4,
  },

  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  tabActive: {
    backgroundColor: '#FFFFFF',
  },

  tabText: {
    color: '#414958',
    fontSize: 15,
    fontWeight: '600',
  },

  button: {
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  secondary: {
    backgroundColor: '#EEEDE9',
  },

  secondaryText: {
    color: '#303746',
  },

  disabled: {
    opacity: 0.45,
  },

  flex: {
    flex: 1,
  },

  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F3E7E8',
    overflow: 'hidden',
  },

  fill: {
    height: 7,
    backgroundColor: '#E8505B',
  },

  timer: {
    color: '#202536',
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  input: {
    borderWidth: 1,
    borderColor: '#D8DADD',
    borderRadius: 10,
    minHeight: 48,
    padding: 12,
    color: '#202536',
    backgroundColor: '#FFFFFF',
    minWidth: 85,
  },

  errorBox: {
    padding: 16,
    backgroundColor: '#FFF0EF',
    borderRadius: 14,
    gap: 12,
  },

  error: {
    color: '#B42318',
    fontSize: 14,
    lineHeight: 22,
  },

  danger: {
    color: '#B42318',
    fontWeight: '700',
    fontSize: 14,
  },

  success: {
    color: '#24735C',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Recipe photo ────────────────────────────────────────────────────────────

  recipeImageWrapper: {
    // Sits between the recipe title and the ingredient/steps tabs.
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0EFEA', // neutral cream — visible while loading
    // Enforce a 16:9 aspect ratio that works on all screen widths.
    aspectRatio: 16 / 9,
    width: '100%',
  },

  recipeImage: {
    width: '100%',
    height: '100%',
  },

  recipeImagePlaceholder: {
    // Shown while the image is loading or when no imageUrl is available.
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F0EFEA',
  },

  recipeImagePlaceholderIcon: {
    // The coral restaurant icon inside the placeholder.
    opacity: 0.45,
  },

  recipeImagePlaceholderText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    minHeight: 44,
  },

  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#202536',
    flex: 1,
    textAlign: 'center',
  },

  // ── Progress Bar ──────────────────────────────────────────────────────
  progressBarContainer: {
    height: 4,
    backgroundColor: '#F3E7E8',
    width: '100%',
    overflow: 'hidden',
    marginTop: 8,
  },

  progressBarFill: {
    height: 4,
    backgroundColor: '#E8505B',
  },

  stepBadgeContainer: {
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },

  stepBadge: {
    backgroundColor: '#FFF0EF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  stepBadgeText: {
    color: '#E8505B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Steps Card ────────────────────────────────────────────────────────
  stepsCard: {
    gap: 16,
  },

  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E3',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },

  instructionLabel: {
    color: '#E8505B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  instructionText: {
    color: '#202536',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '500',
  },

  voiceControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },

  voiceControlLabel: {
    color: '#303746',
    fontSize: 15,
    fontWeight: '500',
  },

  playAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8505B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },

  playAudioButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Timer Card ────────────────────────────────────────────────────────
  timerCard: {
    backgroundColor: '#F7F7F5',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },

  timerCardLabel: {
    color: '#303746',
    fontSize: 15,
    fontWeight: '600',
  },

  timerDigital: {
    color: '#202536',
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },

  timerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D8DADD',
    borderRadius: 10,
    minHeight: 48,
    padding: 12,
    color: '#202536',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },

  // ── Mini Player ───────────────────────────────────────────────────────
  miniPlayer: {
    backgroundColor: '#2C2C2C',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  miniPlayerThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },

  miniPlayerInfo: {
    flex: 1,
    gap: 2,
  },

  miniPlayerStep: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  miniPlayerRecipe: {
    color: '#B0B0B0',
    fontSize: 13,
  },

  miniPlayerStatus: {
    color: '#E8505B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  miniPlayerControls: {
    flexDirection: 'row',
    gap: 8,
  },

  miniPlayerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#404040',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Bottom Navigation ─────────────────────────────────────────────────
  bottomNavigation: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  bottomNavPrevious: {
    flex: 1,
  },

  bottomNavNext: {
    flex: 2,
  },

  // ── Delete Session Link ───────────────────────────────────────────────
  deleteSessionLink: {
    color: '#E8505B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    textDecorationLine: 'underline',
  },
});