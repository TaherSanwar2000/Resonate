#!/usr/bin/env node
/* eslint-env node */
/**
 * Procedurally synthesizes the bundled demo tracks as 16-bit PCM WAV files.
 * Run: node scripts/generate-tracks.js
 * Output: assets/tracks/*.wav
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

// ---------------------------------------------------------------- utilities

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freqOf(name) {
  // e.g. "A4", "C#3", "Eb2"
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  let semis = NOTE_BASE[m[1]];
  if (m[2] === '#') semis += 1;
  if (m[2] === 'b') semis -= 1;
  const octave = parseInt(m[3], 10);
  const midi = (octave + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const osc = {
  sine: p => Math.sin(2 * Math.PI * p),
  square: p => (p % 1 < 0.5 ? 1 : -1),
  saw: p => 2 * (p % 1) - 1,
  triangle: p => 4 * Math.abs((p % 1) - 0.5) - 1,
};

function adsr(t, dur, a, d, s, r) {
  if (t < 0 || t > dur) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  return s * ((dur - t) / r);
}

class Mixer {
  constructor(seconds) {
    this.buf = new Float64Array(Math.ceil(seconds * SAMPLE_RATE));
  }
  /** Renders one note into the buffer. */
  tone({ note, freq, start, dur, wave = 'sine', gain = 0.2, env = [0.01, 0.05, 0.7, 0.1], detune = 0, vibrato = 0, vibratoRate = 5 }) {
    const f0 = (freq ?? freqOf(note)) * Math.pow(2, detune / 1200);
    const [a, d, s, r] = env;
    const from = Math.floor(start * SAMPLE_RATE);
    const n = Math.floor(dur * SAMPLE_RATE);
    const fn = osc[wave];
    let phase = 0;
    for (let i = 0; i < n && from + i < this.buf.length; i++) {
      const t = i / SAMPLE_RATE;
      const f = f0 * (1 + vibrato * Math.sin(2 * Math.PI * vibratoRate * t));
      phase += f / SAMPLE_RATE;
      this.buf[from + i] += fn(phase) * gain * adsr(t, dur, a, d, s, r);
    }
  }
  /** Kick drum: sine with a fast downward pitch sweep. */
  kick(start, gain = 0.5) {
    const from = Math.floor(start * SAMPLE_RATE);
    const n = Math.floor(0.25 * SAMPLE_RATE);
    let phase = 0;
    for (let i = 0; i < n && from + i < this.buf.length; i++) {
      const t = i / SAMPLE_RATE;
      const f = 40 + 90 * Math.exp(-t * 28);
      phase += f / SAMPLE_RATE;
      this.buf[from + i] += Math.sin(2 * Math.PI * phase) * gain * Math.exp(-t * 14);
    }
  }
  /** Noise burst — snare (band-ish) or hat (short + bright). */
  noise(start, dur, gain = 0.15, bright = false) {
    const from = Math.floor(start * SAMPLE_RATE);
    const n = Math.floor(dur * SAMPLE_RATE);
    let prev = 0;
    for (let i = 0; i < n && from + i < this.buf.length; i++) {
      const t = i / SAMPLE_RATE;
      let v = Math.random() * 2 - 1;
      if (bright) {
        const hp = v - prev; // crude high-pass for hats
        prev = v;
        v = hp;
      }
      this.buf[from + i] += v * gain * Math.exp(-t * (bright ? 60 : 22));
    }
  }
  normalize(peak = 0.89) {
    let max = 0;
    for (const v of this.buf) max = Math.max(max, Math.abs(v));
    if (max === 0) return;
    const k = peak / max;
    for (let i = 0; i < this.buf.length; i++) this.buf[i] *= k;
  }
  /** Short fade at both ends so the loop point doesn't click. */
  fadeEdges(seconds = 0.03) {
    const n = Math.floor(seconds * SAMPLE_RATE);
    for (let i = 0; i < n; i++) {
      const k = i / n;
      this.buf[i] *= k;
      this.buf[this.buf.length - 1 - i] *= k;
    }
  }
  writeWav(file) {
    const n = this.buf.length;
    const data = Buffer.alloc(44 + n * 2);
    data.write('RIFF', 0);
    data.writeUInt32LE(36 + n * 2, 4);
    data.write('WAVE', 8);
    data.write('fmt ', 12);
    data.writeUInt32LE(16, 16);
    data.writeUInt16LE(1, 20); // PCM
    data.writeUInt16LE(1, 22); // mono
    data.writeUInt32LE(SAMPLE_RATE, 24);
    data.writeUInt32LE(SAMPLE_RATE * 2, 28);
    data.writeUInt16LE(2, 32);
    data.writeUInt16LE(16, 34);
    data.write('data', 36);
    data.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) {
      const v = Math.max(-1, Math.min(1, this.buf[i]));
      data.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
    }
    fs.writeFileSync(file, data);
    console.log(`wrote ${file} (${(data.length / 1024 / 1024).toFixed(1)} MB, ${(n / SAMPLE_RATE).toFixed(1)}s)`);
  }
}

