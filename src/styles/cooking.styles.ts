import { StyleSheet } from 'react-native';

export const cookingStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 18,
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
});