import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { TRACKS } from '../tracks';
import { AudioEngine } from './AudioEngine';

/** Number of bars in the circular visualizer. */
export const NUM_BARS = 64;
/** Number of points sampled for the oscilloscope waveform. */
export const WAVE_POINTS = 96;

/**
 * Log-spaced FFT bin ranges, one [lo, hi) pair per bar. Log spacing gives
 * lows/mids most of the bars, which matches how we hear music.
 */
export function makeBinRanges(numBars: number, binCount: number): [number, number][] {
  const first = 2; // skip DC + sub-bass noise
  const last = Math.min(binCount - 1, 200); // ~17 kHz at 44.1 kHz / fft 512
  const edges: number[] = [];
  for (let i = 0; i <= numBars; i++) {
    edges.push(Math.round(first * Math.pow(last / first, i / numBars)));
  }
  const ranges: [number, number][] = [];
  for (let i = 0; i < numBars; i++) {
    const lo = edges[i];
    const hi = Math.max(edges[i + 1], lo + 1);
    ranges.push([lo, hi]);
  }
  return ranges;
}

export interface Player {
  trackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionSec: number;
  durationSec: number;
  /** Per-bar magnitudes in [0, 1], smoothed for animation. */
  bars: SharedValue<number[]>;
  /** Oscilloscope samples in [-1, 1]. */
  wave: SharedValue<number[]>;
  /** Bass energy in [0, 1] — drives the album-art pulse. */
  level: SharedValue<number>;
  /** Playback progress in [0, 1] — drives the progress ring / seek bar. */
  progress: SharedValue<number>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  selectTrack: (index: number) => void;
  seekToFraction: (fraction: number) => void;
}

export function usePlayer(): Player {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }
  const engine = engineRef.current;

  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const bars = useSharedValue<number[]>(new Array(NUM_BARS).fill(0));
  const wave = useSharedValue<number[]>(new Array(WAVE_POINTS).fill(0));
  const level = useSharedValue(0);
  const progress = useSharedValue(0);

  /** Whether the next loaded track should start playing immediately. */
  const autoplayRef = useRef(false);
  const advancingRef = useRef(false);

  // ------------------------------------------------------------ track load
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsPlaying(false);
    setPositionSec(0);
    progress.value = 0;

    engine
      .load(TRACKS[trackIndex].source)
      .then(() => {
        if (cancelled) {
          return;
        }
        setDurationSec(engine.duration);
        setIsLoading(false);
        advancingRef.current = false;
        if (autoplayRef.current) {
          engine.play();
          setIsPlaying(true);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load track', err);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [engine, trackIndex, progress]);

  // -------------------------------------------------- analyser polling loop
  useEffect(() => {
    const binCount = engine.frequencyBinCount;
    const freqData = new Uint8Array(binCount);
    const timeData = new Uint8Array(binCount);
    const ranges = makeBinRanges(NUM_BARS, binCount);
    const smoothed = new Float32Array(NUM_BARS);
    const waveStep = Math.max(1, Math.floor(binCount / WAVE_POINTS));
    let lastShownSec = -1;
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);

      if (engine.playing) {
        engine.getFrequencyData(freqData);
        engine.getWaveformData(timeData);

        const nextBars: number[] = new Array(NUM_BARS);
        for (let i = 0; i < NUM_BARS; i++) {
          const [lo, hi] = ranges[i];
          let sum = 0;
          for (let b = lo; b < hi; b++) {
            sum += freqData[b];
          }
          const target = Math.pow(sum / (hi - lo) / 255, 1.15);
          // fast attack, slow release keeps the motion punchy but smooth
          const k = target > smoothed[i] ? 0.55 : 0.16;
          smoothed[i] += (target - smoothed[i]) * k;
          nextBars[i] = smoothed[i];
        }
        bars.value = nextBars;

        const nextWave: number[] = new Array(WAVE_POINTS);
        for (let i = 0; i < WAVE_POINTS; i++) {
          nextWave[i] = (timeData[i * waveStep] - 128) / 128;
        }
        wave.value = nextWave;

        let bass = 0;
        for (let i = 0; i < 6; i++) {
          bass += smoothed[i];
        }
        level.value = bass / 6;

        const dur = engine.duration;
        const pos = engine.position;
        progress.value = dur > 0 ? pos / dur : 0;
        if (Math.abs(pos - lastShownSec) >= 0.25) {
          lastShownSec = pos;
          setPositionSec(pos);
        }

        // auto-advance when the track runs out
        if (dur > 0 && pos >= dur - 0.08 && !advancingRef.current) {
          advancingRef.current = true;
          autoplayRef.current = true;
          setTrackIndex(i => (i + 1) % TRACKS.length);
        }
      } else {
        // let the bars fall gracefully instead of freezing mid-frame
        let alive = false;
        for (let i = 0; i < NUM_BARS; i++) {
          smoothed[i] *= 0.9;
          if (smoothed[i] > 0.004) {
            alive = true;
          }
        }
        if (alive) {
          bars.value = Array.from(smoothed);
          level.value *= 0.9;
          wave.value = wave.value.map(v => v * 0.85);
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, bars, wave, level, progress]);

  // ---------------------------------------------------------------- actions
  const toggle = useCallback(() => {
    if (isLoading) {
      return;
    }
    if (engine.playing) {
      engine.pause();
      autoplayRef.current = false;
      setIsPlaying(false);
    } else {
      engine.play();
      autoplayRef.current = true;
      setIsPlaying(true);
    }
  }, [engine, isLoading]);

  const goTo = useCallback(
    (index: number) => {
      autoplayRef.current = true;
      setTrackIndex(((index % TRACKS.length) + TRACKS.length) % TRACKS.length);
    },
    [],
  );

  const next = useCallback(() => goTo(trackIndex + 1), [goTo, trackIndex]);
  const prev = useCallback(() => goTo(trackIndex - 1), [goTo, trackIndex]);
  const selectTrack = useCallback(
    (index: number) => {
      if (index === trackIndex) {
        toggle();
      } else {
        goTo(index);
      }
    },
    [goTo, toggle, trackIndex],
  );

  const seekToFraction = useCallback(
    (fraction: number) => {
      if (isLoading || engine.duration <= 0) {
        return;
      }
      const clamped = Math.min(Math.max(fraction, 0), 1);
      engine.seek(clamped * engine.duration);
      progress.value = clamped;
      setPositionSec(clamped * engine.duration);
    },
    [engine, isLoading, progress],
  );

  return {
    trackIndex,
    isPlaying,
    isLoading,
    positionSec,
    durationSec,
    bars,
    wave,
    level,
    progress,
    toggle,
    next,
    prev,
    selectTrack,
    seekToFraction,
  };
}
