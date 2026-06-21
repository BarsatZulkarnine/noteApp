/** Local notification scheduling for recurring todos. */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { RecurringTodo } from './types';

const ANDROID_CHANNEL_ID = 'reminders';

// Show an alert + sound even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionGranted: boolean | null = null;

/** Call once on app start: request permission + create the Android channel. */
export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  permissionGranted = status === 'granted';
  return permissionGranted;
}

export function hasPermission(): boolean {
  return permissionGranted === true;
}

/**
 * Schedule a repeating local notification for a todo.
 * Returns the OS notification id, or undefined if it could not be scheduled.
 */
export async function scheduleRecurring(todo: RecurringTodo): Promise<string | undefined> {
  if (Platform.OS === 'web' || !todo.remindersEnabled) return undefined;

  const { recurrence: r } = todo;
  const hour = Math.floor(r.timeOfDay / 60);
  const minute = r.timeOfDay % 60;

  let trigger: Notifications.NotificationTriggerInput;
  if (r.kind === 'daily') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_CHANNEL_ID,
    };
  } else if (r.kind === 'weekly') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: r.weekday ?? 1,
      hour,
      minute,
      channelId: ANDROID_CHANNEL_ID,
    };
  } else {
    // interval: repeat every N days (approximate, counted from now).
    const days = Math.max(1, r.everyNDays ?? 1);
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: days * 24 * 60 * 60,
      repeats: true,
      channelId: ANDROID_CHANNEL_ID,
    };
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: todo.title || 'Reminder',
        body:
          todo.items.length > 0
            ? `${todo.items.length} item${todo.items.length === 1 ? '' : 's'} to do`
            : 'Time to do this again.',
      },
      trigger,
    });
  } catch (e) {
    console.warn('Failed to schedule notification', e);
    return undefined;
  }
}

export async function cancelReminder(notificationId?: string): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already gone — ignore
  }
}

/**
 * Schedule a single one-off notification at a specific date.
 * Returns the OS notification id, or undefined (past time / web / failure).
 */
export async function scheduleOneOff(
  dateMs: number,
  title: string,
  body: string,
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  if (dateMs <= Date.now()) return undefined;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: title || 'Reminder', body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dateMs,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule one-off reminder', e);
    return undefined;
  }
}

export async function cancelReminders(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => cancelReminder(id)));
}

/**
 * Schedule one daily reminder at each hour in [startHour, endHour] stepping by everyHours.
 * Returns the list of OS notification ids.
 */
export async function scheduleIntervalReminders(
  opts: { enabled: boolean; everyHours: number; startHour: number; endHour: number },
  title: string,
  body: string,
): Promise<string[]> {
  if (Platform.OS === 'web' || !opts.enabled) return [];
  const step = Math.max(1, opts.everyHours);
  const ids: string[] = [];
  for (let h = opts.startHour; h <= opts.endHour; h += step) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: 0,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
      ids.push(id);
    } catch (e) {
      console.warn('Failed to schedule interval reminder', e);
    }
  }
  return ids;
}
