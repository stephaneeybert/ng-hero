import { Injectable } from '@angular/core';
import { Measure } from '@app/model/measure/measure';
import { NotationService } from './notation.service';
import { PlacedChord } from '@app/model/note/placed-chord';
import { Note } from '@app/model/note/note';
import { SoundtrackService } from '@app/views/soundtrack/soundtrack.service';
import { TranslateService } from '@ngx-translate/core';
import { Soundtrack } from '@app/model/soundtrack';
import { TempoUnit } from '@app/model/tempo-unit';
import { Track } from '@app/model/track';
import { CommonService } from '@stephaneeybert/lib-core';
import { SettingsService } from '@app/views/settings/settings.service';
import { NOTE_RANGE, HALF_TONE_CHROMAS, NOTE_RANGE_INTERVALS, HALF_TONE, TRACK_TYPES, CHROMAS_MAJOR, CHROMAS_MINOR, CHROMAS_ALPHABETICAL, CHROMA_ENHARMONICS, DEFAULT_TONALITY_C_MAJOR } from './notation.constant ';
import { Tonality } from '@app/model/note/tonality';

@Injectable({
  providedIn: 'root'
})
export class GeneratorService {

  constructor(
    private commonService: CommonService,
    private soundtrackService: SoundtrackService,
    private notationService: NotationService,
    private settingsService: SettingsService,
    private translateService: TranslateService,
  ) { }

  CHROMA_SHIFT_TIMES: number = 2;

  private createNotesAndPlacedChord(octave: number, chordDuration: number, velocity: number, tonality: Tonality, placedChordIndex: number, chromas: Array<string>): PlacedChord {
    let noteIndex: number = 0;
    let previousChroma: string = '';
    const nextUpperOctave: number = octave + 1;
    const notes: Array<Note> = new Array();
    for (let i = 0; i < chromas.length; i++) {
      const chroma: string = chromas[i];
      if (noteIndex > 0 && this.chordChromaBelongsToNextUpperOctave(previousChroma, chroma)) {
        octave = nextUpperOctave;
      }
      const note: Note = this.notationService.createNote(noteIndex, chroma, octave);
      noteIndex++;
      previousChroma = chroma;
      notes.push(note);
    }
    return this.notationService.createPlacedChord(placedChordIndex, chordDuration, TempoUnit.NOTE, velocity, tonality, notes);
  }

  // If a current chord chroma is lower than the previous chord chroma
  // then the current chroma belong to the next upper octave
  private chordChromaBelongsToNextUpperOctave(previousChroma: string, currentChroma: string): boolean {
    const tonalityChromas: Array<string> = this.getTonalityChromas(DEFAULT_TONALITY_C_MAJOR.range, DEFAULT_TONALITY_C_MAJOR.firstChroma);
    const previousAlphaChroma: string = previousChroma.substr(0, 1);
    const currentAlphaChroma: string = currentChroma.substr(0, 1);
    return tonalityChromas.indexOf(currentAlphaChroma) < tonalityChromas.indexOf(previousAlphaChroma);
  }

  private createMeasure(index: number): Measure {
    const tempoBpm: number = this.settingsService.getSettings().generateTempoBpm;
    const timeSignatureNumerator: number = this.settingsService.getSettings().generateTimeSignatureNumerator;
    const timeSignatureDenominator: number = this.settingsService.getSettings().generateTimeSignatureDenominator;
    return this.notationService.createMeasure(index, tempoBpm, timeSignatureNumerator, timeSignatureDenominator);
  }

  private createMeasures(generatedChords: Array<PlacedChord>): Array<Measure> {
    let measureIndex: number = 0;
    let chordIndex: number = 0;
    const measures: Array<Measure> = new Array<Measure>();
    let measure: Measure = this.createMeasure(measureIndex);
    measure.placedChords = new Array<PlacedChord>();
    generatedChords
      .forEach((placedChord: PlacedChord) => {
        if (measure.placedChords) {
          // The number of beats of the chords placed in a measure must equal the number of beats of the measure
          if (measure.getPlacedChordsNbBeats() >= measure.getNbBeats()) {
            measures.push(measure);
            measure = this.createMeasure(measureIndex);
            measure.placedChords = new Array<PlacedChord>();
            measureIndex++;
            chordIndex = 0;
          }
          placedChord.index = chordIndex;
          chordIndex++;
          measure.placedChords.push(placedChord);
        } else {
          throw new Error('The measure placed chords array has not been instantiated.');
        }
      });
    measures.push(measure);
    return measures;
  }

