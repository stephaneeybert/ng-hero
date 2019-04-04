import { MatPaginatorIntl } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';

const ITEMS_PER_PAGE = 'PAGINATOR.ITEMS_PER_PAGE';
const NEXT_PAGE = 'PAGINATOR.NEXT_PAGE';
const PREVIOUS_PAGE = 'PAGINATOR.PREVIOUS_PAGE';
const FIRST_PAGE = 'PAGINATOR.FIRST_PAGE';
const LAST_PAGE = 'PAGINATOR.LAST_PAGE';
const OUT_OF = 'PAGINATOR.OUT_OF';

@Injectable()
export class LocalizedPaginator extends MatPaginatorIntl {

  constructor(private translate: TranslateService) {
    super();

    this.translate.onLangChange.subscribe((e: Event) => {
      this.getAndInitTranslations();
    });

    this.getAndInitTranslations();
  }

  getRangeLabel = function (page, pageSize, length) {
    const out_of = this.translate.instant(OUT_OF);
    if (length === 0 || pageSize === 0) {
      return '0 ' + out_of + ' ' + length;
    }
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    // If the start index exceeds the list length, do not try and fix the end index to the end
    const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
    return startIndex + 1 + ' - ' + endIndex + ' ' + out_of + ' ' + length;
  };

  public getAndInitTranslations(): void {
    this.translate.get([
      ITEMS_PER_PAGE,
      NEXT_PAGE,
      PREVIOUS_PAGE,
      FIRST_PAGE,
      LAST_PAGE
    ])
      .subscribe((translation: any) => {
        this.itemsPerPageLabel = translation[ITEMS_PER_PAGE];
        this.nextPageLabel = translation[NEXT_PAGE];
        this.previousPageLabel = translation[PREVIOUS_PAGE];
        this.firstPageLabel = translation[FIRST_PAGE];
        this.lastPageLabel = translation[LAST_PAGE];

        this.changes.next();
      });
  }

}