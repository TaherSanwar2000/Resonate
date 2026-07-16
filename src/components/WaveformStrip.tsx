import React from 'react';
import {
  BlurMask,
  Canvas,
  LinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { WAVE_POINTS } from '../audio/usePlayer';
import type { TrackTheme } from '../tracks';

interface Props {
  width: number;
  height?: number;
  wave: SharedValue<number[]>;
  theme: TrackTheme;
}

/** Oscilloscope strip fed by the analyser's time-domain samples. */
export function WaveformStrip({ width, height = 64, wave, theme }: Props) {
  const amp = height * 0.42;
  const mid = height / 2;
  const step = width / (WAVE_POINTS - 1);

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const vals = wave.value;
    p.moveTo(0, mid + vals[0] * amp);
    for (let i = 1; i < WAVE_POINTS; i++) {
      p.lineTo(i * step, mid + vals[i] * amp);
    }
    return p;
  });

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={mid - 0.5} width={width} height={1} color="#ffffff" opacity={0.07} />
      <Path path={path} style="stroke" strokeWidth={4} strokeJoin="round" opacity={0.4}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={[theme.secondary, theme.primary, theme.accent]}
        />
        <BlurMask blur={6} style="normal" />
      </Path>
      <Path path={path} style="stroke" strokeWidth={2} strokeJoin="round">
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={[theme.secondary, theme.primary, theme.accent]}
        />
      </Path>
    </Canvas>
  );
}
