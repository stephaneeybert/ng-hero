import { Injectable } from '@angular/core';
import { Store } from './store';
import { CommonService } from '@app/core/service/common.service';
import { Soundtrack } from '@app/model/soundtrack';
import { Observable } from 'rxjs';
import { SoundtrackStorageService } from '@app/views/soundtrack/soundtrack-storage.service';

@Injectable({
  providedIn: 'root'
})
export class SoundtrackStore extends Store<Array<Soundtrack>> {

  constructor(
    private commonService: CommonService,
    private soundtrackStorageService: SoundtrackStorageService
  ) {
    super(new Array<Soundtrack>());
  }

  public loadAllFromStorage(): void {
    const soundtrackJsons: Array<any> = this.soundtrackStorageService.getAllSoundtracks();
    if (soundtrackJsons && soundtrackJsons.length > 0) {
      const soundtracks: Array<Soundtrack> = new Array();
      soundtrackJsons.forEach((soundtrackJson: any) => {
        const soundtrack: Soundtrack = this.soundtrackStorageService.cleanUpInstance(soundtrackJson);
        soundtracks.push(soundtrack);
      });
      this.setState(soundtracks);
    }
  }

  public getSoundtracks$(): Observable<Array<Soundtrack>> {
    return this.state$!;
  }

  public getSoundtracks(): Array<Soundtrack> {
    return this.getState();
  }

  public add(soundtrack: Soundtrack) {
    const index = this.getSoundtrackIndex(soundtrack.id);
    if (index === -1) {
      soundtrack.id = this.commonService.normalizeName(soundtrack.id);
      const soundtracks = this.getState();
      soundtracks.push(soundtrack);
      this.setState(soundtracks);
      this.storeSoundtrack(soundtrack);
    }
  }

  public delete(soundtrack: Soundtrack): boolean {
    const index = this.getSoundtrackIndex(soundtrack.id);
    if (index !== -1) {
      const soundtracks = this.getState();
      soundtracks.splice(index, 1);
      this.setState(soundtracks);

      this.soundtrackStorageService.deleteSoundtrack(soundtrack.id);
      return true;
    } else {
      return false;
    }
  }

  public setSoundtrackKeyboard(soundtrack: Soundtrack, keyboard: any) {
    soundtrack.keyboard = keyboard;
    this.setSoundtrack(soundtrack);
  }

  public setSoundtrackSynth(soundtrack: Soundtrack, synth: any) {
    soundtrack.synth = synth;
    this.setSoundtrack(soundtrack);
  }

  public setAndStoreSoundtrack(soundtrack: Soundtrack) {
    this.setSoundtrack(soundtrack);
    this.storeSoundtrack(soundtrack);
  }

  private storeSoundtrack(soundtrack: Soundtrack): void {
    const cleanSoundtrack: Soundtrack = this.soundtrackStorageService.cleanUpInstance(soundtrack);
    this.soundtrackStorageService.setSoundtrack(cleanSoundtrack);
  }

  public setSoundtrack(soundtrack: Soundtrack) {
    const index = this.getSoundtrackIndex(soundtrack.id);
    if (index !== -1) {
      const soundtracks = this.getState();
      soundtracks[index] = soundtrack;
      this.setState(soundtracks);
    }
  }

  public findByName(soundtrackId: string, name: string): Soundtrack | void {
    for (let soundtrack of this.getSoundtracks()) {
      if (soundtrack.name === name && soundtrack.id !== soundtrackId) {
        return soundtrack;
      }
    }
  }

  private getSoundtrackIndex(soundtrackName: string): number {
    return this.getState().findIndex((soundtrack: Soundtrack) => {
      return this.commonService.normalizeName(soundtrack.id) === this.commonService.normalizeName(soundtrackName);
    });
  }

}
