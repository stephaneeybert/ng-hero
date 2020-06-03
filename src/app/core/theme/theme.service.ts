import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { ThemeMenuOption } from './theme-menu-option';
import { Subject } from 'rxjs';

const DEFAULT_THEME: string = 'indigo';
const THEME_MENU_OPTIONS_PATH: string = 'assets/themes/options.json';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private customTheme: Subject<string> = new Subject<string>();
  customTheme$: Observable<string> = this.customTheme.asObservable();

  private isDarkTheme: Subject<boolean> = new Subject<boolean>();
  isDarkTheme$: Observable<boolean> = this.isDarkTheme.asObservable();

  constructor(
    private httpClient: HttpClient
  ) { }

  // TODO Have another list than this json file
  public getThemeOptions(): Observable<Array<ThemeMenuOption>> {
    return this.httpClient.get<Array<ThemeMenuOption>>(THEME_MENU_OPTIONS_PATH);
  }

  public getDefaultThemeName(): string {
    return DEFAULT_THEME;
  }

  public setDefaultTheme(): void {
    this.setCustomTheme(DEFAULT_THEME);
  }

  public setCustomTheme(customTheme: string): void {
    this.customTheme.next(customTheme);
  }

  public setDarkTheme(isDarkTheme: boolean): void {
    this.isDarkTheme.next(isDarkTheme);
  }

}
