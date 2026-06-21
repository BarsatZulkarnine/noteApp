import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Checkbox, EmptyState, useColors } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useGroceryStore } from '@/store/groceryStore';

export default function ShoppingScreen() {
  const c = useColors();
  const items = useGroceryStore((s) => s.items);
  const toggleLow = useGroceryStore((s) => s.toggleLow);

  const low = useMemo(
    () => items.filter((i) => i.low).sort((a, b) => (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz')),
    [items],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: 'Shopping' }} />
      {low.length === 0 ? (
        <EmptyState icon="checkmark-done-circle-outline" title="All stocked up" subtitle="Items you flag as running low will appear here to shop." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.count, { color: c.textSecondary }]}>{low.length} to buy</Text>
          {low.map((item) => (
            <Pressable key={item.id} onPress={() => toggleLow(item.id)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Card style={styles.row}>
                <Checkbox checked={false} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
                  {item.qty || item.category ? (
                    <Text style={[styles.meta, { color: c.textSecondary }]}>
                      {[item.category, item.qty].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
          <Text style={[styles.hint, { color: c.textMuted }]}>Tap an item to check it off — it clears the “low” flag.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  count: { fontSize: 14, fontWeight: '600', marginBottom: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { fontSize: 18, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 2 },
  hint: { fontSize: 13, textAlign: 'center', marginTop: Spacing.three },
});
