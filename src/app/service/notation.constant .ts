import { TempoUnit } from '@app/model/tempo-unit';

export enum RANDOM_METHOD {
  BASE = 0,
  BONUS_TABLE = 1,
  HARMONY_BASE = 2
}

export const DEFAULT_VELOCITY_SOFTER: number = 1;
export const DEFAULT_VELOCITY_MEDIUM: number = 50;
export const DEFAULT_VELOCITY_LOUDER: number = 100;
export const DEFAULT_TIME_SIGNATURES: Array<number> = [2, 3, 4];
export const DEFAULT_TEMPO_BPM: number = 128;
export const DEFAULT_CHORD_WIDTH: number = 3;
export const DEFAULT_CHORD_DURATION: number = 4;
export const DEFAULT_NOTE_OCTAVE: number = 5;
export const DEFAULT_NB_CHORDS: number = 120;
export const DEFAULT_TIME_SIGNATURE_DENOMINATOR: number = 4;
export const DEFAULT_TIME_SIGNATURE_NUMERATOR: number = 4;
export const DEFAULT_RANDOM_METHOD: RANDOM_METHOD = RANDOM_METHOD.HARMONY_BASE;
export const DEFAULT_RANDOM_INPASSING: number = 50;

export const CHORD_DURATION_UNITS: Map<TempoUnit, string> = new Map([
  [TempoUnit.DUPLE, 'n'], [TempoUnit.HERTZ, 'hz'], [TempoUnit.TICK, 't'], [TempoUnit.SECOND, 's'], [TempoUnit.DUPLE, 'n'], [TempoUnit.TRIPLET, 't'], [TempoUnit.MEASURE, 'm']
]);
export const GENERATE_METHODS: Map<RANDOM_METHOD, string> = new Map([
  [RANDOM_METHOD.BASE, 'Base'],
  [RANDOM_METHOD.BONUS_TABLE, 'Bonus table'],
  [RANDOM_METHOD.HARMONY_BASE, 'Harmony base']
]);

export const CHROMAS_ALPHABETICAL: Array<string> = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const MIDI_FILE_SUFFIX: string = 'mid';