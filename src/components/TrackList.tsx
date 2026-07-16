import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { TRACKS, type TrackTheme } from '../tracks';
import { AlbumArtThumb } from './AlbumArt';

function EqBar({ color, playing, phase }: { color: string; playing: boolean; phase: number }) {
  const scale = useSharedValue(0.35);

  useEffect(() => {
    if (playing) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 260 + phase * 90, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.25, { duration: 300 + phase * 70, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0.35, { duration: 200 });
    }
  }, [playing, phase, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return <Animated.View style={[styles.eqBar, { backgroundColor: color }, style]} />;
}

/** Three tiny bars that dance while the row's track is playing. */
function EqIndicator({ color, playing }: { color: string; playing: boolean }) {
  return (
    <View style={styles.eqRow}>
      {[0, 1, 2].map(i => (
        <EqBar key={i} color={color} playing={playing} phase={i} />
      ))}
    </View>
  );
}

interface Props {
  theme: TrackTheme;
  trackIndex: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
}

export function TrackList({ theme, trackIndex, isPlaying, onSelect }: Props) {
  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {TRACKS.map((track, i) => {
        const active = i === trackIndex;
        return (
          <Pressable
            key={track.id}
            onPress={() => onSelect(i)}
            style={({ pressed }) => [
              styles.row,
              active && { borderColor: theme.accent, backgroundColor: 'rgba(255,255,255,0.05)' },
              pressed && styles.pressed,
            ]}
          >
            <AlbumArtThumb theme={track.theme} seed={track.artSeed} size={42} />
            <View style={styles.meta}>
              <Text style={[styles.title, active && { color: theme.accent }]} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
            {active && <EqIndicator color={theme.accent} playing={isPlaying} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
    flexGrow: 0,
    maxHeight: 176,
    marginTop: 8,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    paddingRight: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
  meta: {
    flex: 1,
  },
  title: {
    color: '#f2f2f7',
    fontSize: 15,
    fontWeight: '600',
  },
  artist: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12.5,
    marginTop: 1,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 16,
  },
  eqBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
  },
});
