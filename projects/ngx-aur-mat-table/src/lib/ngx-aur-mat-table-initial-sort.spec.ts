import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AurPage, AurPageRequest, AurPageSource } from './model/AurPage';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Конфиг с одной сортируемой колонкой; sortCfg/серверная обвязка — через extra. */
function sortableCfg(extra?: Partial<TableConfig<Row>>): TableConfig<Row> {
  return {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, sort: {} }],
    ...extra,
  };
}

/** Порядок текстов ячеек строк тела — как его видит пользователь. */
function renderedNames(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td'))
    .map(td => (td as HTMLElement).textContent!.trim());
}

/** aria-sort заголовка; хосты спека одноколоночные — селектор берёт единственный th. */
function ariaSort(fixture: ComponentFixture<unknown>): string | null {
  const th: HTMLElement | null = fixture.nativeElement.querySelector('th.mat-mdc-header-cell');
  return th?.getAttribute('aria-sort') ?? null;
}

// ---------- server: sortCfg desc ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class InitialSortServerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  calls: AurPageRequest[] = [];
  cfg = sortableCfg({
    paginationCfg: { enable: true, size: 10, mode: 'server' },
    sortCfg: { active: 'name', direction: 'desc' },
  });
  // Сервер «знает лучше»: отвечает по возрастанию, хотя запрошен desc —
  // локальная пересортировка по desc дала бы ['b','a'].
  source: AurPageSource<Row> = (req) => {
    this.calls.push(req);
    const page: AurPage<Row> = { content: [{ name: 'a' }, { name: 'b' }], totalElements: 2, number: req.pageIndex };
    return of(page);
  };
}

describe('NgxAurMatTable initial sort (server)', () => {
  let fixture: ComponentFixture<InitialSortServerHostComponent>;
  let host: InitialSortServerHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [InitialSortServerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InitialSortServerHostComponent);
    host = fixture.componentInstance;
  });

  it('первый запрос уходит с сортировкой из sortCfg, ровно один', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit → стартовая загрузка
    tick();
    expect(host.calls.length).withContext('инициализация не должна дублировать запрос').toBe(1);
    expect(host.calls[0].pageIndex).toBe(0);
    expect(host.calls[0].sort).toEqual(jasmine.objectContaining({ active: 'name', direction: 'desc' }));
  }));

  it('стрелка горит сразу: aria-sort="descending"', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(ariaSort(fixture)).toBe('descending');
  }));

  it('страница отображается в серверном порядке, без локальной пересортировки', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['a', 'b']); // как ответил сервер; локальный desc дал бы ['b','a']
  }));
});

// ---------- server: toggle после initial asc ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class ToggleAfterInitialHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  calls: AurPageRequest[] = [];
  cfg = sortableCfg({
    paginationCfg: { enable: true, size: 10, mode: 'server' },
    sortCfg: { active: 'name', direction: 'asc' },
  });
  source: AurPageSource<Row> = (req) => {
    this.calls.push(req);
    return of({ content: [{ name: 'a' }, { name: 'b' }], totalElements: 2, number: req.pageIndex } as AurPage<Row>);
  };
}

describe('NgxAurMatTable initial sort: toggle', () => {
  let fixture: ComponentFixture<ToggleAfterInitialHostComponent>;
  let host: ToggleAfterInitialHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ToggleAfterInitialHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ToggleAfterInitialHostComponent);
    host = fixture.componentInstance;
  });

  it('клик продолжает цикл от начального состояния: asc → desc', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    // эквивалент клика по заголовку Name; цикл должен продолжиться от initial asc, а не начаться с нуля
    host.table.matSort.sort({ id: 'name', start: 'asc', disableClear: false });
    tick();
    expect(host.calls.length).toBe(2);
    expect(host.calls[1].pageIndex).toBe(0);
    expect(host.calls[1].sort).toEqual(jasmine.objectContaining({ active: 'name', direction: 'desc' }));
  }));
});

// ---------- client: начальный порядок + стрелка ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class InitialSortClientHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg = sortableCfg({ sortCfg: { active: 'name', direction: 'desc' } });
  data: Row[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable initial sort (client)', () => {
  let fixture: ComponentFixture<InitialSortClientHostComponent>;
  let host: InitialSortClientHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [InitialSortClientHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InitialSortClientHostComponent);
    host = fixture.componentInstance;
  });

  it('данные начально отсортированы по sortCfg, стрелка горит', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture)).toEqual(['b', 'a']); // desc
    expect(ariaSort(fixture)).toBe('descending');
  }));
});

// ---------- регрессия: без sortCfg всё как раньше ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class NoInitialSortHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  calls: AurPageRequest[] = [];
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10, mode: 'server' } });
  source: AurPageSource<Row> = (req) => {
    this.calls.push(req);
    return of({ content: [{ name: 'a' }], totalElements: 1, number: req.pageIndex } as AurPage<Row>);
  };
}

describe('NgxAurMatTable initial sort: регрессия без sortCfg', () => {
  let fixture: ComponentFixture<NoInitialSortHostComponent>;
  let host: NoInitialSortHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [NoInitialSortHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(NoInitialSortHostComponent);
    host = fixture.componentInstance;
  });

  it('первый запрос без sort, стрелка не горит', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.calls.length).toBe(1);
    expect(host.calls[0].sort).toBeUndefined();
    expect(ariaSort(fixture)).not.toBe('descending');
    expect(ariaSort(fixture)).not.toBe('ascending');
  }));
});
