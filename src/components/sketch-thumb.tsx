import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';
import { Radius } from '@/constants/theme';
import type { Sketch } from '@/lib/types';

/** Renders a saved sketch scaled into a fixed-size white tile. */
export function SketchThumb({ sketch, size = 96 }: { sketch: Sketch; size?: number }) {
  const w = sketch.w || size;
  const h = sketch.h || size;
  return (
    <View style={{ width: size, height: size, borderRadius: Radius.sm, backgroundColor: '#fff', overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${w} ${h}`}>
        {sketch.strokes.map((s, i) => (
          <Path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    </View>
  );
}
