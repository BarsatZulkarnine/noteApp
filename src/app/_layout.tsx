import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/toast';
import { useResolvedScheme } from '@/hooks/use-scheme';
import { setupNotifications } from '@/lib/notifications';
import { useGroceryStore } from '@/store/groceryStore';
import { useHabitsStore } from '@/store/habitsStore';
import { useTodosStore } from '@/store/todosStore';

export default function RootLayout() {
  const scheme = useResolvedScheme();
  const reconcile = useTodosStore((s) => s.reconcile);
  const syncHabits = useHabitsStore((s) => s.syncReminders);
  const reconcilePredictions = useGroceryStore((s) => s.reconcilePredictions);

  useEffect(() => {
    // Ask for permission, reset overdue recurring todos, re-arm reminders,
    // and refresh pantry run-out predictions + restock alerts.
    (async () => {
      await setupNotifications();
      await reconcile();
      await syncHabits();
      await reconcilePredictions();
    })();
  }, [reconcile, syncHabits, reconcilePredictions]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
            <Stack.Screen name="sketch/[id]" options={{ title: 'Draw' }} />
            <Stack.Screen name="todo/[id]" options={{ title: 'Recurring todo' }} />
            <Stack.Screen name="grocery/[id]" options={{ title: 'Item' }} />
            <Stack.Screen name="shopping" options={{ title: 'Shopping' }} />
            <Stack.Screen name="scan" options={{ title: 'Scan barcode' }} />
            <Stack.Screen name="habits/new" options={{ title: 'New habit', presentation: 'modal' }} />
            <Stack.Screen name="habits/[id]" options={{ title: 'Habit' }} />
            <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
          </Stack>
          <ToastHost />
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
