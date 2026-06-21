import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { uid } from '@/lib/id';
import type { Stroke } from '@/lib/types';
import { useNotesStore } from '@/store/notesStore';

const PALETTE = ['#111111', '#E5484D', '#4F86C9', '#4F9D69', '#C98A2B'];
const WIDTHS = [3, 6, 12];

export default function SketchScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const addSketch = useNotesStore((s) => s.addSketch);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  colorRef.current = color;
  widthRef.current = width;
  const pathRef = useRef('');

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        pathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrent(pathRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        pathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrent(pathRef.current);
      },
      onPanResponderRelease: () => {
        const d = pathRef.current;
        if (d.includes('L')) {
          setStrokes((prev) => [...prev, { d, color: colorRef.current, width: widthRef.current }]);
        }
        pathRef.current = '';
        setCurrent('');
      },
    }),
  ).current;

  const save = () => {
    if (strokes.length === 0) return router.back();
    addSketch(id, { id: uid('sk_'), strokes, w: sizeRef.current.w, h: sizeRef.current.h });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          title: 'Draw',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={8}>
              <Text style={{ color: c.tint, fontWeight: '800', fontSize: 16 }}>Save</Text>
            </Pressable>
          ),
        }}
      />

      <View
        style={styles.canvasWrap}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          sizeRef.current = { w: width, h: height };
          setSize({ w: width, h: height });
        }}
        {...responder.panHandlers}
      >
        <Svg width={size.w || '100%'} height={size.h || '100%'} style={StyleSheet.absoluteFill}>
          {strokes.map((s, i) => (
            <Path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {current ? <Path d={current} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </Svg>
      </View>

      <View style={[styles.toolbar, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.group}>
          {PALETTE.map((p) => (
            <Pressable
              key={p}
              onPress={() => setColor(p)}
              style={[styles.swatch, { backgroundColor: p }, color === p && { borderWidth: 3, borderColor: c.text }]}
            />
          ))}
        </View>
        <View style={styles.group}>
          {WIDTHS.map((w) => (
            <Pressable key={w} onPress={() => setWidth(w)} style={[styles.widthBtn, { borderColor: width === w ? c.tint : c.border }]}>
              <View style={{ width: w + 2, height: w + 2, borderRadius: w, backgroundColor: c.text }} />
            </Pressable>
          ))}
        </View>
        <View style={styles.group}>
          <Pressable onPress={() => setStrokes((p) => p.slice(0, -1))} hitSlop={6} style={styles.toolBtn}>
            <Ionicons name="arrow-undo" size={22} color={c.text} />
          </Pressable>
          <Pressable onPress={() => setStrokes([])} hitSlop={6} style={styles.toolBtn}>
            <Ionicons name="trash-outline" size={22} color={c.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: { flex: 1, backgroundColor: '#FFFFFF', margin: Spacing.three, borderRadius: Radius.md, overflow: 'hidden' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  widthBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolBtn: { padding: 6 },
});
