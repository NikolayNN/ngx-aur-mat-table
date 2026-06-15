# Начальное состояние сортировки (sortCfg) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новый опциональный `TableConfig.sortCfg: { active, direction }` — стрелка в заголовке горит сразу, первый `pageSource`-запрос уходит с этой сортировкой, клиентские данные начально отсортированы; без `sortCfg` поведение прежнее.

**Architecture:** Контракт (интерфейс `TableSortConfig`) + два биндинга `[matSortActive]`/`[matSortDirection]` на `<table>`; код компонента не меняется (`startServerController()` уже читает `matSort.active`). TDD: 4 красных + 2 пина.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-12-initial-sort-design.md`

**Контекст ветки:** работаем в `feat/19.7.0-feedback` (батч, коммит на пункт). НЕ мержить, ветку не трогать. `public-api.ts` правки НЕ требует — там уже есть `export * from './lib/model/ColumnConfig'`, новый интерфейс экспортируется автоматически.

---

### Task 1: Контракт + красный спек

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (поле в `TableConfig` ~строка 60; новый интерфейс после `SortConfig` ~строка 230)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-initial-sort.spec.ts`

- [ ] **Step 1.1: Поле `sortCfg` в `TableConfig`.** Найти в `ColumnConfig.ts`:

```ts
  /**
   * Настройка пагинации таблицы
   */
  paginationCfg?: PaginationConfig,
```

заменить на:

```ts
  /**
   * Настройка пагинации таблицы
   */
  paginationCfg?: PaginationConfig,

  /** Начальная сортировка. Не задан — без начальной сортировки (текущее поведение). */
  sortCfg?: TableSortConfig,
```

- [ ] **Step 1.2: Интерфейс `TableSortConfig`.** Найти конец интерфейса `SortConfig` (после пункта 1 JSDoc у `customSort` уже новый):

```ts
  /**
   * Кастомное значение строки для локальной сортировки колонки.
   * В серверном режиме (`pageSource` или `paginationCfg.mode: 'server'`)
   * не применяется — порядок строк определяет сервер.
   */
  customSort?: (data: TableRow<T>, key: string) => any;
}
```

заменить на (добавляется новый интерфейс после закрывающей скобки):

```ts
  /**
   * Кастомное значение строки для локальной сортировки колонки.
   * В серверном режиме (`pageSource` или `paginationCfg.mode: 'server'`)
   * не применяется — порядок строк определяет сервер.
   */
  customSort?: (data: TableRow<T>, key: string) => any;
}

/**
 * Начальная сортировка таблицы: стрелка в заголовке + начальный порядок.
 * Это начальное состояние, а не реактивный контрол: смена значения в рантайме
 * передвинет стрелку, но не пересортирует данные и не вызовет серверный запрос.
 */
export interface TableSortConfig {
  /**
   * Ключ колонки из `columnsCfg`, у которой включён `sort`.
   * Ключ колонки без `sort` (или несуществующий) стрелку не покажет,
   * но в клиентском режиме данные по нему всё равно отсортируются.
   */
  active: string;
  /** Направление начальной сортировки. */
  direction: 'asc' | 'desc';
}
```

- [ ] **Step 1.3: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-initial-sort.spec.ts`:

```ts
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

/** aria-sort единственного заголовка (сортируемая колонка Name). */
function ariaSort(fixture: ComponentFixture<unknown>): string | null {
  const th: HTMLElement = fixture.nativeElement.querySelector('th.mat-mdc-header-cell');
  return th.getAttribute('aria-sort');
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
```

- [ ] **Step 1.4: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-initial-sort.spec.ts'
```

Ожидание — ровно 4 FAIL и 2 PASS:
- FAIL «первый запрос уходит с сортировкой…» (`calls[0].sort` сейчас undefined);
- FAIL «стрелка горит сразу…» (aria-sort не descending);
- FAIL «данные начально отсортированы…» (клиент: порядок `['a','b']`, стрелки нет);
- FAIL «клик продолжает цикл…» (без initial первый клик даёт `asc`, не `desc`);
- PASS «страница отображается в серверном порядке…» (пин пункта 1 — sort отвязан);
- PASS «первый запрос без sort…» (регрессионный пин).

Иное распределение — остановиться и разобраться, не подгонять.

---

### Task 2: Зелёный — два биндинга в шаблоне

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:35-36` (`<table>`)

- [ ] **Step 2.1: Биндинги.** Найти:

```html
      <table #table mat-table matSort
             [trackBy]="trackByRow"
```

заменить на:

```html
      <table #table mat-table matSort
             [matSortActive]="tableConfig.sortCfg?.active ?? ''"
             [matSortDirection]="tableConfig.sortCfg?.direction ?? ''"
             [trackBy]="trackByRow"
```

- [ ] **Step 2.2: Зелёный прогон** того же спека (команда из Step 1.4). Ожидание: 6 PASS, 0 FAIL.

- [ ] **Step 2.3: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: 149 of 149 SUCCESS (143 существующих + 6 новых), 0 FAILED. Примечание: у таблиц без `sortCfg` биндинги дают `matSort.active = ''` вместо прежнего undefined — все существующие проверки (`startServerController`, `updateTimelineBounds`, `_orderData`) обрабатывают `''` и undefined одинаково (falsy), падений быть не должно. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (абзац **Sorting:** в секции server pagination)

- [ ] **Step 3.1: README.** Найти абзац:

```md
**Sorting:** a click on a sortable header issues a new `pageSource` request (`req.sort = { active, direction }`, page reset to 0). The page is rendered exactly in the order the server returned it — the table never re-sorts a server page locally, and `ColumnConfig.sort.customSort` is ignored in server mode.
```

заменить на (добавляется второе предложение в тот же абзац):

```md
**Sorting:** a click on a sortable header issues a new `pageSource` request (`req.sort = { active, direction }`, page reset to 0). The page is rendered exactly in the order the server returned it — the table never re-sorts a server page locally, and `ColumnConfig.sort.customSort` is ignored in server mode. **Initial state:** `sortCfg: { active: 'name', direction: 'desc' }` in the table config lights the header arrow immediately and makes the first `pageSource` request carry this sort.
```

- [ ] **Step 3.2: Сборка библиотеки**:

```bash
npm run build_lib
```

Ожидание: успешно, без ошибок.

- [ ] **Step 3.3: Коммит** (один на пункт; спека/план уже закоммичены):

```powershell
git add projects/ngx-aur-mat-table/src/lib README.md
git commit -m @'
feat(sort): initial sort state via tableConfig.sortCfg

sortCfg: { active, direction } drives [matSortActive]/[matSortDirection] on
the table: the header arrow is lit from the start, the first pageSource
request carries the configured sort (exactly one request — initialization
does not emit matSortChange), and client mode sorts the data on init.
This is initial state, not a reactive control: runtime changes move the
arrow but do not re-sort or refetch. Without sortCfg behavior is unchanged.
'@
```

После коммита `git show --stat HEAD`: ровно 4 файла — `model/ColumnConfig.ts`, `ngx-aur-mat-table.component.html`, `ngx-aur-mat-table-initial-sort.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
