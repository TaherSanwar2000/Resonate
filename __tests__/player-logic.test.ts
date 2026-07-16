/**
 * Unit tests for the pure logic behind the visualizer: FFT bin mapping,
 * generative art determinism, and the synthesized track assets.
 * (Full-render tests are skipped on purpose — Skia needs a real CanvasKit
 * instance under Jest, which isn't worth the dependency for this demo.)
 *
 * @format
 */
import * as fs from 'fs';
import * as path from 'path';

import { NUM_BARS, makeBinRanges } from '../src/audio/usePlayer';
import { makeBlobs } from '../src/components/AlbumArt';
import { TRACKS } from '../src/tracks';

describe('makeBinRanges', () => {
  const binCount = 256; // fftSize 512

  it('produces one contiguous, non-empty range per bar', () => {
    const ranges = makeBinRanges(NUM_BARS, binCount);
    expect(ranges).toHaveLength(NUM_BARS);
    for (const [lo, hi] of ranges) {
      expect(hi).toBeGreaterThan(lo);
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(binCount);
    }
  });

  it('is monotonically increasing (log-spaced lows to highs)', () => {
    const ranges = makeBinRanges(NUM_BARS, binCount);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i][0]).toBeGreaterThanOrEqual(ranges[i - 1][0]);
    }
    // log spacing: the last bar must span more bins than the first
    const first = ranges[0][1] - ranges[0][0];
    const last = ranges[ranges.length - 1][1] - ranges[ranges.length - 1][0];
    expect(last).toBeGreaterThan(first);
  });
});

describe('makeBlobs (generative album art)', () => {
  const theme = TRACKS[0].theme;

  it('is deterministic for a given seed', () => {
    expect(makeBlobs(theme, 7, 50, 50, 40)).toEqual(makeBlobs(theme, 7, 50, 50, 40));
  });

  it('differs between seeds', () => {
    expect(makeBlobs(theme, 7, 50, 50, 40)).not.toEqual(makeBlobs(theme, 8, 50, 50, 40));
  });

  it('keeps blob centers within the disc', () => {
    for (const track of TRACKS) {
      for (const blob of makeBlobs(track.theme, track.artSeed, 50, 50, 40)) {
        const dist = Math.hypot(blob.x - 50, blob.y - 50);
        expect(dist).toBeLessThanOrEqual(40);
      }
    }
  });
});

describe('synthesized tracks', () => {
  const trackDir = path.join(__dirname, '..', 'assets', 'tracks');
  const files = ['neon_drift.wav', 'deep_current.wav', 'circuit_bloom.wav'];

  it.each(files)('%s is a valid 16-bit 44.1 kHz PCM WAV', file => {
    const buf = fs.readFileSync(path.join(trackDir, file));
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buf.readUInt16LE(20)).toBe(1); // PCM
    expect(buf.readUInt32LE(24)).toBe(44100);
    expect(buf.readUInt16LE(34)).toBe(16);
    const dataLen = buf.readUInt32LE(40);
    const seconds = dataLen / 2 / 44100;
    expect(seconds).toBeGreaterThan(20);
  });
});
