import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Field, IconButton, SectionLabel, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useGroceryStore } from '@/store/groceryStore';

export default function GroceryItemEditor() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useGroceryStore((s) => s.items.find((i) => i.id === id));
  const updateItem = useGroceryStore((s) => s.updateItem);
  const toggleLow = useGroceryStore((s) => s.toggleLow);
  const setExpiry = useGroceryStore((s) => s.setExpiry);
  const deleteItem = useGroceryStore((s) => s.deleteItem);
  const restoreItem = useGroceryStore((s) => s.restoreItem);
  const [showPicker, setShowPicker] = useState(false);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Text style={{ color: c.textSecondary, padding: Spacing.four }}>Item not found.</Text>
      </View>
    );
  }

  const onExpiryChange = (_: unknown, date?: Date) => {
    setShowPicker(false);
    if (date) {
      const d = new Date(date);
      d.setHours(9, 0, 0, 0);
      setExpiry(item.id, d.getTime());
    }
  };

  const onDelete = () => {
    deleteItem(item.id);
    toast('Item removed', 'Undo', () => restoreItem(item));
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'Item',
          headerRight: () => <IconButton name="trash-outline" color={c.danger} onPress={onDelete} />,
        }}
      />

      <SectionLabel>Name</SectionLabel>
      <Field value={item.name} onChangeText={(t) => updateItem(item.id, { name: t })} placeholder="Item name" />

      <SectionLabel>Category</SectionLabel>
      <Field
        value={item.category ?? ''}
        onChangeText={(t) => updateItem(item.id, { category: t })}
        placeholder="e.g. Produce, Dairy (optional)"
      />

      <SectionLabel>Quantity</SectionLabel>
      <Field
        value={item.qty ?? ''}
        onChangeText={(t) => updateItem(item.id, { qty: t })}
        placeholder="e.g. 2 bags (optional)"
      />

      <SectionLabel>Expiry</SectionLabel>
      <Pressable onPress={() => setShowPicker(true)} style={[styles.dateBtn, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="hourglass-outline" size={20} color={item.expiryAt ? c.tint : c.textSecondary} />
        <Text style={{ color: item.expiryAt ? c.text : c.textSecondary, fontSize: 16, flex: 1 }}>
          {item.expiryAt ? format(item.expiryAt, 'EEE, MMM d') : 'Set expiry date'}
        </Text>
        {item.expiryAt ? <IconButton name="close" size={18} onPress={() => setExpiry(item.id, undefined)} /> : null}
      </Pressable>
      {showPicker ? (
        <DateTimePicker value={item.expiryAt ? new Date(item.expiryAt) : new Date()} mode="date" onChange={onExpiryChange} />
      ) : null}

      <View style={[styles.switchRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 }}>
          <Ionicons name="alert-circle-outline" size={18} color={item.low ? c.warning : c.text} />
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Running low</Text>
        </View>
        <Switch value={item.low} onValueChange={() => toggleLow(item.id)} trackColor={{ true: c.warning }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
});