  public generateSoundtrack(): Soundtrack {
    const soundtrack: Soundtrack = this.soundtrackService.createSoundtrack(this.createNewSoundtrackId(), this.createNewSoundtrackName());

    const octave: number = this.settingsService.getSettings().generateNoteOctave;
    const chordDuration: number = this.settingsService.getSettings().generateChordDuration;
    const harmonyVelocity: number = this.settingsService.percentageToVelocity(this.settingsService.getSettings().generateVelocityHarmony);
    const harmonyMeasures: Array<Measure> = this.generateHarmonyChordInMeasures(octave, chordDuration, harmonyVelocity);

    if (this.settingsService.getSettings().generateMelody) {
      const melodyVelocity: number = this.settingsService.percentageToVelocity(this.settingsService.getSettings().generateVelocityMelody);
      const melodyChords: Array<PlacedChord> = this.generateMelodyChords(harmonyMeasures, octave, chordDuration, melodyVelocity);
      const melodyMeasures: Array<Measure> = this.createMeasures(melodyChords);

      const melodyTrack: Track = soundtrack.addTrack(melodyMeasures);
      melodyTrack.name = this.getTrackName(TRACK_TYPES.MELODY);
    }

    if (this.settingsService.getSettings().generateHarmony) {
      const harmonyTrack: Track = soundtrack.addTrack(harmonyMeasures);
      harmonyTrack.name = this.getTrackName(TRACK_TYPES.HARMONY);
      harmonyTrack.displayChordNames = true;
    }

    if (this.settingsService.getSettings().generateDrums) {
      const drumsChords: Array<PlacedChord> = new Array();
      const drumsTrack: Track = soundtrack.addTrack(this.createMeasures(drumsChords));
      drumsTrack.name = this.getTrackName(TRACK_TYPES.DRUMS);
      drumsTrack.displayChordNames = true;
    }

    if (this.settingsService.getSettings().generateBass) {
      const bassChords: Array<PlacedChord> = new Array();
      const bassTrack: Track = soundtrack.addTrack(this.createMeasures(bassChords));
      bassTrack.name = this.getTrackName(TRACK_TYPES.BASS);
      bassTrack.displayChordNames = true;
    }

    this.soundtrackService.storeSoundtrack(soundtrack);
    return soundtrack;
  }

  private getTrackName(trackType: string): string {
    return this.translateService.instant('music.notation.track.' + trackType);
  }

  private createNewSoundtrackName(): string {
    return this.translateService.instant('soundtracks.assignedName');
  }

  private createNewSoundtrackId(): string {
    return this.translateService.instant('soundtracks.assignedName') + '_' + this.commonService.getRandomString(4);
  }

  private buildTonality(scale: Array<string>, noteRangeIntervals: Array<number>): Array<string> {
    const tonality: Array<string> = new Array();
    let chromas: Array<string> = scale;
    tonality.push(chromas[0]);
    let index: number = chromas.indexOf(chromas[0]);
    for (let i = 0; i < noteRangeIntervals.length - 1; i++) {
      for (var j = 0; j < noteRangeIntervals[i] / HALF_TONE; j++) {
        chromas = this.createArrayShiftOnceLeft(chromas);
      }
      tonality.push(chromas[index]);
    }
    return tonality;
  }

  private createArrayShiftOnceLeft(items: Array<string>): Array<string> {
    // Make a deep copy
    let shiftedItems: Array<string> = new Array();
    items.forEach((chroma: string) => {
      shiftedItems.push(chroma);
    });

    // Shift the copy and not the original
    const item: string | undefined = shiftedItems.shift();
    if (item) {
      shiftedItems.push(item);
    } else {
      throw new Error('The array could not be shifted left');
    }
    return shiftedItems;
  }

  private createArrayShiftOnceRight(items: Array<string>): Array<string> {
    // Make a deep copy
    let shiftedItems: Array<string> = new Array();
    items.forEach((chroma: string) => {
      shiftedItems.push(chroma);
    });

    // Shift the copy and not the original
    const item: string | undefined = shiftedItems.pop();
    if (item) {
      shiftedItems.unshift(item);
    } else {
      throw new Error('The array could not be shifted right');
    }
    return shiftedItems;
  }

  // Create a chromas array shifted from another one
  private createShiftedChromas(chromas: Array<string>): Array<string> {
    for (let i = 0; i < this.CHROMA_SHIFT_TIMES; i++) {
      chromas = this.createArrayShiftOnceLeft(chromas);
    }
    return chromas;
  }

  // Create all the shifted chromas arrays for a chord width
  private getTonalityShiftedChromas(tonalityChromas: Array<string>): Array<Array<string>> {
    const shiftedChromas: Array<Array<string>> = new Array();
    // Create shifted chromas, each starting some notes down the previous chroma
    // The number of shifted chromas is the width of the chord
    // An example for the C tonality is:
    // 'G', 'A', 'B', 'C', 'D', 'E', 'F'
    // 'E', 'F', 'G', 'A', 'B', 'C', 'D'
    // 'C', 'D', 'E', 'F', 'G', 'A', 'B'

    // Build the shifted chromas
    shiftedChromas[0] = tonalityChromas;
    const chordWidth: number = this.settingsService.getSettings().generateChordWidth;
    for (let index = 1; index < chordWidth; index++) {
      shiftedChromas[index] = this.createShiftedChromas(shiftedChromas[index - 1]);
    }
    return shiftedChromas;
  }

  // Check if the chord shares a minimum number of notes with its previous chord
  private isSimilarToPrevious(previousChord: Array<string>, chord: Array<string>): boolean {
    let nbSameNotes: number = 0;
    for (let i = 0; i < this.settingsService.getSettings().generateChordWidth; i++) {
      if (previousChord.includes(chord[i])) {
        nbSameNotes++;
      }
    }
    return (nbSameNotes >= (chord.length - 1));
  }

  private createShiftedChord(chord: Array<string>): Array<string> {
    return this.createArrayShiftOnceRight(chord);
  }

  // The randomised pick between a harmony chord note or an inpassing note can be tuned by a setting
  private fromInpassingNote(): boolean {
    const inpassingNote: number = this.settingsService.getSettings().generateInpassingNote;
    if (inpassingNote > 0) {
      const randomInpassingnote: number = this.commonService.getRandomIntegerBetween(0, 100);
      if (randomInpassingnote < inpassingNote) {
        return true;
      }
    }
    return false;
  }

