import React, { useMemo } from 'react';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';

import type { TrackTheme } from '../tracks';

/** Tiny deterministic PRNG so each track gets stable generative art. */
/* eslint-disable no-bitwise */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */

interface Blob {
  x: number;
  y: number;
  r: number;
  color: string;
}

export function makeBlobs(theme: TrackTheme, seed: number, cx: number, cy: number, radius: number): Blob[] {
  const rng = mulberry32(seed);
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary];
  return colors.map(color => {
    const angle = rng() * Math.PI * 2;
    const dist = radius * (0.15 + rng() * 0.5);
    return {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: radius * (0.3 + rng() * 0.4),
      color,
    };
  });
}

/**
 * Generative "album cover": blurred color blobs on a dark radial base,
 * clipped to a circle. Rendered as Skia children so the Visualizer can embed
 * it in its own canvas; use AlbumArtThumb for a standalone small version.
 */
export function ArtLayers({
  theme,
  seed,
  cx,
  cy,
  radius,
}: {
  theme: TrackTheme;
  seed: number;
  cx: number;
  cy: number;
  radius: number;
}) {
  const clip = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, radius);
    return p;
  }, [cx, cy, radius]);
  const blobs = useMemo(
    () => makeBlobs(theme, seed, cx, cy, radius),
    [theme, seed, cx, cy, radius],
  );

  return (
    <Group clip={clip}>
      <Circle cx={cx} cy={cy} r={radius}>
        <RadialGradient
          c={vec(cx, cy)}
          r={radius}
          colors={[theme.bgTop, theme.bgBottom]}
        />
      </Circle>
      {blobs.map((b, i) => (
        <Circle key={i} cx={b.x} cy={b.y} r={b.r} color={b.color} opacity={0.75}>
          <BlurMask blur={radius * 0.35} style="normal" />
        </Circle>
      ))}
      {/* vinyl-style center label */}
      <Circle cx={cx} cy={cy} r={radius * 0.16} color={theme.bgBottom} opacity={0.9} />
      <Circle
        cx={cx}
        cy={cy}
        r={radius * 0.16}
        style="stroke"
        strokeWidth={1.5}
        color={theme.accent}
        opacity={0.7}
      />
      <Circle cx={cx} cy={cy} r={radius * 0.03} color={theme.accent} />
    </Group>
  );
}

export function AlbumArtThumb({
  theme,
  seed,
  size,
}: {
  theme: TrackTheme;
  seed: number;
  size: number;
}) {
  const c = size / 2;
  return (
    <Canvas style={{ width: size, height: size }}>
      <ArtLayers theme={theme} seed={seed} cx={c} cy={c} radius={c} />
    </Canvas>
  );
}
