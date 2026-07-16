import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { TrackTheme } from '../tracks';

interface Props {
  width: number;
  theme: TrackTheme;
  progress: SharedValue<number>;
  positionSec: number;
  durationSec: number;
  onSeek: (fraction: number) => void;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Scrubbing bar: drag anywhere on the track to seek. */
export function SeekBar({ width, theme, progress, positionSec, durationSec, onSeek }: Props) {
  const scrubbing = useSharedValue(false);
  const scrub = useSharedValue(0);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(e => {
      scrubbing.value = true;
      scrub.value = Math.min(Math.max(e.x / width, 0), 1);
    })
    .onUpdate(e => {
      scrub.value = Math.min(Math.max(e.x / width, 0), 1);
    })
    .onEnd(() => {
      runOnJS(onSeek)(scrub.value);
    })
    .onFinalize(() => {
      scrubbing.value = false;
    });

  const fillStyle = useAnimatedStyle(() => {
    const frac = scrubbing.value ? scrub.value : progress.value;
    return { width: frac * width };
  });
  const knobStyle = useAnimatedStyle(() => {
    const frac = scrubbing.value ? scrub.value : progress.value;
    return {
      transform: [{ translateX: frac * width - 7 }, { scale: scrubbing.value ? 1.35 : 1 }],
    };
  });

  return (
    <View style={{ width }}>
      <GestureDetector gesture={gesture}>
        <View style={styles.touchArea} hitSlop={{ top: 8, bottom: 8 }}>
          <View style={styles.track}>
            <Animated.View
              style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]}
            />
          </View>
          <Animated.View
            style={[
              styles.knob,
              { backgroundColor: theme.accent, shadowColor: theme.accent },
              knobStyle,
            ]}
          />
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <Text style={[styles.time, { color: theme.textDim }]}>{formatTime(positionSec)}</Text>
        <Text style={[styles.time, { color: theme.textDim }]}>{formatTime(durationSec)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  knob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
