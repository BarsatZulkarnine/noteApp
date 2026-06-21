/** Small reusable UI primitives themed from constants/theme. */

import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function useColors() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

export function ScreenTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.titleRow}>
      <Text style={[styles.title, { color: c.text }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Checkbox({ checked, color }: { checked: boolean; color?: string }) {
  const c = useColors();
  const tint = color ?? c.tint;
  return (
    <View
      style={[
        styles.checkbox,
        { borderColor: checked ? tint : c.border, backgroundColor: checked ? tint : 'transparent' },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={16} color={c.onTint} /> : null}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  size = 22,
  hitSlop = 10,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  hitSlop?: number;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={hitSlop} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <Ionicons name={name} size={size} color={color ?? c.textSecondary} />
    </Pressable>
  );
}

export function Fab({ onPress, icon = 'add' }: { onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { backgroundColor: c.tint, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name={icon} size={28} color={c.onTint} />
    </Pressable>
  );
}

export function Field(props: TextInputProps & { style?: TextStyle }) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.textSecondary}
      {...props}
      style={[
        styles.field,
        { color: c.text, backgroundColor: c.card, borderColor: c.border },
        props.style,
      ]}
    />
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={c.textSecondary} />
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySub, { color: c.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Pill({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const c = useColors();
  const tint = color ?? c.tint;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? tint : c.backgroundElement,
          borderColor: active ? tint : c.border,
        },
      ]}
    >
      <Text style={{ color: active ? c.onTint : c.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{children}</Text>;
}

export function ProgressBar({ value, color, height = 10 }: { value: number; color?: string; height?: number }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { backgroundColor: c.backgroundElement, height, borderRadius: height }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          backgroundColor: color ?? c.tint,
          borderRadius: height,
        }}
      />
    </View>
  );
}

export function WeekBars({ data, goal }: { data: { label: string; value: number; today?: boolean }[]; goal: number }) {
  const c = useColors();
  return (
    <View style={styles.weekRow}>
      {data.map((d, i) => {
        const pct = goal > 0 ? Math.min(1, d.value / goal) : 0;
        const met = d.value >= goal && goal > 0;
        return (
          <View key={i} style={styles.weekCol}>
            <View style={[styles.barTrack, { backgroundColor: c.backgroundElement }]}>
              <View
                style={{
                  height: `${Math.max(pct * 100, d.value > 0 ? 6 : 0)}%`,
                  width: '100%',
                  backgroundColor: met ? c.success : c.tint,
                  borderRadius: 4,
                }}
              />
            </View>
            <Text style={[styles.weekLabel, { color: d.today ? c.text : c.textMuted, fontWeight: d.today ? '800' : '500' }]}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={c.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: Spacing.two },
  emptySub: { fontSize: 14, textAlign: 'center' },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  track: { width: '100%', overflow: 'hidden' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  weekCol: { flex: 1, alignItems: 'center', gap: Spacing.one },
  barTrack: { width: '70%', height: 64, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  weekLabel: { fontSize: 11 },
});
