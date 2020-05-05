import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ScreenDeviceService } from 'lib-core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(
    private translateService: TranslateService,
    private screenDeviceService: ScreenDeviceService
  ) {}

  public ngOnInit() {
    const subscription: Subscription = this.translateService.get('app.title').subscribe((text: string) => {
      this.afterLanguageResourcesLoaded();
      subscription.unsubscribe();
    });
  }

  private afterLanguageResourcesLoaded(): void {
    this.setAppMetaData();
  }

  private setAppMetaData(): void {
    this.screenDeviceService.setMetaData({
      title: this.translateService.instant('app.title'),
      description: this.translateService.instant('app.description')
    });
  }

}
