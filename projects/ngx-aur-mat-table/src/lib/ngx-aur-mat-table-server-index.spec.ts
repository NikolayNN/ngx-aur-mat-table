import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AurPage, AurPageSource } from './model/AurPage';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Индексы строк: ячейка колонки tbl_index в каждой строке тела (стабильный класс CDK). */
function readIndices(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'))
    .map(tr => ((tr as HTMLElement).querySelector('td.cdk-column-tbl_index') as HTMLElement).textContent!.trim());
}

// ---------- server (pageSource) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class ServerIndexHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { offset: 1 },
    paginationCfg: { enable: true, size: 20, mode: 'server' },
  };
  // три строки на любой странице; id = позиция в массиве (0..2) — абсолютный номер даёт offset
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }, { name: 'b' }, { name: 'c' }], totalElements: 100, number: req.pageIndex } as AurPage<Row>);
}

describe('NgxAurMatTable server index offset', () => {
  let fixture: ComponentFixture<ServerIndexHostComponent>;
  let host: ServerIndexHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ServerIndexHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerIndexHostComponent);
    host = fixture.componentInstance;
  });

  it('страница 0: индексы начинаются с offset (1,2,3)', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit → стартовая загрузка (pageIndex 0)
    tick();
    fixture.detectChanges();
    expect(readIndices(fixture)).toEqual(['1', '2', '3']);
  }));

  it('страница 2: индекс смещён на pageIndex*pageSize (41,42,43)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    host.table.onPageChangeInternal({ pageIndex: 2, pageSize: 20, length: 100, previousPageIndex: 0 });
    tick();
    fixture.detectChanges();
    expect(readIndices(fixture)).toEqual(['41', '42', '43']); // 2*20 + (0,1,2) + offset(1)
  }));
});

// ---------- client (регрессия) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClientIndexHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { offset: 1 },
    paginationCfg: { enable: true, size: 5 }, // клиентская пагинация, без mode/pageSource
  };
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('NgxAurMatTable client index (регрессия)', () => {
  let fixture: ComponentFixture<ClientIndexHostComponent>;
  let host: ClientIndexHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientIndexHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientIndexHostComponent);
    host = fixture.componentInstance;
  });

  it('страница 0: индексы 1..5', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(readIndices(fixture)).toEqual(['1', '2', '3', '4', '5']);
  }));

  it('страница 2: нумерация продолжается 6..10 (offset не задвоился)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    // навигация встроенного пагинатора: ids сквозные (5..9) → format(id)+offset = 6..10
    const pg = host.table.matPaginator;
    pg.pageIndex = 1;
    pg.page.emit({ pageIndex: 1, pageSize: 5, length: 12, previousPageIndex: 0 });
    tick();
    fixture.detectChanges();
    expect(readIndices(fixture)).toEqual(['6', '7', '8', '9', '10']);
  }));
});

// ---------- client без пагинации (gating на paginatorState) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClientNoPaginationHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { offset: 1 },
  };
  data: Row[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
}

describe('NgxAurMatTable index: client без пагинации', () => {
  let fixture: ComponentFixture<ClientNoPaginationHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientNoPaginationHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientNoPaginationHostComponent);
  });

  it('без paginatorState offset не применяется: индексы 1..3', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(readIndices(fixture)).toEqual(['1', '2', '3']);
  }));
});

// ---------- server + formatter (порядок offset → formatter) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class ServerFormatterHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { offset: 1, formatter: i => `${i}.` },
    paginationCfg: { enable: true, size: 20, mode: 'server' },
  };
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }, { name: 'b' }, { name: 'c' }], totalElements: 100, number: req.pageIndex } as AurPage<Row>);
}

describe('NgxAurMatTable server index + formatter', () => {
  let fixture: ComponentFixture<ServerFormatterHostComponent>;
  let host: ServerFormatterHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ServerFormatterHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerFormatterHostComponent);
    host = fixture.componentInstance;
  });

  it('formatter видит абсолютный номер на странице 2: 41.,42.,43.', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    host.table.onPageChangeInternal({ pageIndex: 2, pageSize: 20, length: 100, previousPageIndex: 0 });
    tick();
    fixture.detectChanges();
    expect(readIndices(fixture)).toEqual(['41.', '42.', '43.']);
  }));
});
