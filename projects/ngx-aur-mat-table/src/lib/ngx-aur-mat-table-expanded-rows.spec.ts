import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent, HighlightContainer } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { id: number; name: string; }

/** Базовый хост: дефолтный режим (row-click), single, + [highlight] для проверки развязки. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [highlight]="hl"
                   (expandedRowChange)="single.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class RowClickHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  single: (R | null)[] = [];
  hl: HighlightContainer<R> | undefined;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — row-click (default)', () => {
  let fixture: ComponentFixture<RowClickHostComponent>;
  let host: RowClickHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [RowClickHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RowClickHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('клик раскрывает строку и эмитит rowSrc', () => {
    mainRows()[0].click();
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
    expect(host.single).toEqual([host.data[0]]);
  });

  it('single = аккордеон: клик по другой строке закрывает первую', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    expect(markers()).toEqual(['b details']);
    expect(host.single).toEqual([host.data[0], host.data[1]]);
  });

  it('повторный клик по открытой строке сворачивает её и эмитит null', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual([]);
    expect(host.single).toEqual([host.data[0], null]);
  });

  it('[highlight] не раскрывает и не закрывает уже раскрытую деталь', () => {
    mainRows()[0].click(); fixture.detectChanges();   // раскрыта строка a
    host.hl = { value: host.data[1] };                // подсветить строку b
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);          // деталь a осталась, b не раскрылась
    expect(host.table.highlighted).toBe(host.data[1]); // highlight отработал
  });
});
