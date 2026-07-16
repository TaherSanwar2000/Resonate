# Resonate 🎧

A real-time **audio visualizer music player** built with React Native. A Web Audio
`AnalyserNode` runs FFT analysis on the playing track, and every frame the spectrum
is redrawn on the GPU with Skia:

- **Circular spectrum** — 64 log-spaced frequency bars radiate from a spinning,
  procedurally generated album disc that pulses with bass energy
- **Oscilloscope strip** — live time-domain waveform with a neon glow
- **Per-track theming** — each track re-themes the whole UI (background, gradients,
  controls) from its own palette
- **Scrub to seek** — gesture-driven seek bar plus a playback progress ring
- **Zero external assets** — the three demo tracks are synthesized from scratch by
  a Node script (`scripts/generate-tracks.js`): a synthwave loop, an ambient piece,
  and a chiptune, all rendered as PCM WAV

## How it works

```
AudioBufferSourceNode ─▶ GainNode ─▶ AnalyserNode ─▶ speakers
                                        │ getByteFrequencyData / getByteTimeDomainData
                                        ▼
                          rAF loop (JS): log-bin downsample + attack/release smoothing
                                        │ Reanimated SharedValue<number[]>
                                        ▼
                          Skia useDerivedValue → SkPath rebuilt per frame (UI thread)
```

| Layer | Tech |
| --- | --- |
| Audio graph & FFT | [react-native-audio-api](https://github.com/software-mansion/react-native-audio-api) (Web Audio API) |
| GPU rendering | [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) |
| Animation & UI-thread data flow | react-native-reanimated 4 (worklets) |
| Gestures | react-native-gesture-handler |

## Running it

```sh
npm install

# regenerate the demo tracks if you like
node scripts/generate-tracks.js

# iOS
bundle install
bundle exec pod install --project-directory=ios
npm run ios

# Android
npm run android
```

## Project layout

```
src/
  tracks.ts               track metadata + per-track color themes
  audio/AudioEngine.ts    Web Audio graph + play/pause/seek facade
  audio/usePlayer.ts      analyser polling loop → shared values, player state
  components/
    Visualizer.tsx        circular FFT bars + progress ring + spinning disc
    WaveformStrip.tsx     oscilloscope
    AlbumArt.tsx          seeded generative album covers
    SeekBar.tsx           pan-gesture scrubber
    Controls.tsx, TrackList.tsx, icons.tsx
scripts/
  generate-tracks.js      procedural music synthesis → assets/tracks/*.wav
```
