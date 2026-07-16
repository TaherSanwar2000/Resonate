import React, { useMemo } from 'react';
import { Canvas, Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';

export function PlayIcon({ size, color }: { size: number; color: string }) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(size * 0.34, size * 0.2);
    p.lineTo(size * 0.84, size * 0.5);
    p.lineTo(size * 0.34, size * 0.8);
    p.close();
    return p;
  }, [size]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path} color={color} strokeJoin="round" />
    </Canvas>
  );
}

export function PauseIcon({ size, color }: { size: number; color: string }) {
  const barW = size * 0.16;
  const barH = size * 0.52;
  const y = size * 0.24;
  return (
    <Canvas style={{ width: size, height: size }}>
      <RoundedRect x={size * 0.28} y={y} width={barW} height={barH} r={barW * 0.35} color={color} />
      <RoundedRect x={size * 0.56} y={y} width={barW} height={barH} r={barW * 0.35} color={color} />
    </Canvas>
  );
}

/** Skip-next chevron; pass direction={-1} for skip-previous. */
export function SkipIcon({
  size,
  color,
  direction = 1,
}: {
  size: number;
  color: string;
  direction?: 1 | -1;
}) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(size * 0.22, size * 0.26);
    p.lineTo(size * 0.62, size * 0.5);
    p.lineTo(size * 0.22, size * 0.74);
    p.close();
    return p;
  }, [size]);
  const barW = size * 0.1;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group
        origin={{ x: size / 2, y: size / 2 }}
        transform={[{ scaleX: direction }]}
      >
        <Path path={path} color={color} />
        <RoundedRect
          x={size * 0.68}
          y={size * 0.26}
          width={barW}
          height={size * 0.48}
          r={barW * 0.4}
          color={color}
        />
      </Group>
    </Canvas>
  );
}
