/**
 * Thin wrapper around expo-haptics. No-ops on web and swallows errors so a
 * missing haptics engine never breaks an interaction. Use for small, tactile
 * confirmations — completing a habit, toggling a panel, picking an option.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

function run(fn: () => Promise<void>) {
  if (!enabled) return;
  fn().catch(() => {});
}

export const haptics = {
  /** Light tap — incremental actions (e.g. +1). */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Selection tick — toggles, segmented choices. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Success buzz — a habit goal met / completed. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
