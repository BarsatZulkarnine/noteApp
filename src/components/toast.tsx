/** Lightweight bottom toast with an optional Undo action. */

import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from './ui';

type Toast = { id: number; message: string; actionLabel?: string; onAction?: () => void };

type ToastStore = {
  current: Toast | null;
  show: (message: string, actionLabel?: string, onAction?: () => void) => void;
  dismiss: () => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  current: null,
  show: (message, actionLabel, onAction) =>
    set({ current: { id: Date.now(), message, actionLabel, onAction } }),
  dismiss: () => set({ current: null }),
}));

/** Convenience helper usable outside React. */
export const toast = (message: string, actionLabel?: string, onAction?: () => void) =>
  useToastStore.getState().show(message, actionLabel, onAction);

export function ToastHost() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() =>
        dismiss(),
      );
    }, 3800);
    return () => clearTimeout(t);
  }, [current, opacity, dismiss]);

  if (!current) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 76, opacity }]}
    >
      <View style={[styles.toast, { backgroundColor: c.text }]}>
        <Text style={[styles.msg, { color: c.background }]} numberOfLines={1}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <Pressable
            hitSlop={8}
            onPress={() => {
              current.onAction?.();
              dismiss();
            }}
          >
            <Text style={[styles.action, { color: c.background }]}>{current.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.three, right: Spacing.three, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.full,
    maxWidth: 520,
    width: '100%',
    justifyContent: 'space-between',
  },
  msg: { fontSize: 14, flexShrink: 1 },
  action: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});
