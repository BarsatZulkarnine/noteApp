import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, formatDistanceToNow } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { Field, IconButton, SectionLabel, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { predictRunOutAt, runOutInDays } from '@/lib/prediction';
import type { PantryEvent, PantryEventKind } from '@/lib/types';
import { useGroceryStore } from '@/store/groceryStore';

const EVENT_META: Record<PantryEventKind, { label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }> = {
  purchase: { label: 'Bought', icon: 'cart-outline' },
  ranout: { label: 'Ran out', icon: 'alert-circle-outline' },
  low: { label: 'Running low', icon: 'trending-down-outline' },
  remaining: { label: 'Remaining', icon: 'cube-outline' },
};

export default function GroceryItemEditor() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useGroceryStore((s) => s.items.find((i) => i.id === id));
  const allItems = useGroceryStore((s) => s.items);
  const updateItem = useGroceryStore((s) => s.updateItem);
  const toggleLow = useGroceryStore((s) => s.toggleLow);
  const setExpiry = useGroceryStore((s) => s.setExpiry);
  const setEstimate = useGroceryStore((s) => s.setEstimate);
  const recordEvent = useGroceryStore((s) => s.recordEvent);
  const mergeItems = useGroceryStore((s) => s.mergeItems);
  const deleteItem = useGroceryStore((s) => s.deleteItem);
  const restoreItem = useGroceryStore((s) => s.restoreItem);

  const [showPicker, setShowPicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [showMerge, setShowMerge] = useState(false);

  // Candidates for "merge into": any other item (single-user dedup, units optional).
  const mergeTargets = useMemo(
    () => allItems.filter((i) => i.id !== id),
    [allItems, id],
  );

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Text style={{ color: c.textSecondary, padding: Spacing.four }}>Item not found.</Text>
      </View>
    );
  }

  const unit = item.unit?.trim() || 'units';
  const events = [...(item.events ?? [])].sort((a, b) => b.at - a.at);
  const runOut = predictRunOutAt(item, Date.now());
  const days = runOutInDays(item, Date.now());

  const onExpiryChange = (_: unknown, date?: Date) => {
    setShowPicker(false);
    if (date) {
      const d = new Date(date);
      d.setHours(9, 0, 0, 0);
      setExpiry(item.id, d.getTime());
    }
  };

  const log = (kind: PantryEventKind) => {
    const qty = amount.trim() ? Number(amount.trim()) : undefined;
    if ((kind === 'purchase' || kind === 'remaining') && (qty == null || !Number.isFinite(qty) || qty <= 0)) {
      toast(`Enter an amount (in ${unit}) first`);
      return;
    }
    recordEvent(item.id, kind, qty);
    setAmount('');
    toast(`${EVENT_META[kind].label} logged`);
  };

  const onMerge = async (targetId: string, targetName: string) => {
    setShowMerge(false);
    const res = await mergeItems(item.id, targetId);
    if (!res.ok) {
      toast(res.reason ?? 'Could not merge');
      return;
    }
    toast(`Merged into ${targetName}`);
    router.replace(`/grocery/${targetId}`);
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

      {/* ---- Predictive restock ---- */}
      <Text style={[styles.heading, { color: c.text }]}>Pantry tracking</Text>

      <View style={[styles.predict, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons
          name={runOut == null ? 'hourglass-outline' : days != null && days < 0 ? 'alert-circle' : 'time-outline'}
          size={20}
          color={runOut == null ? c.textSecondary : days != null && days <= (item.leadTimeDays ?? 2) ? c.warning : c.tint}
        />
        <Text style={{ color: c.text, fontSize: 15, flex: 1 }}>
          {runOut == null
            ? 'Learning your usage — log a couple of purchases and run-outs.'
            : days != null && days < 0
              ? `Likely out already (${format(runOut, 'MMM d')}).`
              : `Runs out in ~${days} day${days === 1 ? '' : 's'} (${format(runOut, 'MMM d')}).`}
        </Text>
      </View>

      <SectionLabel>Log activity</SectionLabel>
      <Field
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder={`Amount in ${unit} (e.g. 2)`}
      />
      <View style={styles.actions}>
        <ActionButton icon="cart" label="Bought" onPress={() => log('purchase')} />
        <ActionButton icon="cube" label="Remaining" onPress={() => log('remaining')} />
        <ActionButton icon="alert-circle" label="Ran out" tint={c.warning} onPress={() => log('ranout')} />
      </View>

      <SectionLabel>Estimate</SectionLabel>
      <View style={styles.estimateRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subLabel, { color: c.textSecondary }]}>Unit</Text>
          <Field
            value={item.unit ?? ''}
            onChangeText={(t) => setEstimate(item.id, { unit: t })}
            placeholder="dozen, loaf, L…"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subLabel, { color: c.textSecondary }]}>Buy ahead (days)</Text>
          <Field
            value={item.leadTimeDays != null ? String(item.leadTimeDays) : ''}
            onChangeText={(t) => {
              const n = Number(t.trim());
              setEstimate(item.id, { leadTimeDays: t.trim() && Number.isFinite(n) && n >= 0 ? n : undefined });
            }}
            keyboardType="numeric"
            placeholder="2"
          />
        </View>
      </View>
      <Text style={[styles.subLabel, { color: c.textSecondary, marginTop: Spacing.two }]}>
        Starting guess: how much you use per day ({unit}/day)
      </Text>
      <Field
        value={item.initialRatePerDay != null ? String(item.initialRatePerDay) : ''}
        onChangeText={(t) => {
          const n = Number(t.trim());
          setEstimate(item.id, { initialRatePerDay: t.trim() && Number.isFinite(n) && n > 0 ? n : undefined });
        }}
        keyboardType="numeric"
        placeholder="e.g. 0.3 — used until it learns from your history"
      />

      {item.barcodes && item.barcodes.length > 0 ? (
        <>
          <SectionLabel>Barcodes</SectionLabel>
          {item.barcodes.map((code) => (
            <View key={code} style={[styles.chip, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
              <Ionicons name="barcode-outline" size={16} color={c.textSecondary} />
              <Text style={{ color: c.text, fontSize: 14 }}>{code}</Text>
            </View>
          ))}
        </>
      ) : null}

      {mergeTargets.length > 0 ? (
        <>
          <SectionLabel>Merge</SectionLabel>
          <Pressable
            onPress={() => setShowMerge((v) => !v)}
            style={[styles.dateBtn, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Ionicons name="git-merge-outline" size={20} color={c.textSecondary} />
            <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>Merge this into another item…</Text>
            <Ionicons name={showMerge ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
          </Pressable>
          {showMerge
            ? mergeTargets.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => onMerge(t.id, t.name)}
                  style={({ pressed }) => [
                    styles.mergeOption,
                    { backgroundColor: c.backgroundElement, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="arrow-forward" size={16} color={c.tint} />
                  <Text style={{ color: c.text, fontSize: 15, flex: 1 }}>{t.name}</Text>
                </Pressable>
              ))
            : null}
        </>
      ) : null}

      {events.length > 0 ? (
        <>
          <SectionLabel>History</SectionLabel>
          {events.slice(0, 12).map((e: PantryEvent) => (
            <View key={e.id} style={styles.historyRow}>
              <Ionicons name={EVENT_META[e.kind].icon} size={16} color={c.textSecondary} />
              <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>
                {EVENT_META[e.kind].label}
                {e.qty != null ? ` · ${e.qty} ${unit}` : ''}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{formatDistanceToNow(e.at, { addSuffix: true })}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={tint ?? c.tint} />
      <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
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
  heading: { fontSize: 20, fontWeight: '800', marginTop: Spacing.five, marginBottom: Spacing.one },
  predict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  estimateRow: { flexDirection: 'row', gap: Spacing.two },
  subLabel: { fontSize: 12, marginBottom: Spacing.one },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  mergeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
});
