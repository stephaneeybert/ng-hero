import { Injectable } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { Measure } from '@app/model/measure/measure';
import { NotationService } from './notation.service';
import { SoundtrackService } from '@app/views/soundtrack/soundtrack.service';
import { Soundtrack } from '@app/model/soundtrack';
import { Track } from '@app/model/track';
import { CommonService } from '@stephaneeybert/lib-core';
import { DEFAULT_TEMPO_BPM } from './notation.constant ';

const DEFAULT_TIME_SIGNATURE_NUMERATOR: number = 2;
const DEFAULT_TIME_SIGNATURE_DENOMINATOR: number = 4;
const DEFAULT_VELOCITY: number = 1;

const MIDI_NOTE_MIN: number = 0;
const MIDI_NOTE_MAX: number = 128;
const MIDI_NOTE_DURATION: number = 300;

@Injectable({
  providedIn: 'root'
})
export class MelodyService {

  constructor(
    private soundtrackService: SoundtrackService,
    private commonService: CommonService,
    private notationService: NotationService,
  ) { }

  public addDummyMelody(): Soundtrack {
    const endOfTrackNote: string = this.notationService.buildEndOfTrackNote();
    const textMeasures: Array<string> = [
      'C5/8 D5/8 E5/8 F5/8',
      'G5/8 A5/8 B5/8 C6/8',
      'D6/8 E6/8 F6/8 G6/8',
      'A6/8 B6/8 C7/8',
      'C5/8 rest/8 D5/16 C5/16 B4/16 C5/16',
      'E5/8 rest/8 F5/16 E5/16 D#5/16 E5/16',
      'B5/16 A5/16 G#5/16 A5/16 B5/16 A5/16 G#5/16 A5/16',
      'C6/4 A5/8 C6/8',
      'B5/8 A5/8 G5/8 A5/8',
      'B5/8 A5/8 G5/8 A5/8',
      'B5/8 A5/8 G5/8 F#5/8',
      'E5/4' + ' ' + endOfTrackNote];

    const soundtrackName: string = 'Demo soundtrack';
    const measures: Array<Measure> = this.notationService.parseMeasures(textMeasures, DEFAULT_TEMPO_BPM, DEFAULT_TIME_SIGNATURE_NUMERATOR, DEFAULT_TIME_SIGNATURE_DENOMINATOR, DEFAULT_VELOCITY);
    const soundtrack: Soundtrack = this.soundtrackService.createSoundtrack(soundtrackName, soundtrackName);
    const melodyTrack: Track = soundtrack.addTrack(measures);
    melodyTrack.displayChordNames = true;
    this.soundtrackService.storeSoundtrack(soundtrack);
    return soundtrack;
  }

  public getRandomMidiNotes$(): Observable<number> {
    return interval(MIDI_NOTE_DURATION)
      .pipe(
        map(data => this.commonService.getRandomIntegerBetween(MIDI_NOTE_MIN, MIDI_NOTE_MAX - 1))
      );
  }

}