  // Get an inpassing note that is near the previous melody note
  // An inpassing note is one that is not in the harmony chord but that
  // is between the previous melody note and another note of the harmony chord
  // even if of another octave
  private getInpassingNearNotes(harmonyChord: PlacedChord, previousMelodyChroma: string, previousMelodyOctave: number): Array<string> {
    const nearNotes: Array<string> = new Array<string>();
    const harmonyChordSortedChromas: Array<string> = harmonyChord.getSortedNotesChromas();

    const tonalityChromas: Array<string> = this.getTonalityChromas(harmonyChord.tonality.range, harmonyChord.tonality.firstChroma);
    const previousMelodyNoteIndex: number = tonalityChromas.indexOf(previousMelodyChroma);

    if (previousMelodyNoteIndex < 0) {
      throw new Error('The previous melody chroma ' + previousMelodyChroma + ' could not be found in the tonality ' + tonalityChromas);
    }

    let chromas: Array<string> = tonalityChromas;

    // The maximum near distance to consider
    const NEAR_MAX: number = 2; // TODO Have this constant as a settings

    // Consider the chromas above the previous melody note chroma
    if (previousMelodyOctave <= this.notationService.getFirstNoteSortedByIndex(harmonyChord).renderOctave()) {
      for (let chromaIndex: number = 0; chromaIndex < NEAR_MAX; chromaIndex++) {
        chromas = this.createArrayShiftOnceLeft(chromas);
        // Consider only notes before the next harmony chord note
        if (!harmonyChordSortedChromas.includes(chromas[previousMelodyNoteIndex])) {
          // Check if the note is on the upper octave
          let octave = previousMelodyOctave;
          if (previousMelodyNoteIndex + chromaIndex + 1 >= tonalityChromas.length) {
            octave++;
          }
          nearNotes.push(chromas[previousMelodyNoteIndex] + String(octave));
        } else {
          break;
        }
      }
    }

    // Consider the chromas below the previous melody note chroma
    if (previousMelodyOctave >= this.notationService.getFirstNoteSortedByIndex(harmonyChord).renderOctave()) {
      chromas = tonalityChromas;
      for (let chromaIndex: number = 0; chromaIndex < NEAR_MAX; chromaIndex++) {
        chromas = this.createArrayShiftOnceRight(chromas);
        // Consider only notes before the next harmony chord note
        if (!harmonyChordSortedChromas.includes(chromas[previousMelodyNoteIndex])) {
          // Check if the note is on the lower octave
          let octave = previousMelodyOctave;
          if (previousMelodyNoteIndex - chromaIndex <= 0) {
            octave--;
          }
          nearNotes.push(chromas[previousMelodyNoteIndex] + String(octave));
        } else {
          break;
        }
      }
    }

    // If the previous melody note is bordered by two notes from the harmony chord
    // then no near note can be obtained and there are no returned near notes

    return nearNotes;
  }

  private pickInpassingNote(harmonyChord: PlacedChord, previousMelodyChroma: string, previousMelodyOctave: number): string | undefined {
    // Randomly pick a note from the near ones
    const nearNotes: Array<string> = this.getInpassingNearNotes(harmonyChord, previousMelodyChroma, previousMelodyOctave);
    if (nearNotes.length > 0) {
      const nearNoteIndex: number = this.commonService.getRandomIntegerBetween(0, nearNotes.length - 1);
      return nearNotes[nearNoteIndex];
    } else {
      return undefined;
    }
  }

  // Get a note from the harmony chord that is near the previous melody note
  // The octave remains the same as the one from the harmony chord
  private getNearNotesFromSourceChord(harmonyChord: PlacedChord, previousMelodyChroma: string, previousMelodyOctave: number): Array<[string, number]> {
    const nearNoteChromas: Array<[string, number]> = new Array<[string, number]>();
    const harmonyChordSortedChromas: Array<string> = harmonyChord.getSortedNotesChromas();
    let tonalityChromas: Array<string> = this.getTonalityChromas(harmonyChord.tonality.range, harmonyChord.tonality.firstChroma);
    const previousMelodyNoteIndex: number = tonalityChromas.indexOf(previousMelodyChroma);

    // If the previous note was from a different tonality and is not found in the new tonality
    // then pick any note from the harmony chord
    if (previousMelodyNoteIndex < 0) {
      const chordNoteIndex: number = this.commonService.getRandomIntegerBetween(0, harmonyChordSortedChromas.length - 1);
      nearNoteChromas.push([harmonyChordSortedChromas[chordNoteIndex], this.notationService.getFirstNoteSortedByIndex(harmonyChord).renderOctave()]);
    } else {
      // The maximum near distance to consider
      const NEAR_MAX: number = 2; // TODO Have this constant as a settings

      for (let noteIndex = 0; noteIndex < harmonyChordSortedChromas.length; noteIndex++) {
        const harmonyChordChroma: string = harmonyChordSortedChromas[noteIndex];
        // Avoid the previous chroma
        if (harmonyChordChroma != previousMelodyChroma) {
          if (Math.abs(tonalityChromas.indexOf(harmonyChordChroma) - previousMelodyNoteIndex) <= NEAR_MAX) {
            nearNoteChromas.push([harmonyChordChroma, previousMelodyOctave]);
          }
        }
      }

      // If no note was near enough to be added then use the previous note
      if (nearNoteChromas.length == 0) {
        nearNoteChromas.push([previousMelodyChroma, previousMelodyOctave]);
      }
    }

    return nearNoteChromas;
  }

