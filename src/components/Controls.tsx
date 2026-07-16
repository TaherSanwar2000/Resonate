import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { TrackTheme } from '../tracks';
import { PauseIcon, PlayIcon, SkipIcon } from './icons';

interface Props {
  theme: TrackTheme;
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Controls({ theme, isPlaying, isLoading, onToggle, onNext, onPrev }: Props) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} hitSlop={12} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
        <SkipIcon size={30} color="#e8e8f0" direction={-1} />
      </Pressable>

      <Pressable
        onPress={onToggle}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.playButton,
          { backgroundColor: theme.primary, shadowColor: theme.primary },
          pressed && styles.pressed,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#0b0b14" />
        ) : isPlaying ? (
          <PauseIcon size={34} color="#0b0b14" />
        ) : (
          <PlayIcon size={34} color="#0b0b14" />
        )}
      </Pressable>

      <Pressable onPress={onNext} hitSlop={12} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
        <SkipIcon size={30} color="#e8e8f0" direction={1} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  playButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  skip: {
    padding: 6,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
});
