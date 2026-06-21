/** A row that reveals one or more action buttons when swiped left. */

import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Spacing } from '@/constants/theme';
import { useColors } from './ui';

export type SwipeAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Background color; defaults to the danger color. */
  color?: string;
  onPress: () => void;
};

export function SwipeRow({
  children,
  actions,
  onDelete,
}: {
  children: ReactNode;
  /** Explicit action list. If omitted, a single Delete action (onDelete) is used. */
  actions?: SwipeAction[];
  onDelete?: () => void;
}) {
  const c = useColors();
  const ref = useRef<SwipeableMethods>(null);

  const resolved: SwipeAction[] =
    actions ?? (onDelete ? [{ icon: 'trash', label: 'Delete', color: c.danger, onPress: onDelete }] : []);

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          {resolved.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                ref.current?.close();
                a.onPress();
              }}
              style={[styles.action, { backgroundColor: a.color ?? c.danger }]}
            >
              <Ionicons name={a.icon} size={20} color="#fff" />
              <Text style={styles.label}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  action: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 84,
  },
  label: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
