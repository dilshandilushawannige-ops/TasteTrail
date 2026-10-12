import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StatusBar, StyleSheet, View } from 'react-native';

export function AppLoader({ loading = true }: { loading?: boolean }) {
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
  }, []);

  useEffect(() => {
    if (loading) return;
    const remaining = Math.max(0, 400 - (Date.now() - startedAt));
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, remaining);
    return () => clearTimeout(timer);
  }, [loading, opacity, startedAt]);

  if (!visible) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#E8505B" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 10000, backgroundColor: '#FFFFFF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
