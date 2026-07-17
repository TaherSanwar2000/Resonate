import {
  AnalyserNode,
  AudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
  AudioManager,
  GainNode,
} from 'react-native-audio-api';

export const FFT_SIZE = 512;

/**
 * Wraps react-native-audio-api's Web Audio graph with a small player facade:
 *
 *   AudioBufferSourceNode -> GainNode -> AnalyserNode -> destination
 *
 * AudioBufferSourceNodes are one-shot in Web Audio, so pause/seek work by
 * stopping the current source and starting a fresh one at the right offset.
 */
export class AudioEngine {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private gain: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  /** Decoded tracks, keyed by their require()'d asset / URI. */
  private decoded = new Map<number | string, AudioBuffer>();
  /** Bumped on each load() so a stale decode can't clobber a newer one. */
  private loadSeq = 0;

  /** ctx.currentTime at the moment the current source started. */
  private startedAt = 0;
  /** Position (seconds into the track) where the current source started. */
  private startOffset = 0;

  playing = false;

  constructor() {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playback',
      iosMode: 'default',
    });
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.75;
    this.gain = this.ctx.createGain();
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  get frequencyBinCount(): number {
    return this.analyser.frequencyBinCount;
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  get position(): number {
    if (!this.buffer) {
      return 0;
    }
    const pos = this.playing
      ? this.startOffset + (this.ctx.currentTime - this.startedAt)
      : this.startOffset;
    return Math.min(Math.max(pos, 0), this.duration);
  }

  /** Decodes a track. `source` is a require()'d asset or a file/network URI. */
  async load(source: number | string): Promise<void> {
    const seq = ++this.loadSeq;
    this.stopSource();
    this.playing = false;
    this.startOffset = 0;
    this.buffer = null;
    const buffer = await this.decode(source);
    if (seq === this.loadSeq) {
      this.buffer = buffer;
    }
  }

  /** Decodes a track in the background so a later load() resolves instantly. */
  async prefetch(source: number | string): Promise<void> {
    await this.decode(source);
  }

  private async decode(source: number | string): Promise<AudioBuffer> {
    const cached = this.decoded.get(source);
    if (cached) {
      return cached;
    }
    const buffer = await this.ctx.decodeAudioData(source);
    this.decoded.set(source, buffer);
    return buffer;
  }

  play(): void {
    if (!this.buffer || this.playing) {
      return;
    }
    if (this.startOffset >= this.duration - 0.01) {
      this.startOffset = 0; // replay from the top after the track ended
    }
    this.startSource(this.startOffset);
  }

  pause(): void {
    if (!this.playing) {
      return;
    }
    this.startOffset = this.position;
    this.stopSource();
    this.playing = false;
  }

  seek(positionSec: number): void {
    if (!this.buffer) {
      return;
    }
    const clamped = Math.min(Math.max(positionSec, 0), this.duration - 0.01);
    if (this.playing) {
      this.stopSource();
      this.startSource(clamped);
    } else {
      this.startOffset = clamped;
    }
  }

  getFrequencyData(out: Uint8Array): void {
    this.analyser.getByteFrequencyData(out);
  }

  getWaveformData(out: Uint8Array): void {
    this.analyser.getByteTimeDomainData(out);
  }

  private startSource(offset: number): void {
    if (!this.buffer) {
      return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.gain);
    source.start(this.ctx.currentTime, offset);
    this.source = source;
    this.startedAt = this.ctx.currentTime;
    this.startOffset = offset;
    this.playing = true;
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // already stopped / ended — nothing to do
      }
      this.source = null;
    }
  }
}
