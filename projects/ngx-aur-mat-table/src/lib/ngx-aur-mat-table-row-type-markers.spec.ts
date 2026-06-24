import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** Хост со всеми тремя типами строк: data + detail (ngxAurExpandedRowDef) + total (totalConverter). */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef let-row="row">
        <span class="d">{{ row.rowSrc.name }}</span>
      </ng-template>
    </aur-mat-table>
  `,
})
class MarkersHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length },
    ],
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('row type markers (aur-data-row / aur-expanded-row / aur-total-row)', () => {
  let fixture: ComponentFixture<MarkersHost>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MarkersHost],
    });
    fixture = TestBed.createComponent(MarkersHost);
    fixture.detectChanges();
  });

  const dataRows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tr.aur-data-row'));
  const detailRows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tr.aur-expanded-row'));
  const totalRow = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('tr.aur-total-row');

  it('маркеры присутствуют на каждом типе строки', () => {
    expect(dataRows().length).toBe(2);
    expect(detailRows().length).toBe(2);
    expect(totalRow()).not.toBeNull();
    // detail сохраняет legacy-класс expanded-row
    detailRows().forEach(r => expect(r.classList.contains('expanded-row')).toBeTrue());
    // total — это footer-строка Material
    expect(totalRow()!.classList.contains('mat-mdc-footer-row')).toBeTrue();
  });

  it('маркеры дизъюнктны (один тип на строку)', () => {
    dataRows().forEach(r => {
      expect(r.classList.contains('aur-expanded-row')).withContext('data !expanded').toBeFalse();
      expect(r.classList.contains('aur-total-row')).withContext('data !total').toBeFalse();
    });
    detailRows().forEach(r => {
      expect(r.classList.contains('aur-data-row')).withContext('detail !data').toBeFalse();
      expect(r.classList.contains('aur-total-row')).withContext('detail !total').toBeFalse();
    });
    const total = totalRow()!;
    expect(total.classList.contains('aur-data-row')).withContext('total !data').toBeFalse();
    expect(total.classList.contains('aur-expanded-row')).withContext('total !expanded').toBeFalse();
  });

  it('back-compat селекторов сохранён', () => {
    // data-строки селектятся «от обратного» — как в существующих expanded-спеках
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)').length).toBe(2);
    // detail-строки по-прежнему ловятся legacy-классом
    expect(fixture.nativeElement.querySelectorAll('tr.expanded-row').length).toBe(2);
  });
});