// ---------------------------------------------------------- 1. Neon Drift
// Synthwave: 112 BPM, A minor. Saw bass, pad chords, square arpeggio, 4/4 kick.
function neonDrift() {
  const bpm = 112;
  const beat = 60 / bpm;
  const bars = 16;
  const total = bars * 4 * beat;
  const mx = new Mixer(total + 0.5);

  const progression = [
    { root: 'A1', chord: ['A3', 'C4', 'E4'] },
    { root: 'F1', chord: ['F3', 'A3', 'C4'] },
    { root: 'C2', chord: ['C4', 'E4', 'G4'] },
    { root: 'G1', chord: ['G3', 'B3', 'D4'] },
  ];

  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4 * beat;
    const { root, chord } = progression[bar % 4];

    // pad — swelling detuned saws
    for (const note of chord) {
      mx.tone({ note, start: t0, dur: 4 * beat, wave: 'saw', gain: 0.045, env: [0.8, 0.5, 0.8, 1.2], detune: -6 });
      mx.tone({ note, start: t0, dur: 4 * beat, wave: 'saw', gain: 0.045, env: [0.8, 0.5, 0.8, 1.2], detune: 6 });
    }
    // bass — driving 8ths
    for (let e = 0; e < 8; e++) {
      mx.tone({ note: root, start: t0 + e * beat * 0.5, dur: beat * 0.42, wave: 'saw', gain: 0.22, env: [0.005, 0.05, 0.6, 0.05] });
    }
    // arpeggio — 16ths over the chord, skip the first 2 bars for a build-up
    if (bar >= 2) {
      const arpNotes = [...chord, chord[1]].map(n => n.replace(/\d/, m => String(+m + 1)));
      for (let s = 0; s < 16; s++) {
        mx.tone({ note: arpNotes[s % 4], start: t0 + s * beat * 0.25, dur: beat * 0.22, wave: 'square', gain: 0.055, env: [0.003, 0.03, 0.4, 0.05] });
      }
    }
    // drums
    for (let b = 0; b < 4; b++) {
      mx.kick(t0 + b * beat, 0.5);
      mx.noise(t0 + (b + 0.5) * beat, 0.05, 0.06, true); // off-beat hats
    }
    if (bar >= 4) {
      mx.noise(t0 + 1 * beat, 0.14, 0.13); // snares on 2 & 4
      mx.noise(t0 + 3 * beat, 0.14, 0.13);
    }
  }
  mx.normalize();
  mx.fadeEdges();
  return mx;
}

// --------------------------------------------------------- 2. Deep Current
// Ambient: slow detuned drones in D, sparse pentatonic melody, no drums.
function deepCurrent() {
  const total = 36;
  const mx = new Mixer(total + 0.5);

  // evolving drone layers
  for (let seg = 0; seg < 6; seg++) {
    const t0 = seg * 6;
    const roots = ['D2', 'A2', 'D3'];
    for (const note of roots) {
      mx.tone({ note, start: t0, dur: 7, wave: 'sine', gain: 0.16, env: [2.5, 1, 0.8, 3], detune: seg % 2 ? 5 : -5, vibrato: 0.002, vibratoRate: 0.4 });
      mx.tone({ note, start: t0, dur: 7, wave: 'triangle', gain: 0.05, env: [2.5, 1, 0.8, 3], detune: seg % 2 ? -7 : 7 });
    }
  }
  // sparse melody — D minor pentatonic, slow attacks
  const melody = [
    ['A4', 1.5, 3], ['C5', 5, 2.5], ['D5', 8, 4], ['A4', 13, 3],
    ['F4', 16.5, 3.5], ['G4', 20.5, 2.5], ['A4', 23.5, 4.5], ['D5', 28.5, 3.5], ['C5', 32, 3.5],
  ];
  for (const [note, start, dur] of melody) {
    mx.tone({ note, start, dur, wave: 'sine', gain: 0.13, env: [1.2, 0.6, 0.75, 1.5], vibrato: 0.004, vibratoRate: 4.5 });
    mx.tone({ note, start: start + 0.02, dur, wave: 'triangle', gain: 0.035, env: [1.2, 0.6, 0.75, 1.5], detune: 1204 }); // shimmer an octave up
  }
  mx.normalize(0.8);
  mx.fadeEdges(0.05);
  return mx;
}

