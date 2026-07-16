/**
 * Resonate — real-time audio visualizer player.
 * Web Audio (react-native-audio-api) feeds FFT data into Skia canvases
 * driven by Reanimated shared values.
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { usePlayer } from './src/audio/usePlayer';
import { Controls } from './src/components/Controls';
import { SeekBar } from './src/components/SeekBar';
import { TrackList } from './src/components/TrackList';
import { Visualizer } from './src/components/Visualizer';
import { WaveformStrip } from './src/components/WaveformStrip';
import { TRACKS } from './src/tracks';

function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <Player />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Player() {
  const { width, height } = useWindowDimensions();
  const player = usePlayer();
  const track = TRACKS[player.trackIndex];
  const theme = track.theme;

  const visualizerSize = Math.min(width - 24, height * 0.42, 380);
  const contentWidth = width - 48;

  return (
    <View style={styles.flex}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(width / 2, 0)}
            end={vec(width / 2, height)}
            colors={[theme.bgTop, theme.bgBottom]}
          />
        </Rect>
      </Canvas>

      <SafeAreaView style={[styles.flex, styles.content]}>
        <View style={styles.header}>
          <Text style={styles.brand}>RESONATE</Text>
          <Text style={[styles.tagline, { color: theme.textDim }]}>
            real-time spectrum · skia + web audio
          </Text>
        </View>

        <View style={styles.center}>
          <Visualizer
            size={visualizerSize}
            theme={theme}
            artSeed={track.artSeed}
            playing={player.isPlaying}
            bars={player.bars}
            level={player.level}
            progress={player.progress}
          />
          <Text style={styles.title}>{track.title}</Text>
          <Text style={[styles.artist, { color: theme.textDim }]}>{track.artist}</Text>
        </View>

        <WaveformStrip width={contentWidth} height={56} wave={player.wave} theme={theme} />

        <SeekBar
          width={contentWidth}
          theme={theme}
          progress={player.progress}
          positionSec={player.positionSec}
          durationSec={player.durationSec}
          onSeek={player.seekToFraction}
        />

        <Controls
          theme={theme}
          isPlaying={player.isPlaying}
          isLoading={player.isLoading}
          onToggle={player.toggle}
          onNext={player.next}
          onPrev={player.prev}
        />

        <TrackList
          theme={theme}
          trackIndex={player.trackIndex}
          isPlaying={player.isPlaying}
          onSelect={player.selectTrack}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  header: {
    alignItems: 'center',
  },
  brand: {
    color: '#f2f2f7',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  center: {
    alignItems: 'center',
  },
  title: {
    color: '#f2f2f7',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
});

export default App;
