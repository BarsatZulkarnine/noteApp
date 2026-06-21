import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, format } from 'date-fns';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeRow } from '@/components/swipe-row';
import { toast } from '@/components/toast';
import { Card, EmptyState, IconButton, Pill, ScreenTitle, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { GroceryItem } from '@/lib/types';
import { useGroceryStore } from '@/store/groceryStore';

function ExpiryBadge({ at }: { at: number }) {
  const c = useColors();
  const days = differenceInCalendarDays(at, new Date());
  const color = days < 0 ? c.danger : days <= 2 ? c.warning : c.textSecondary;
  const label = days < 0 ? 'expired' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : format(at, 'MMM d');
  return (
    <View style={styles.badge}>
      <Ionicons name="hourglass-outline" size={12} color={color} />
      <Text style={{ color, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export default function GroceryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useGroceryStore((s) => s.items);
  const addItem = useGroceryStore((s) => s.addItem);
  const toggleLow = useGroceryStore((s) => s.toggleLow);
  const deleteItem = useGroceryStore((s) => s.deleteItem);
  const restoreItem = useGroceryStore((s) => s.restoreItem);

  const [draft, setDraft] = useState('');
  const [restockOnly, setRestockOnly] = useState(false);

  const lowCount = items.filter((i) => i.low).length;

  const sections = useMemo(() => {
    const visible = restockOnly ? items.filter((i) => i.low) : items;
    const groups = new Map<string, GroceryItem[]>();
    for (const it of visible) {
      const key = it.category?.trim() || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] === 'Other' ? 1 : b[0] === 'Other' ? -1 : a[0].localeCompare(b[0])))
      .map(([title, data]) => ({ title, data }));
  }, [items, restockOnly]);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    addItem(name);
    setDraft('');
  };

  const remove = (item: GroceryItem) => {
    deleteItem(item.id);
    toast('Item removed', 'Undo', () => restoreItem(item));
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScreenTitle
        right={<IconButton name="basket-outline" onPress={() => router.push('/shopping')} color={lowCount ? c.tint : c.textSecondary} />}
      >
        Grocery
      </ScreenTitle>

      <View style={styles.controls}>
        <View style={[styles.addRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="add" size={22} color={c.textSecondary} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            blurOnSubmit={false}
            returnKeyType="done"
            placeholder="Add item to pantry"
            placeholderTextColor={c.textSecondary}
            style={[styles.addInput, { color: c.text }]}
          />
        </View>
        <View style={styles.pills}>
          <Pill label={`All (${items.length})`} active={!restockOnly} onPress={() => setRestockOnly(false)} />
          <Pill label={`Need to restock (${lowCount})`} active={restockOnly} color={c.warning} onPress={() => setRestockOnly(true)} />
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={sections.length === 0 ? styles.flex : styles.list}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          restockOnly ? (
            <EmptyState icon="checkmark-done-outline" title="Nothing to restock" subtitle="Flag items as running low and they show up here." />
          ) : (
            <EmptyState icon="cart-outline" title="Pantry is empty" subtitle="Add the things you keep stocked at home." />
          )
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: c.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <SwipeRow onDelete={() => remove(item)}>
            <Pressable onPress={() => router.push(`/grocery/${item.id}` as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Card style={[styles.row, item.low && { borderColor: c.warning }]}>
                <Pressable onPress={() => toggleLow(item.id)} hitSlop={8}>
                  <Ionicons name={item.low ? 'alert-circle' : 'ellipse-outline'} size={26} color={item.low ? c.warning : c.textMuted} />
                </Pressable>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                  {item.qty || item.expiryAt ? (
                    <View style={styles.metaRow}>
                      {item.qty ? <Text style={[styles.qty, { color: c.textSecondary }]}>{item.qty}</Text> : null}
                      {item.expiryAt ? <ExpiryBadge at={item.expiryAt} /> : null}
                    </View>
                  ) : null}
                </View>
                {item.low ? <Text style={[styles.lowTag, { color: c.warning }]}>LOW</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Card>
            </Pressable>
          </SwipeRow>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flexGrow: 1 },
  controls: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.three },
  pills: { flexDirection: 'row', gap: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 120 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: Spacing.three, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.two },
  rowText: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  qty: { fontSize: 13 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lowTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