  // Pick a melody note from the harmony chord that is near the previous melody note
  private pickNearNoteFromSourceChord(harmonyChord: PlacedChord, previousMelodyChroma: string | undefined, previousMelodyOctave: number): [string, number] {
    const harmonyChordSortedChromas: Array<string> = harmonyChord.getSortedNotesChromas();
    if (previousMelodyChroma) {
      const nearNotes: Array<[string, number]> = this.getNearNotesFromSourceChord(harmonyChord, previousMelodyChroma, previousMelodyOctave);
      const nearNoteIndex: number = this.commonService.getRandomIntegerBetween(0, nearNotes.length - 1);
      return nearNotes[nearNoteIndex];
    } else {
      // If no previous note then pick any note from the harmony chord
      const chordNoteIndex: number = this.commonService.getRandomIntegerBetween(0, harmonyChordSortedChromas.length - 1);
      return [harmonyChordSortedChromas[chordNoteIndex], previousMelodyOctave];
    }
  }

  // Add to the map of enharmonics some new mappings with their original values as keys
  // so as to get a map with the original mappings plus the reversed mappings
  private getBidirectionalEnharmonics(): Map<string, string> {
    const bidirectional: Map<string, string> = new Map();
    CHROMA_ENHARMONICS.forEach((value: string, key: string) => {
      bidirectional.set(key, value);
      bidirectional.set(value, key);
    });
    return bidirectional;
  }

  // Create a new map of enharmonics from mappings with their orginal values as keys
  // so as to get a map of enharmonics containing only the reversed mappings
  private getReversedEnharmonics(): Map<string, string> {
    const reversed: Map<string, string> = new Map();
    CHROMA_ENHARMONICS.forEach((value: string, key: string) => {
      reversed.set(value, key);
    });
    return reversed;
  }

  // Get the matching enharmonic from a chroma
  private getChromaEnharmonic(chroma: string): string {
    const bidirectional: Map<string, string> = this.getBidirectionalEnharmonics();
    if (bidirectional.has(chroma)) {
      const enharmonic: string | undefined = bidirectional.get(chroma);
      if (enharmonic) {
        return enharmonic;
      } else {
        throw new Error('The chroma ' + chroma + ' could not be retrieved in the enharmonics.');
      }
    } else {
      throw new Error('The chroma ' + chroma + ' could not be found in the enharmonics.');
    }
  }

  // Get the one enharmonic mappings array that contains a chroma
  // and shift the array so as to start it with the chroma
  private pickContainingEnharmonics(startChroma: string): Array<string> {
    let chromas: Array<string> = new Array();
    if (CHROMA_ENHARMONICS.has(startChroma)) {
      CHROMA_ENHARMONICS.forEach((value: string, key: string) => {
        chromas.push(key);
      });
    } else {
      const reversedEnharmonics: Map<string, string> = this.getReversedEnharmonics();
      if (reversedEnharmonics.has(startChroma)) {
        reversedEnharmonics.forEach((value: string, key: string) => {
          chromas.push(key);
        });
      } else {
        throw new Error('The chroma ' + startChroma + ' could not be found in the reversed enharmonics.');
      }
    }

    let shiftedChromas: Array<string> = new Array();
    for (let i: number = 0; i < chromas.length; i++) {
      if (startChroma == chromas[i]) {
        for (let j = i; j < chromas.length + i; j++) {
          shiftedChromas.push(chromas[j % chromas.length]);
        }
        break;
      }
    }

    return shiftedChromas;
  }

  private getSourceScale(rangeFirstChroma: string): Array<string> {
    return this.pickContainingEnharmonics(rangeFirstChroma);
  }

  private getEnharmonicScale(rangeFirstChroma: string): Array<string> {
    const sameSoundingChroma: string = this.getChromaEnharmonic(rangeFirstChroma);
    return this.pickContainingEnharmonics(sameSoundingChroma);
  }

  private getAlphaScale(startChroma: string, length: number): Array<string> {
    var shiftedChromas: Array<string> = new Array();
    for (let i: number = 0; i < length; i++) {
      if (startChroma.includes(CHROMAS_ALPHABETICAL[i])) {
        for (let j = i; j < length + i; j++) {
          shiftedChromas.push(CHROMAS_ALPHABETICAL[j % CHROMAS_ALPHABETICAL.length]);
        }
        break;
      }
    }
    if (shiftedChromas.length == 0) {
      throw new Error('The chroma ' + startChroma + ' could not be found in the alphabetical chromas ' + CHROMAS_ALPHABETICAL);
    }
    return shiftedChromas;
  }

  private intervalsToStructure(noteRangeIntervals: Array<number>): Array<number> {
    let noteRangeStructure: Array<number> = new Array();
    let total: number = 0;
    for (let index: number = 0; index < noteRangeIntervals.length; index++) {
      noteRangeStructure.push(total);
      total += (2 * noteRangeIntervals[index]);
    }
    return noteRangeStructure;
  }

