export interface TrackTheme {
  /** Background gradient, top → bottom. */
  bgTop: string;
  bgBottom: string;
  /** Main visualizer / accent colors. */
  primary: string;
  secondary: string;
  accent: string;
  /** Muted text color that still reads on the dark background. */
  textDim: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  /** Metro asset (require'd .wav). */
  source: number;
  theme: TrackTheme;
  /** Seed for the generative album art. */
  artSeed: number;
}

export const TRACKS: Track[] = [
  {
    id: 'neon-drift',
    title: 'Neon Drift',
    artist: 'Analog Ghost',
    source: require('../assets/tracks/neon_drift.wav'),
    artSeed: 7,
    theme: {
      bgTop: '#1b0722',
      bgBottom: '#05010a',
      primary: '#ff3d81',
      secondary: '#7b2ff7',
      accent: '#00e5ff',
      textDim: '#b48ccb',
    },
  },
  {
    id: 'deep-current',
    title: 'Deep Current',
    artist: 'Mariana Fields',
    source: require('../assets/tracks/deep_current.wav'),
    artSeed: 21,
    theme: {
      bgTop: '#03202e',
      bgBottom: '#010507',
      primary: '#00b4d8',
      secondary: '#125e8a',
      accent: '#90e0ef',
      textDim: '#7fa8b8',
    },
  },
  {
    id: 'circuit-bloom',
    title: 'Circuit Bloom',
    artist: 'Pixel Foundry',
    source: require('../assets/tracks/circuit_bloom.wav'),
    artSeed: 42,
    theme: {
      bgTop: '#0a2312',
      bgBottom: '#020703',
      primary: '#52ffa8',
      secondary: '#00a86b',
      accent: '#eaff6b',
      textDim: '#84b596',
    },
  },
];
