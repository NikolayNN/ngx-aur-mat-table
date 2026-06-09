import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { AurPage, AurPageSource } from './model/AurPage';
import { PaginatorState } from './model/PaginatorState';

interface Row { name: string; }

// ---- client, paginated, total enabled ----
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClientTotalHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
    paginationCfg: { enable: true, size: 5 },
  };
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('isTotalRowVisible — client mode', () => {
  let fixture: ComponentFixture<ClientTotalHost>;
  let host: ClientTotalHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientTotalHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientTotalHost);
    host = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit (paginator bound)
  });

  it('default: hidden on a non-last page, shown on the last page', () => {
    // 12 rows / size 5 => pages 0,1,2 ; start on page 0
    expect(host.table.isTotalRowVisible()).toBeFalse();
    host.table.activePaginator.lastPage(); // -> pageIndex 2
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });

  it('showOnEveryPage:true keeps it visible on every page', () => {
    host.table.tableConfig.totalRowCfg = { enable: true, showOnEveryPage: true };
    expect(host.table.isTotalRowVisible()).toBeTrue(); // page 0
    host.table.activePaginator.lastPage();
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });

  it('explicit showOnEveryPage:false matches the default (hidden on a non-last page)', () => {
    host.table.tableConfig.totalRowCfg = { enable: true, showOnEveryPage: false };
    expect(host.table.isTotalRowVisible()).toBeFalse(); // page 0 of 3
  });

  it('single page (data fits) is treated as the last page', () => {
    host.data = [{ name: 'only' }];
    fixture.detectChanges(); // ngOnChanges(tableData) -> refresh
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });

  it('empty data is visible (lastPageIndex clamped to 0)', () => {
    host.data = [];
    fixture.detectChanges();
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });
});

// ---- pagination disabled ----
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class NoPaginationHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
  };
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('isTotalRowVisible — pagination disabled', () => {
  let fixture: ComponentFixture<NoPaginationHost>;
  let host: NoPaginationHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [NoPaginationHost],
    }).compileComponents();
    fixture = TestBed.createComponent(NoPaginationHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is always visible when pagination is off', () => {
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });
});

// ---- server mode ----
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class ServerTotalHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
    paginationCfg: { enable: true, size: 10, mode: 'server' },
  };
  // 42 elements / size 10 => pages 0..4, lastPageIndex 4
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }], totalElements: 42, number: req.pageIndex } as AurPage<Row>);
}

describe('isTotalRowVisible — server mode', () => {
  let fixture: ComponentFixture<ServerTotalHost>;
  let host: ServerTotalHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ServerTotalHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerTotalHost);
    host = fixture.componentInstance;
  });

  it('default: hidden on first page, shown on the last (via paginatorState)', fakeAsync(() => {
    fixture.detectChanges(); // ngAfterViewInit -> startServerController loads page 0
    tick();
    fixture.detectChanges();
    expect(host.table.paginatorState?.pageIndex).toBe(0);
    expect(host.table.isTotalRowVisible()).toBeFalse();

    host.table.activePaginator.lastPage(); // -> pageIndex 4, fetches last page
    tick();
    fixture.detectChanges();
    expect(host.table.paginatorState?.pageIndex).toBe(4);
    expect(host.table.isTotalRowVisible()).toBeTrue();
  }));

  it('uses the live paginator page size for last-page detection', fakeAsync(() => {
    fixture.detectChanges(); // load page 0
    tick();
    fixture.detectChanges();

    // User shrinks page size 10 -> 5: 42 rows now span 9 pages (last index 8).
    host.table.activePaginator.pageSize = 5;

    // Page 5 of 9 is NOT the last page -> hidden.
    // (With the old static size=10 this would be wrongly treated as past the last page.)
    host.table.paginatorState = PaginatorState.of({ total: 42, pageIndex: 5 });
    expect(host.table.isTotalRowVisible()).toBeFalse();

    // Page 8 IS the last page with size 5 -> visible.
    host.table.paginatorState = PaginatorState.of({ total: 42, pageIndex: 8 });
    expect(host.table.isTotalRowVisible()).toBeTrue();
  }));

  it('showOnEveryPage:true is visible on the first server page', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    host.table.tableConfig.totalRowCfg = { enable: true, showOnEveryPage: true };
    expect(host.table.isTotalRowVisible()).toBeTrue(); // pageIndex 0, not last, but flag wins
  }));
});

describe('total footer row rendering (DOM) — client mode', () => {
  let fixture: ComponentFixture<ClientTotalHost>;
  let host: ClientTotalHost;

  const footerRow = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('tr.mat-mdc-footer-row');
  const footerHidden = (): boolean => {
    const el = footerRow();
    return !!el && el.style.display === 'none';
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientTotalHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientTotalHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('default: footer row is hidden on page 0, visible on the last page', () => {
    expect(footerRow()).withContext('footer row should be rendered in the DOM').toBeTruthy();
    expect(footerHidden()).withContext('hidden on page 0').toBeTrue();
    host.table.activePaginator.lastPage(); // -> last page
    fixture.detectChanges();
    expect(footerRow()).withContext('row should be in DOM on last page').toBeTruthy();
    expect(footerRow()!.style.display).withContext('visible on last page').not.toBe('none');
  });

  it('showOnEveryPage:true keeps the footer visible on page 0', () => {
    host.table.tableConfig.totalRowCfg = { enable: true, showOnEveryPage: true };
    fixture.detectChanges();
    expect(footerRow()).withContext('row should be in DOM').toBeTruthy();
    expect(footerRow()!.style.display).withContext('visible on page 0 with showOnEveryPage').not.toBe('none');
  });
});
