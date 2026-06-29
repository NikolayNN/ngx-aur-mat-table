import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of } from 'rxjs';
import { AurPage, AurPageRequest, AurPageSource } from './model/AurPage';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { PaginatorState } from './model/PaginatorState';

interface Row { name: string; }

/** Конфиг с одной сортируемой колонкой; серверная обвязка добавляется через extra. */
function sortableCfg(extra?: Partial<TableConfig<Row>>): TableConfig<Row> {
  return {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, sort: {} }],
    ...extra,
  };
}

/** Порядок текстов ячеек строк тела — как его видит пользователь (DOM, не .data). */
function renderedNames(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td'))
    .map(td => (td as HTMLElement).textContent!.trim());
}

/** Эквивалент клика по заголовку Name: MatSort выставляет asc и эмитит matSortChange. */
function sortByNameAsc(table: NgxAurMatTableComponent<Row>): void {
  table.matSort.sort({ id: 'name', start: 'asc', disableClear: false });
}

// ---------- pageSource: серверный порядок и запросы ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class ServerSortHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  calls: AurPageRequest[] = [];
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10, mode: 'server' } });
  // Сервер «знает лучше»: отвечает в порядке, который локальный asc-компаратор перевернул бы.
  source: AurPageSource<Row> = (req) => {
    this.calls.push(req);
    const page: AurPage<Row> = { content: [{ name: 'b' }, { name: 'a' }], totalElements: 2, number: req.pageIndex };
    return of(page);
  };
}

describe('NgxAurMatTable server sort (pageSource)', () => {
  let fixture: ComponentFixture<ServerSortHostComponent>;
  let host: ServerSortHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ServerSortHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerSortHostComponent);
    host = fixture.componentInstance;
  });

  it('отображает страницу в серверном порядке, без локальной пересортировки', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit → первая загрузка
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['b', 'a']);

    sortByNameAsc(host.table); // локальный asc дал бы ['a','b']
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['b', 'a']); // ровно как ответил сервер
  }));

  it('передаёт сортировку в pageSource и сбрасывает на страницу 0', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    // matSortChange эмитится синхронно → onSort уже отправил запрос; tick() флашит of()-ответ
    sortByNameAsc(host.table);
    tick();
    expect(host.calls.length).withContext('одна начальная загрузка + один sort-запрос, без дублей').toBe(2);
    expect(host.calls[1].pageIndex).toBe(0);
    expect(host.calls[1].sort).toEqual(jasmine.objectContaining({ active: 'name', direction: 'asc' }));
  }));

  it('не привязывает MatSort к dataSource в серверном режиме', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(host.table.tableDataSource.sort).toBeNull();
  }));
});

// ---------- pageSource: in-flight (ответ приходит не сразу) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class DeferredServerSortHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  pending = new Subject<AurPage<Row>>();
  private first = true;
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10, mode: 'server' } });
  // Первая загрузка отвечает сразу, повторные — вручную через pending.
  source: AurPageSource<Row> = () => {
    if (this.first) {
      this.first = false;
      return of({ content: [{ name: 'b' }, { name: 'a' }], totalElements: 2 } as AurPage<Row>);
    }
    return this.pending.asObservable();
  };
}

describe('NgxAurMatTable server sort: in-flight', () => {
  let fixture: ComponentFixture<DeferredServerSortHostComponent>;
  let host: DeferredServerSortHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DeferredServerSortHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DeferredServerSortHostComponent);
    host = fixture.componentInstance;
  });

  it('не «прыгает» локально, пока отсортированная страница грузится', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['b', 'a']);

    sortByNameAsc(host.table); // запрос ушёл, ответа ещё нет
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['b', 'a']); // старая страница не пересортирована

    host.pending.next({ content: [{ name: 'a2' }, { name: 'b2' }], totalElements: 2 });
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['a2', 'b2']); // пришёл серверный порядок
  }));
});

// ---------- клиентский режим: регрессия ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClientSortHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg = sortableCfg(); // без paginationCfg/pageSource
  data: Row[] = [{ name: 'b' }, { name: 'a' }];
}

describe('NgxAurMatTable client sort (регрессия)', () => {
  let fixture: ComponentFixture<ClientSortHostComponent>;
  let host: ClientSortHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientSortHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientSortHostComponent);
    host = fixture.componentInstance;
  });

  it('клик сортирует локально, MatSort привязан', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.table.tableDataSource.sort).toBe(host.table.matSort);

    sortByNameAsc(host.table);
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['a', 'b']);
  }));
});

// ---------- bare paginatorState без mode → полностью client (новый контракт 19.16.0) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data" [paginatorState]="state"></aur-mat-table>`,
})
class BareStateNoModeHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10 } }); // БЕЗ mode → client
  data: Row[] = [{ name: 'b' }, { name: 'a' }];
  state = PaginatorState.of({ total: 42, pageIndex: 0 });
}

describe('NgxAurMatTable bare paginatorState без mode → client', () => {
  let fixture: ComponentFixture<BareStateNoModeHostComponent>;
  let host: BareStateNoModeHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [BareStateNoModeHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BareStateNoModeHostComponent);
    host = fixture.componentInstance;
  });

  it('без mode пагинатор и сортировка привязаны к dataSource (client)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.table.tableDataSource.sort).toBe(host.table.matSort);
    expect(host.table.tableDataSource.paginator).toBe(host.table.matPaginator);
  }));

  it('сортировка работает локально', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    sortByNameAsc(host.table);
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['a', 'b']);
  }));
});