// -------------------------------------------------------- 3. Circuit Bloom
// Chiptune: 140 BPM, C major. Square lead, triangle bass, noise drums.
function circuitBloom() {
  const bpm = 140;
  const beat = 60 / bpm;
  const bars = 16;
  const total = bars * 4 * beat;
  const mx = new Mixer(total + 0.5);

  // two 8-bar lead phrases, in 16th-note steps (note, lengthInSixteenths) — 0 = rest
  const phraseA = [
    ['C5', 2], ['E5', 2], ['G5', 2], ['E5', 2], ['A5', 4], ['G5', 4],
    ['F5', 2], ['E5', 2], ['D5', 2], ['E5', 2], ['C5', 4], [0, 4],
    ['E5', 2], ['G5', 2], ['C6', 2], ['G5', 2], ['B5', 4], ['A5', 4],
    ['G5', 2], ['F5', 2], ['E5', 2], ['D5', 2], ['C5', 6], [0, 2],
  ];
  const phraseB = [
    ['A5', 2], ['G5', 2], ['E5', 2], ['G5', 2], ['F5', 4], ['A5', 4],
    ['G5', 2], ['E5', 2], ['C5', 2], ['E5', 2], ['D5', 6], [0, 2],
    ['C5', 2], ['D5', 2], ['E5', 2], ['G5', 2], ['A5', 4], ['C6', 4],
    ['B5', 2], ['A5', 2], ['G5', 2], ['D5', 2], ['C5', 6], [0, 2],
  ];
  const sixteenth = beat / 4;
  for (let half = 0; half < 2; half++) {
    for (const [pi, phrase] of [phraseA, phraseB].entries()) {
      let t = (half * 2 + pi) * 4 * 4 * beat;
      for (const [note, len] of phrase) {
        if (note) {
          mx.tone({ note, start: t, dur: len * sixteenth * 0.9, wave: 'square', gain: 0.09, env: [0.003, 0.04, 0.55, 0.03], vibrato: 0.006, vibratoRate: 6 });
        }
        t += len * sixteenth;
      }
    }
  }
  // bass — root 8ths following C / Am / F / G
  const bassRoots = ['C2', 'A1', 'F1', 'G1'];
  for (let bar = 0; bar < bars; bar++) {
    const root = bassRoots[bar % 4];
    for (let e = 0; e < 8; e++) {
      mx.tone({ note: root, start: bar * 4 * beat + e * beat * 0.5, dur: beat * 0.4, wave: 'triangle', gain: 0.3, env: [0.004, 0.03, 0.7, 0.04] });
    }
  }
  // drums
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4 * beat;
    mx.kick(t0, 0.45);
    mx.kick(t0 + 2 * beat, 0.45);
    mx.noise(t0 + 1 * beat, 0.1, 0.12);
    mx.noise(t0 + 3 * beat, 0.1, 0.12);
    for (let s = 0; s < 8; s++) mx.noise(t0 + s * beat * 0.5, 0.03, 0.045, true);
  }
  mx.normalize();
  mx.fadeEdges();
  return mx;
}

// -------------------------------------------------------------------- main

const outDir = path.join(__dirname, '..', 'assets', 'tracks');
fs.mkdirSync(outDir, { recursive: true });
neonDrift().writeWav(path.join(outDir, 'neon_drift.wav'));
deepCurrent().writeWav(path.join(outDir, 'deep_current.wav'));
circuitBloom().writeWav(path.join(outDir, 'circuit_bloom.wav'));
