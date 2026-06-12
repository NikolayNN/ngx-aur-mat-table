import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { AurPage, AurPageLoadedEvent, AurPageSource } from './model/AurPage';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Конфиг с одной сортируемой колонкой; обвязка — через extra. */
function sortableCfg(extra?: Partial<TableConfig<Row>>): TableConfig<Row> {
  return {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, sort: {} }],
    ...extra,
  };
}

// ---------- pageSource: успешные загрузки ----------

@Component({
  standalone: false,
  // t.paginatorState читается прямо в биндинге: на момент эмита ViewChild хоста может
  // быть ещё не присвоен, а template-ссылка доступна всегда
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"
                            (pageLoaded)="onLoaded($event, t.paginatorState?.length)"></aur-mat-table>`,
})
class PageLoadedHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  events: AurPageLoadedEvent<Row>[] = [];
  stateLengthAtEmit: number[] = [];
  cfg = sortableCfg({
    paginationCfg: { enable: true, size: 10, mode: 'server' },
    sortCfg: { active: 'name', direction: 'desc' },
  });
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }, { name: 'b' }], totalElements: 42, number: req.pageIndex } as AurPage<Row>);

  onLoaded(e: AurPageLoadedEvent<Row>, stateLength?: number): void {
    this.events.push(e);
    this.stateLengthAtEmit.push(stateLength ?? -1);
  }
}

describe('NgxAurMatTable pageLoaded (pageSource)', () => {
  let fixture: ComponentFixture<PageLoadedHostComponent>;
  let host: PageLoadedHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PageLoadedHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PageLoadedHostComponent);
    host = fixture.componentInstance;
  });

  it('стартовая загрузка с sortCfg: ровно один pageLoaded с применённой страницей', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit → стартовая загрузка
    tick();
    expect(host.events.length).withContext('initial sort не должен дублировать событие').toBe(1);
    expect(host.events[0]).toEqual({
      content: [{ name: 'a' }, { name: 'b' }],
      totalElements: 42,
      pageIndex: 0,
    });
  }));

  it('смена страницы: второй эмит с новым pageIndex', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    host.table.onPageChangeInternal({ pageIndex: 2, pageSize: 10, length: 42, previousPageIndex: 0 });
    tick();
    expect(host.events.length).toBe(2);
    expect(host.events[1].pageIndex).toBe(2);
    expect(host.events[1].totalElements).toBe(42);
  }));

  it('к моменту эмита paginatorState уже применён', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(host.stateLengthAtEmit).toEqual([42]); // length == totalElements события
    expect(host.stateLengthAtEmit[0]).toBe(host.events[0].totalElements); // инвариант, не магическое число
  }));
});

// ---------- pageSource: ошибка ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [pageSource]="source"
                            (pageLoaded)="loaded = loaded + 1"
                            (pageError)="errors.push($event)"></aur-mat-table>`,
})
class PageErrorHostComponent {
  loaded = 0;
  errors: unknown[] = [];
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10, mode: 'server' } });
  source: AurPageSource<Row> = () => throwError(() => new Error('boom'));
}

describe('NgxAurMatTable pageLoaded: ошибка загрузки', () => {
  let fixture: ComponentFixture<PageErrorHostComponent>;
  let host: PageErrorHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PageErrorHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PageErrorHostComponent);
    host = fixture.componentInstance;
  });

  it('pageError есть, pageLoaded нет', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(host.errors.length).toBe(1);
    expect(host.loaded).toBe(0);
  }));
});

// ---------- клиентский режим: события нет ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"
                            (pageLoaded)="loaded = loaded + 1"></aur-mat-table>`,
})
class ClientNoPageLoadedHostComponent {
  loaded = 0;
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10 } });
  data: Row[] = [{ name: 'a' }];
}

describe('NgxAurMatTable pageLoaded: клиентский режим', () => {
  let fixture: ComponentFixture<ClientNoPageLoadedHostComponent>;
  let host: ClientNoPageLoadedHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientNoPageLoadedHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientNoPageLoadedHostComponent);
    host = fixture.componentInstance;
  });

  it('tableData без pageSource: события нет', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.loaded).toBe(0);
  }));
});

// ---------- pageSource: пустая страница ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [pageSource]="source"
                            (pageLoaded)="events.push($event)"></aur-mat-table>`,
})
class EmptyPageHostComponent {
  events: AurPageLoadedEvent<Row>[] = [];
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10, mode: 'server' } });
  source: AurPageSource<Row> = () =>
    of({ content: [], totalElements: 0 } as AurPage<Row>);
}

describe('NgxAurMatTable pageLoaded: пустая страница', () => {
  let fixture: ComponentFixture<EmptyPageHostComponent>;
  let host: EmptyPageHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [EmptyPageHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EmptyPageHostComponent);
    host = fixture.componentInstance;
  });

  it('content: [] эмитится как обычная успешная загрузка', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(host.events.length).toBe(1);
    expect(host.events[0]).toEqual({ content: [], totalElements: 0, pageIndex: 0 });
  }));
});