  private getNoteRangeIntervals(noteRange: NOTE_RANGE): Array<number> {
    const noteRangeIntervals: Array<number> | undefined = NOTE_RANGE_INTERVALS.get(noteRange);
    if (noteRangeIntervals) {
      return noteRangeIntervals;
    } else {
      throw new Error('No intervals could be found for the note range ' + noteRange);
    }
  }

/* TODOENHARMONICS
*/
  private getTonalityChromas(noteRange: NOTE_RANGE, rangeFirstChroma: string): Array<string> {
    let tonality: Array<string> = new Array();
    const sourceScale: Array<string> = this.getSourceScale(rangeFirstChroma);
    const enharmonicScale: Array<string> = this.getEnharmonicScale(rangeFirstChroma);
    const alphaScale: Array<string> = this.getAlphaScale(rangeFirstChroma, sourceScale.length);
    const noteRangeStructure: Array<number> = this.intervalsToStructure(this.getNoteRangeIntervals(noteRange));

    let structureIndex: number = 0;
    for (let index = 0; index < sourceScale.length; index++) {
      if (noteRangeStructure[structureIndex] == index) {
        if (sourceScale[index].includes(alphaScale[structureIndex])) {
          tonality.push(sourceScale[index]);
        } else if (enharmonicScale[index].includes(alphaScale[structureIndex])) {
          tonality.push(enharmonicScale[index]);
        }
        structureIndex++;
      }
    }
    return tonality;
  }
/*
  private getTonalityChromas(noteRange: NOTE_RANGE, rangeFirstChroma: string): Array<string> {
    const tonality: Array<string> = new Array();
    const noteRangeIntervals: Array<number> = this.getNoteRangeIntervals(noteRange);
    tonality.push(rangeFirstChroma);
    let chromas: Array<string> = this.notationService.selectHalfToneChromasFromFirstChroma(rangeFirstChroma);
    let index: number = chromas.indexOf(rangeFirstChroma);
    for (let i = 0; i < noteRangeIntervals.length - 1; i++) {
      for (var j = 0; j < noteRangeIntervals[i] / HALF_TONE; j++) {
        chromas = this.createArrayShiftOnceLeft(chromas);
      }
      tonality.push(chromas[index]);
    }
    return tonality;
  }
*/
  private getAllTonalities(): Array<Tonality> {
    const tonalities: Array<Tonality> = new Array();
    CHROMAS_MAJOR.forEach((chroma: string) => {
      tonalities.push(new Tonality(NOTE_RANGE.MAJOR, chroma));
    });
    CHROMAS_MINOR.forEach((chroma: string) => {
      tonalities.push(new Tonality(NOTE_RANGE.MINOR_NATURAL, chroma));
    });
    return tonalities;
  }

  public logAllTonalities(): void {
    this.getAllTonalities().forEach((tonality: Tonality) => {
      const tonalitySyllabics: Array<string> = new Array();
      const tonalityChromas: Array<string> = this.getTonalityChromas(tonality.range, tonality.firstChroma);
      tonalityChromas.forEach((chroma: string) => {
        const syllabic: string = this.notationService.chordChromaLetterToChromaSyllabic(chroma, tonality.range);
        // const syllabic: string = this.notationService.noteChromaLetterToChromaSyllabic(chroma);
        tonalitySyllabics.push(syllabic);
      });
      console.log(tonalityChromas);
      // console.log(tonalitySyllabics);
    });
  }

  private getFirstMeasureTonality(): Tonality {
    const firstChroma: string = this.settingsService.getSettings().generateTonality;
    return new Tonality(NOTE_RANGE.MAJOR, firstChroma);
  }

  private getTonalitiesContainingChromas(range: NOTE_RANGE, previousChroma: string, previousPreviousChroma: string | undefined): Array<Tonality> {
    const tonalities: Array<Tonality> = new Array();
    for (let i: number = 0; i < HALF_TONE_CHROMAS.length; i++) {
      const chroma: string = HALF_TONE_CHROMAS[i];
      const tonalityChromas: Array<string> = this.getTonalityChromas(range, chroma);
      if (previousPreviousChroma) {
        if (tonalityChromas.includes(previousPreviousChroma) && tonalityChromas.includes(previousChroma)) {
          tonalities.push(new Tonality(range, chroma));
        }
      } else {
        if (tonalityChromas.includes(previousChroma)) {
          tonalities.push(new Tonality(range, chroma));
        }
      }
    }
    return tonalities;
  }

  // Get a tonality selected randomly among ones that include two previous notes
  private getSibblingTonality(previousPreviousChord: PlacedChord | undefined, previousChord: PlacedChord | undefined): Tonality {
    const onlyMajor: boolean = true; // TODO Have a settings to default false
    const dontRepeat: boolean = true // TODO Have a settings to default false
    if (previousChord) {
      let tonalities: Array<Tonality> = new Array();
      if (previousPreviousChord) {
        tonalities = tonalities.concat(this.getTonalitiesContainingChromas(NOTE_RANGE.MAJOR, this.notationService.getFirstNoteSortedByIndex(previousChord).renderChroma(), this.notationService.getFirstNoteSortedByIndex(previousPreviousChord).renderChroma()));
        if (!onlyMajor) {
          tonalities = tonalities.concat(this.getTonalitiesContainingChromas(NOTE_RANGE.MINOR_NATURAL, this.notationService.getFirstNoteSortedByIndex(previousChord).renderChroma(), this.notationService.getFirstNoteSortedByIndex(previousPreviousChord).renderChroma()));
        }
      }
      // If no tonality includes the two previous notes then pick the ones that contain the previous note only
      if (tonalities.length == 0) {
        tonalities = tonalities.concat(this.getTonalitiesContainingChromas(NOTE_RANGE.MAJOR, this.notationService.getFirstNoteSortedByIndex(previousChord).renderChroma(), undefined));
        if (!onlyMajor) {
          tonalities = tonalities.concat(this.getTonalitiesContainingChromas(NOTE_RANGE.MINOR_NATURAL, this.notationService.getFirstNoteSortedByIndex(previousChord).renderChroma(), undefined));
        }
      }
      if (dontRepeat) {
        tonalities = this.stripTonality(tonalities, previousChord.tonality);
      }
      // If no tonality includes the previous note then pick a random one
      if (tonalities.length > 0) {
        const index: number = this.commonService.getRandomIntegerBetween(0, tonalities.length - 1);
        return tonalities[index];
      } else {
        return this.getRandomTonality(previousChord.tonality, onlyMajor, dontRepeat);
      }
    } else {
      // If no previous chord is specified then randomly pick a tonality
      return this.getRandomTonality(undefined, onlyMajor, dontRepeat);
    }
  }

