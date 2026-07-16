import React, { useEffect } from 'react';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { NUM_BARS } from '../audio/usePlayer';
import type { TrackTheme } from '../tracks';
import { ArtLayers } from './AlbumArt';

interface Props {
  size: number;
  theme: TrackTheme;
  artSeed: number;
  playing: boolean;
  bars: SharedValue<number[]>;
  level: SharedValue<number>;
  progress: SharedValue<number>;
}

/**
 * The centerpiece: 64 FFT bars radiating from a spinning generative album
 * disc, wrapped in a playback-progress ring. Bar geometry is rebuilt every
 * frame on the UI thread from the shared magnitudes.
 */
export function Visualizer({ size, theme, artSeed, playing, bars, level, progress }: Props) {
  const c = size / 2;
  const artR = size * 0.26;
  const ringR = artR + 12;
  const barInner = ringR + 14;
  const barMax = c - barInner - 8;

  // ------------------------------------------------------------- geometry
  const barsPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const vals = bars.value;
    for (let i = 0; i < NUM_BARS; i++) {
      const a = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const len = 2.5 + vals[i] * barMax;
      p.moveTo(c + cos * barInner, c + sin * barInner);
      p.lineTo(c + cos * (barInner + len), c + sin * (barInner + len));
    }
    return p;
  });

  const progressPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addArc(
      { x: c - ringR, y: c - ringR, width: ringR * 2, height: ringR * 2 },
      -90,
      Math.min(Math.max(progress.value, 0), 1) * 360,
    );
    return p;
  });

  // -------------------------------------------------------------- motion
  const rotation = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 24000, easing: Easing.linear }),
        -1,
      );
    } else {
      cancelAnimation(rotation);
    }
  }, [playing, rotation]);

  const discTransform = useDerivedValue(() => [
    { rotate: (rotation.value * Math.PI) / 180 },
  ]);
  const pulseTransform = useDerivedValue(() => [
    { scale: 1 + level.value * 0.07 },
  ]);
  const glowOpacity = useDerivedValue(() => 0.18 + level.value * 0.4);

  const center = vec(c, c);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* ambient glow that breathes with the bass */}
      <Circle cx={c} cy={c} r={artR + 10} color={theme.primary} opacity={glowOpacity}>
        <BlurMask blur={34} style="normal" />
      </Circle>

      {/* FFT bars — soft glow pass underneath a crisp pass */}
      <Path path={barsPath} style="stroke" strokeWidth={5} strokeCap="round" opacity={0.45}>
        <SweepGradient
          c={center}
          colors={[theme.primary, theme.accent, theme.secondary, theme.primary]}
        />
        <BlurMask blur={7} style="normal" />
      </Path>
      <Path path={barsPath} style="stroke" strokeWidth={3} strokeCap="round">
        <SweepGradient
          c={center}
          colors={[theme.primary, theme.accent, theme.secondary, theme.primary]}
        />
      </Path>

      {/* progress ring */}
      <Circle
        cx={c}
        cy={c}
        r={ringR}
        style="stroke"
        strokeWidth={3}
        color="#ffffff"
        opacity={0.08}
      />
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={theme.accent}
      />

      {/* spinning album disc, pulsing with bass energy */}
      <Group origin={center} transform={pulseTransform}>
        <Group origin={center} transform={discTransform}>
          <ArtLayers theme={theme} seed={artSeed} cx={c} cy={c} radius={artR} />
        </Group>
        <Circle
          cx={c}
          cy={c}
          r={artR}
          style="stroke"
          strokeWidth={1}
          color="#ffffff"
          opacity={0.18}
        />
      </Group>
    </Canvas>
  );
}
