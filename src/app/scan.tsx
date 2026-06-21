import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { EmptyState, Field, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { lookupBarcode } from '@/lib/lookup';
import type { GroceryItem } from '@/lib/types';
import { useGroceryStore } from '@/store/groceryStore';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

/** Most recent purchase qty for an item, to prefill the "bought" amount. */
function lastPurchaseQty(item: GroceryItem): string {
  const last = [...(item.events ?? [])]
    .filter((e) => e.kind === 'purchase' && e.qty != null)
    .sort((a, b) => b.at - a.at)[0];
  return last?.qty != null ? String(last.qty) : '';
}

type Resolved =
  | { mode: 'known'; code: string; item: GroceryItem }
  | { mode: 'new'; code: string; suggestedName: string };

export default function ScanScreen() {
  const c = useColors();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const resolveBarcode = useGroceryStore((s) => s.resolveBarcode);
  const recordEvent = useGroceryStore((s) => s.recordEvent);
  const addBarcode = useGroceryStore((s) => s.addBarcode);
  const addItem = useGroceryStore((s) => s.addItem);
  const setEstimate = useGroceryStore((s) => s.setEstimate);

  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  // Form fields used by the result sheet.
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [amount, setAmount] = useState('');

  const header = <Stack.Screen options={{ title: 'Scan barcode' }} />;

  // --- Web / unsupported: no camera. Manual add lives on the Grocery tab. ---
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        {header}
        <EmptyState
          icon="phone-portrait-outline"
          title="Scanning is device-only"
          subtitle="Open the app on your phone to scan barcodes. You can still add items by hand from the Grocery tab."
        />
      </View>
    );
  }

  const onScanned = async ({ data }: { data: string }) => {
    if (lock.current || resolved) return;
    lock.current = true;
    setBusy(true);
    const code = data.trim();

    const existing = resolveBarcode(code);
    if (existing) {
      setResolved({ mode: 'known', code, item: existing });
      setAmount(lastPurchaseQty(existing));
      setUnit(existing.unit ?? '');
      setBusy(false);
      return;
    }

    const info = await lookupBarcode(code); // null when offline / no hit
    setResolved({ mode: 'new', code, suggestedName: info?.name ?? '' });
    setName(info?.name ?? '');
    setBusy(false);
  };

  const reset = () => {
    setResolved(null);
    setName('');
    setUnit('');
    setAmount('');
    lock.current = false;
  };

  const qtyNum = () => {
    const n = Number(amount.trim());
    return amount.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const confirmKnown = async (item: GroceryItem) => {
    await recordEvent(item.id, 'purchase', qtyNum());
    toast(`Logged purchase of ${item.name}`);
    router.back();
  };

  const confirmNew = async (code: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast('Give the item a name first');
      return;
    }
    const id = addItem(trimmed);
    addBarcode(id, code);
    if (unit.trim()) await setEstimate(id, { unit: unit.trim() });
    await recordEvent(id, 'purchase', qtyNum());
    toast(`Added ${trimmed} to pantry`);
    router.replace(`/grocery/${id}`);
  };

  // --- Result sheet (after a scan) ---
  if (resolved) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.sheet}>
        {header}
        <View style={[styles.codeChip, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
          <Ionicons name="barcode-outline" size={16} color={c.textSecondary} />
          <Text style={{ color: c.textSecondary, fontSize: 13 }}>{resolved.code}</Text>
        </View>

        {resolved.mode === 'known' ? (
          <>
            <Text style={[styles.title, { color: c.text }]}>{resolved.item.name}</Text>
            <Text style={{ color: c.textSecondary }}>Already tracked — log a purchase.</Text>
            <Text style={[styles.label, { color: c.textSecondary }]}>
              Amount{resolved.item.unit ? ` (${resolved.item.unit})` : ''}
            </Text>
            <Field value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 2" />
            <Primary label="Log purchase" onPress={() => confirmKnown(resolved.item)} />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: c.text }]}>
              {resolved.suggestedName ? 'New item' : 'Unknown barcode'}
            </Text>
            <Text style={{ color: c.textSecondary }}>
              {resolved.suggestedName
                ? 'Found online — confirm and add it.'
                : "Couldn't look this up. Name it and add it manually."}
            </Text>
            <Text style={[styles.label, { color: c.textSecondary }]}>Name</Text>
            <Field value={name} onChangeText={setName} placeholder="Item name" />
            <Text style={[styles.label, { color: c.textSecondary }]}>Unit (optional)</Text>
            <Field value={unit} onChangeText={setUnit} placeholder="dozen, loaf, L…" />
            <Text style={[styles.label, { color: c.textSecondary }]}>Amount bought (optional)</Text>
            <Field value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 2" />
            <Primary label="Add to pantry" onPress={() => confirmNew(resolved.code)} />
          </>
        )}

        <Pressable onPress={reset} style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="scan-outline" size={18} color={c.tint} />
          <Text style={{ color: c.tint, fontWeight: '600', fontSize: 15 }}>Scan another</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // --- Permission gate ---
  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        {header}
        <ActivityIndicator color={c.tint} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        {header}
        <View style={styles.center}>
          <EmptyState
            icon="camera-outline"
            title="Camera access needed"
            subtitle="Allow the camera to scan grocery barcodes."
          />
          <Primary label="Grant camera access" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  // --- Live camera ---
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {header}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={busy ? undefined : onScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.reticle, { borderColor: '#fff' }]} />
        <Text style={styles.hint}>{busy ? 'Looking up…' : 'Point at a barcode'}</Text>
      </View>
    </View>
  );
}

function Primary({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primary, { backgroundColor: c.tint, opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={{ color: c.onTint, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  sheet: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  title: { fontSize: 24, fontWeight: '800', marginTop: Spacing.two },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: Spacing.two },
  primary: {
    marginTop: Spacing.three,
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  secondary: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  reticle: { width: 240, height: 150, borderWidth: 3, borderRadius: Radius.md, opacity: 0.9 },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
});