  private stripTonality(tonalities: Array<Tonality>, previousTonality: Tonality | undefined): Array<Tonality> {
    if (previousTonality) {
      let index: number = tonalities.findIndex(tonality => tonality.firstChroma === previousTonality.firstChroma);
      if (index != -1) {
        tonalities.splice(index, 1);
      }
    }
    return tonalities;
  }

  private stripTonalityChroma(tonalityChromas: Array<string>, previousTonality: Tonality | undefined, dontRepeat: boolean): Array<string> {
    if (previousTonality && dontRepeat) {
      let index: number = tonalityChromas.findIndex(chroma => chroma === previousTonality.firstChroma);
      if (index != -1) {
        tonalityChromas.splice(index, 1);
      }
    }
    return tonalityChromas;
  }

  private getRandomTonality(previousTonality: Tonality | undefined, onlyMajor: boolean, dontRepeat: boolean): Tonality {
    if (!onlyMajor) {
      const randomRangeIndex: number = this.commonService.getRandomIntegerBetween(0, 1);
      if (randomRangeIndex == 0) {
        const tonalityChromas = this.stripTonalityChroma(CHROMAS_MAJOR, previousTonality, dontRepeat);
        const randomChromaIndex: number = this.commonService.getRandomIntegerBetween(0, tonalityChromas.length - 1);
        const chroma: string = tonalityChromas[randomChromaIndex];
        return new Tonality(NOTE_RANGE.MAJOR, chroma);
      } else {
        const tonalityChromas = this.stripTonalityChroma(CHROMAS_MINOR, previousTonality, dontRepeat);
        const randomChromaIndex: number = this.commonService.getRandomIntegerBetween(0, tonalityChromas.length - 1);
        const chroma: string = tonalityChromas[randomChromaIndex];
        return new Tonality(NOTE_RANGE.MINOR_NATURAL, chroma);
      }
    } else {
      const tonalityChromas = this.stripTonalityChroma(CHROMAS_MAJOR, previousTonality, dontRepeat);
      const randomChromaIndex: number = this.commonService.getRandomIntegerBetween(0, tonalityChromas.length - 1);
      const chroma: string = tonalityChromas[randomChromaIndex];
      return new Tonality(NOTE_RANGE.MAJOR, chroma);
    }
  }

  // The modulation by a randomised pick of another tonality can be tuned by a setting
  private withModulation(): boolean {
    const modulation: number = this.settingsService.getSettings().generateModulation;
    if (modulation > 0) {
      const randomModulation: number = this.commonService.getRandomIntegerBetween(0, 100);
      if (randomModulation < modulation) {
        return true;
      }
    }
    return false;
  }

  private generateMelodyChords(harmonyMeasures: Array<Measure>, octave: number, chordDuration: number, velocity: number): Array<PlacedChord> {
    const melodyChords: Array<PlacedChord> = new Array();
    let placedChordIndex: number = 0;

    harmonyMeasures.forEach((measure: Measure) => {
      measure.getSortedChords().forEach((harmonyChord: PlacedChord) => {
        const previousMelodyChord: PlacedChord | undefined = melodyChords.length > 0 ? melodyChords[melodyChords.length - 1] : undefined;
        const melodyChordsForOneHarmonyChord: Array<PlacedChord> = this.generateTwoMelodyChordsForOneHarmonyChord(placedChordIndex, previousMelodyChord, harmonyChord, octave, chordDuration, velocity);
        for (let i: number = 0; i < melodyChordsForOneHarmonyChord.length; i++) {
          melodyChords.push(melodyChordsForOneHarmonyChord[i]);
          placedChordIndex++;
        }
      });
    });
    this.notationService.addEndOfTrackNote(melodyChords);
    return melodyChords;
  }

  private generateTwoMelodyChordsForOneHarmonyChord(placedChordIndex: number, previousMelodyChord: PlacedChord | undefined, harmonyChord: PlacedChord, octave: number, chordDuration: number, velocity: number): Array<PlacedChord> {
    const melodyChords: Array<PlacedChord> = new Array();
    let currentMelodyChroma: string | undefined = previousMelodyChord ? this.notationService.getFirstNoteSortedByIndex(previousMelodyChord).renderChroma() : undefined;
    let currentMelodyOctave: number = previousMelodyChord ? this.notationService.getFirstNoteSortedByIndex(previousMelodyChord).renderOctave() : octave;

    if (!this.notationService.isEndOfTrackPlacedChord(harmonyChord)) {
      // For each harmony chord of the harmony track, there are two single note chords of half duration in the melody track
      // The first melody note is one of the harmony chord, and the second melody note is also a note from the same harmony chord or an inpassing note
      // An inpassing note is one that is not in the harmony chord but that is between the previous melody note and another note of the harmony chord even if of another octave
      // So an inpassing note cannot be followed by another inpassing note, but a harmony chord note can be followed by another harmony chord note
      // A melody note of a harmony chord must also be near the previous melody note

      // Get one of the harmony chord notes
      const [firstMelodyChroma, firstMelodyOctave]: [string, number] = this.pickNearNoteFromSourceChord(harmonyChord, currentMelodyChroma, currentMelodyOctave);
      currentMelodyChroma = firstMelodyChroma;
      currentMelodyOctave = firstMelodyOctave;
      // The duration is a quotient base and is thus multiplied by 2 to cut it in half
      const halfDuration: number = chordDuration * 2;
      let placedChord: PlacedChord = this.createNotesAndPlacedChord(currentMelodyOctave, halfDuration, velocity, harmonyChord.tonality, placedChordIndex, [firstMelodyChroma]);
      melodyChords.push(placedChord);

      let inpassingTextNote: string | undefined;
      if (this.fromInpassingNote()) {
        inpassingTextNote = this.pickInpassingNote(harmonyChord, currentMelodyChroma, currentMelodyOctave);
      }

      if (inpassingTextNote) {
        const [inpassingNoteChroma, inpassingNoteOctave]: [string, number] = this.notationService.noteToChromaOctave(inpassingTextNote);
        placedChord = this.createNotesAndPlacedChord(inpassingNoteOctave, halfDuration, velocity, harmonyChord.tonality, placedChordIndex + 1, [inpassingNoteChroma]);
        melodyChords.push(placedChord);
      } else {
        // Get one of the harmony chord notes even the already picked one
        const [secondMelodyChroma, secondMelodyOctave]: [string, number] = this.pickNearNoteFromSourceChord(harmonyChord, currentMelodyChroma, currentMelodyOctave);
        if (secondMelodyChroma == firstMelodyChroma && secondMelodyOctave == firstMelodyOctave) {
          // If the second note is the same as the fisrt one then have only one chord
          // but with a duration that is twice as long
          melodyChords[melodyChords.length - 1].duration = this.notationService.createDuration(chordDuration, TempoUnit.NOTE);
        } else {
          placedChord = this.createNotesAndPlacedChord(secondMelodyOctave, halfDuration, velocity, harmonyChord.tonality, placedChordIndex + 1, [secondMelodyChroma]);
          melodyChords.push(placedChord);
        }
      }
    }
    return melodyChords;
  }

