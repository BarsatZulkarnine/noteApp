import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/**
 * A Pressable that springs down slightly while pressed — a small tactile pop
 * for primary action buttons. Pairs well with a haptic in `onPress`.
 */
export function Pop({
  children,
  onPress,
  style,
  hitSlop,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.86, { damping: 12, stiffness: 320 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 320 }))}
      onPress={onPress}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
