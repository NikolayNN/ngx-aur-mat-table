# Серверный режим сортировки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В серверной обвязке (`pageSource` или `paginationCfg.mode: 'server'`) таблица перестаёт пересортировывать серверную страницу локально; стрелки и передача сортировки в `pageSource` сохраняются.

**Architecture:** Одна строка в `initSortingDataAccessor()` — не привязывать `MatSort` к `MatTableDataSource` при `isServerWiring()` (зеркало `initPaginator()`). TDD: новый спек с 3 красными тестами и 3 регрессионными пинами.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-12-server-sort-mode-design.md`

**Контекст ветки:** работаем в `feat/19.7.0-feedback` (батч из нескольких пунктов, коммит на пункт). НЕ мержить в master и не удалять ветку — после этого пункта в ней продолжатся следующие.

---

### Task 1: Красный — спек серверной сортировки

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-server-sort.spec.ts`

- [ ] **Step 1.1: Создать спек-файл** с этим содержимым:

```ts
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
    sortByNameAsc(host.table);
    tick();
    expect(host.calls.length).toBe(2);
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

// ---------- legacy manual (paginatorState без mode): регрессия ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data" [paginatorState]="state"></aur-mat-table>`,
})
class LegacyManualHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg = sortableCfg({ paginationCfg: { enable: true, size: 10 } }); // БЕЗ mode: legacy-путь
  data: Row[] = [{ name: 'b' }, { name: 'a' }];
  state = PaginatorState.of({ total: 42, pageIndex: 0 });
}

describe('NgxAurMatTable legacy manual sort (регрессия)', () => {
  let fixture: ComponentFixture<LegacyManualHostComponent>;
  let host: LegacyManualHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [LegacyManualHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LegacyManualHostComponent);
    host = fixture.componentInstance;
  });

  it('paginatorState без mode сохраняет локальную сортировку', fakeAsync(() => {
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
```

- [ ] **Step 1.2: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-server-sort.spec.ts'
```

Ожидание — ровно 3 FAIL и 3 PASS:
- FAIL «отображает страницу в серверном порядке…» (локальная пересортировка даёт `['a','b']`);
- FAIL «не «прыгает» локально…» (старая страница пересортирована до ответа);
- FAIL «не привязывает MatSort к dataSource…» (`sort` сейчас привязан);
- PASS «передаёт сортировку в pageSource…» (обвязка запросов уже работает — пин);
- PASS «клик сортирует локально…» (клиентская регрессия — пин);
- PASS «paginatorState без mode…» (legacy-регрессия — пин).

Если красные/зелёные распределились иначе — остановиться и разобраться, не подгонять тесты.

---

### Task 2: Зелёный — одна строка в `initSortingDataAccessor()`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:361-372` (`initSortingDataAccessor`)

- [ ] **Step 2.1: Правка.** Заменить первую строку тела метода:

Было:

```ts
  private initSortingDataAccessor(): void {
    const sort = this.matSort ?? null;
```

Стало:

```ts
  private initSortingDataAccessor(): void {
    // Серверная обвязка: сортирует сервер — не привязываем MatSort к dataSource, иначе
    // _orderData пересортировал бы серверную страницу по значениям valueConverter
    // (зеркало initPaginator(), который по той же причине не привязывает пагинатор).
    // Стрелки и matSortChange живут на директиве MatSort и от привязки не зависят.
    const sort = this.isServerWiring() ? null : (this.matSort ?? null);
```

Остальное тело метода (гвард `!==`, `sortingDataAccessor`) не трогать.

- [ ] **Step 2.2: Зелёный прогон** того же спека (команда из Step 1.2). Ожидание: 6 PASS, 0 FAIL.

- [ ] **Step 2.3: Полный прогон** всех тестов библиотеки:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: 0 FAIL. Особое внимание: `ngx-aur-mat-table-pagination.spec.ts` и `ngx-aur-mat-table-total-row-visibility.spec.ts` (используют `mode: 'server'`), `ngx-aur-mat-table.component.spec.ts` (клиентская сортировка). Любое падение — разбираться, не подгонять.

---

### Task 3: Документация + коммит пункта

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:215-224` (JSDoc `SortConfig.customSort`)
- Modify: `README.md` (секция «Server pagination via `pageSource`»)

- [ ] **Step 3.1: JSDoc `customSort`.** Текущий комментарий устаревший («Ключ колонки» описывает параметр, а не поле). Заменить:

Было:

```ts
  /**
   * Ключ колонки
   */
  customSort?: (data: TableRow<T>, key: string) => any;
```

Стало:

```ts
  /**
   * Кастомное значение строки для локальной сортировки колонки.
   * В серверном режиме (`pageSource` или `paginationCfg.mode: 'server'`)
   * не применяется — порядок строк определяет сервер.
   */
  customSort?: (data: TableRow<T>, key: string) => any;
```

- [ ] **Step 3.2: README.** После абзаца про `AurPage<T>` (заканчивается «…so a backend `Page<T>` is returned with no mapping.») и перед legacy-примечанием вставить:

```md
**Sorting:** a click on a sortable header issues a new `pageSource` request (`req.sort = { active, direction }`, page reset to 0). The page is rendered exactly in the order the server returned it — the table never re-sorts a server page locally, and `ColumnConfig.sort.customSort` is ignored in server mode.
```

- [ ] **Step 3.3: Сборка библиотеки** (компилируемость типов/доков):

```bash
npm run build_lib
```

Ожидание: успешная сборка, без ошибок.

- [ ] **Step 3.4: Коммит** (один на пункт батча; спека/план уже закоммичены отдельно):

```bash
git add projects/ngx-aur-mat-table/src/lib README.md
git commit -m "fix(sort): keep server page order — MatSort not bound to dataSource in server wiring

With pageSource or paginationCfg.mode: 'server', MatTableDataSource no longer
re-sorts the loaded page by valueConverter values: no more local jump of the
old page right after a header click, and the server-defined order is no longer
overwritten when the response lands. Arrows and matSortChange live on the
MatSort directive and are unaffected. customSort is inert in server mode
(documented). Legacy manual wiring (paginatorState without mode) keeps local
sorting."
```

Changelog-запись — при бампе 19.7.0 (скилл writing-changelog), не в этом коммите.