  private generateHarmonyChords(octave: number, chordDuration: number, velocity: number): Array<PlacedChord> {
    const placedChords: Array<PlacedChord> = new Array();
    let placedChordIndex: number = 0;
    let previousChord: PlacedChord | undefined;

    const tonality: Tonality = this.getFirstMeasureTonality();

    const generateNbChords: number = this.settingsService.getSettings().generateNbChords > 0 ? this.settingsService.getSettings().generateNbChords : 1;
    while (placedChordIndex < generateNbChords) {
      const placedChord: PlacedChord | undefined = this.generateHarmonyChord(placedChordIndex, tonality, octave, chordDuration, velocity, previousChord);
      if (placedChord) {
        placedChords.push(placedChord);
        // Add twice the same chord
        if (previousChord && this.settingsService.getSettings().generateDoubleChord) {
          placedChordIndex++;
          if (placedChordIndex < generateNbChords) {
            const clonedChord: PlacedChord = this.notationService.createSameChord(previousChord);
            placedChords.push(clonedChord);
            placedChordIndex++;
          }
        }
      }
    }
    this.notationService.addEndOfTrackNote(placedChords);
    return placedChords;
  }

  private generateHarmonyChordInMeasures(octave: number, chordDuration: number, velocity: number): Array<Measure> {
    let measureIndex: number = 0;
    const measures: Array<Measure> = new Array<Measure>();
    let measure: Measure = this.createMeasure(measureIndex);
    measure.placedChords = new Array<PlacedChord>();
    measures.push(measure);

    const placedChords: Array<PlacedChord> = new Array();
    let chordIndex: number = 0;
    let measureChordIndex: number = 0;
    let previousPreviousChord: PlacedChord | undefined;
    let previousChord: PlacedChord | undefined;

    let tonality: Tonality = this.getFirstMeasureTonality();

    let harmonyChord: PlacedChord | undefined;
    const generateNbChords: number = this.settingsService.getSettings().generateNbChords > 0 ? this.settingsService.getSettings().generateNbChords : 1;
    while (chordIndex < generateNbChords) {
      previousPreviousChord = previousChord;
      previousChord = harmonyChord;

      // The number of beats of the chords placed in a measure must equal the number of beats of the measure
      if (measure.getPlacedChordsNbBeats() >= measure.getNbBeats()) {
        measure = this.createMeasure(measureIndex);
        measure.placedChords = new Array<PlacedChord>();
        measures.push(measure);
        measureIndex++;
        measureChordIndex = 0;
        if (this.withModulation()) {
          // Do not overwrite the first tonality
          if (chordIndex > 0) {
            const randomTonality: Tonality = this.getSibblingTonality(previousPreviousChord, previousChord);
            tonality = new Tonality(randomTonality.range, randomTonality.firstChroma);
          }
          previousChord = undefined;
        }
      }
      harmonyChord = this.generateHarmonyChord(measureChordIndex, tonality, octave, chordDuration, velocity, previousChord);
      if (harmonyChord) {
        measureChordIndex++;
        chordIndex++;
        measure.placedChords.push(harmonyChord);
        // Add twice the same chord
        if (previousChord && this.settingsService.getSettings().generateDoubleChord) {
          if (chordIndex < generateNbChords && measure.getPlacedChordsNbBeats() < measure.getNbBeats()) {
            const clonedChord: PlacedChord = this.notationService.createSameChord(previousChord);
            placedChords.push(clonedChord);
            measureChordIndex++;
            chordIndex++;
          }
        }
      }
    }
    this.notationService.addEndOfTrackNote(placedChords);

    return measures;
  }

  private generateHarmonyChord(placedChordIndex: number, tonality: Tonality, octave: number, chordDuration: number, velocity: number, previousChord: PlacedChord | undefined): PlacedChord | undefined {
    let previousChordSortedChromas: Array<string> = previousChord ? previousChord.getSortedNotesChromas() : [];
    const previousBaseChroma: string | undefined = previousChord ? this.notationService.getFirstNoteSortedByIndex(previousChord).renderChroma() : undefined;
    const tonalityChromas: Array<string> = this.getTonalityChromas(tonality.range, tonality.firstChroma);

    const chromas: Array<string> = this.buildChromas(tonalityChromas, previousBaseChroma);

    // Consider a chord only if it is similar to its previous one
    if (!previousChord || this.isSimilarToPrevious(previousChordSortedChromas, chromas)) {
      return this.createNotesAndPlacedChord(octave, chordDuration, velocity, tonality, placedChordIndex, chromas);
    } else {
      // If the current chord is too dissimilar from its previous one
      // then create a chord from a reversing of the previous one
      if (this.settingsService.getSettings().generateReverseDissimilarChord) {
        const shiftedChromas: Array<string> = this.createShiftedChord(previousChordSortedChromas);
        return this.createNotesAndPlacedChord(octave, chordDuration, velocity, tonality, placedChordIndex, shiftedChromas);
      }
    }
  }

  private buildChromas(tonalityChromas: Array<string>, previousBaseChroma?: string): Array<string> {
    const chromas: Array<string> = new Array();
    const shiftedChromas: Array<Array<string>> = this.getTonalityShiftedChromas(tonalityChromas);

    let chromaIndex: number;
    if (previousBaseChroma) {
      chromaIndex = this.randomlyPickChromaFromTonalityBonuses(tonalityChromas, previousBaseChroma);
    } else {
      // TODO If in major then take within the 0, 2, 4 ones and ignore the others in the 7
      // TODO Implement the randomlyPickChromaFromSomeTonalityChromas method
      chromaIndex = 0; // TODO this.randomlyPickChromaFromSomeTonalityChromas(tonalityChromas);
    }

    for (let noteIndex = 0; noteIndex < this.settingsService.getSettings().generateChordWidth; noteIndex++) {
      chromas.push(shiftedChromas[noteIndex][chromaIndex]);
    }
    return chromas;
  }

  private randomlyPickChromaFromTonality(tonalityChromas: Array<string>): number {
    return this.commonService.getRandomIntegerBetween(0, tonalityChromas.length - 1);
  }

  // Based on the previous chroma bonuses pick one chroma
  private randomlyPickChromaFromTonalityBonuses(tonalityChromas: Array<string>, previousChroma: string): number {
    // The higher the randomliness, the more random the selection
    const RANDOMLINESS: number = 0; // TODO Maybe have a settings
    const MIN_BONUS: number = 3; // TODO Maybe have a settings

    const previousChromaIndex: number = tonalityChromas.indexOf(previousChroma);
    if (previousChromaIndex < 0) {
      throw new Error('The tonality does not contain the chroma ' + previousChroma);
    }
    const chromaBonuses: Array<number> = this.getChromaBonuses(previousChromaIndex);
    const electedChromas: Array<number> = new Array();
    for (let index = 0; index < chromaBonuses.length; index++) {
      let chromaBonus: number = chromaBonuses[index];
      // If a minimum bonus is specified then do not consider the chromas that have a lower bonus
      if ((MIN_BONUS > 0 && chromaBonus >= MIN_BONUS) || 0 === MIN_BONUS) {
        chromaBonus += RANDOMLINESS;
        for (let nb = 0; nb < chromaBonus; nb++) {
          // Thanks to the matrix being mirror like, the chroma is retrieved from the bonus index in the keys array
          electedChromas.push(index);
        }
      }
    }

    // Pick one chroma from the elected ones
    const randomChromaIndex: number = this.commonService.getRandomIntegerBetween(0, electedChromas.length - 1);
    return electedChromas[randomChromaIndex];
  }

  // Get all the possible bonuses for one chroma
  private getChromaBonuses(chromaIndex: number): Array<number> {
    const bonuses: Array<number> | undefined = this.getBonusTable()[chromaIndex];
    if (bonuses) {
      return bonuses;
    } else {
      throw new Error('Unknown bonuses for the chroma: ' + chromaIndex);
    }
  }

  // The table of bonus per chroma
  // For a given chroma there is a series of bonus numbers
  // A bonus represents the level of harmony between a chroma and its following chroma
  // private getBonusTable(): Map<string, Array<number>> {
  //   const bonuses: Map<string, Array<number>> = new Map([
  //     [ 'C', [ 30, 0, 15, 5, 5, 10, 0 ] ],
  //     [ 'D', [ 0, 30, 0, 10, 0, 5, 10 ] ],
  //     [ 'E', [ 15, 0, 30, 0, 10, 0, 0 ] ],
  //     [ 'F', [ 5, 10, 0, 30, 0, 15, 0 ] ],
  //     [ 'G', [ 5, 0, 10, 0, 30, 0, 10 ] ],
  //     [ 'A', [ 10, 5, 0, 15, 0, 30, 0 ] ],
  //     [ 'B', [ 0, 10, 0, 0, 10, 0, 30 ] ]
  //   ]);
  //   return bonuses;
  // }
  private getBonusTable(): Array<Array<number>> {
    const bonuses: Array<Array<number>> = new Array(
      [0, 0, 15, 5, 5, 10, 0],
      [0, 0, 0, 10, 0, 5, 0],
      [15, 0, 0, 0, 10, 0, 0],
      [5, 10, 0, 0, 0, 15, 0],
      [5, 0, 10, 0, 0, 0, 0],
      [10, 5, 0, 15, 0, 0, 0],
      [0, 10, 0, 0, 10, 0, 0]
    );
    return bonuses;
  }

}
