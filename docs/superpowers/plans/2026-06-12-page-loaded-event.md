# Событие (pageLoaded) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новый `@Output() pageLoaded` (`{content, totalElements, pageIndex}`) эмитится после каждой успешно применённой серверной страницы (`pageSource`-режим) — родитель получает данные для счётчиков/графиков без `tap()` в загрузчике.

**Architecture:** Тип `AurPageLoadedEvent<T>` в `AurPage.ts` + output в компоненте (контракт — красная фаза) + одна строка эмита в коллбеке `onResult` после `refreshTable()` (зелёная). `ServerPageController` не меняется. TDD: 3 красных + 2 пина.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-12-page-loaded-event-design.md`

**Контекст ветки:** работаем в `feat/19.7.0-feedback` (батч, коммит на пункт). НЕ мержить. `public-api.ts` правки не требует (`export * from './lib/model/AurPage'` уже есть).

**Замечание для красной фазы:** output объявляется уже в Task 1 (контракт API), но НЕ эмитится — иначе при strictTemplates биндинг `(pageLoaded)` в тест-хостах не скомпилируется. Красные тесты падают по отсутствию эмиссий, не по компиляции.

---

### Task 1: Контракт (тип + output) + красный спек

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/AurPage.ts` (тип после `AurPage`)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (~строка 189-190: output рядом с `loadingChange`/`pageError`; импорт типа)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-page-loaded.spec.ts`

- [ ] **Step 1.1: Тип в `AurPage.ts`.** Найти:

```ts
export interface AurPage<T> {
  content: T[];
  totalElements: number;
  number?: number; // индекс страницы; при отсутствии используется request.pageIndex
}
```

заменить на (добавляется интерфейс после):

```ts
export interface AurPage<T> {
  content: T[];
  totalElements: number;
  number?: number; // индекс страницы; при отсутствии используется request.pageIndex
}

/** Данные применённой серверной страницы (pageSource-режим) — для счётчиков/графиков родителя. */
export interface AurPageLoadedEvent<T> {
  content: T[];
  totalElements: number;
  pageIndex: number;
}
```

- [ ] **Step 1.2: Output в компоненте.** В `ngx-aur-mat-table.component.ts` найти:

```ts
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() pageError = new EventEmitter<unknown>();
```

заменить на:

```ts
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() pageError = new EventEmitter<unknown>();

  /**
   * Успешно загруженная и УЖЕ применённая серверная страница (pageSource-режим).
   * Эмитится на каждую успешную загрузку: старт, смена страницы, сортировка, reload().
   * При ошибке не эмитится (см. pageError). В ручном/legacy режиме события нет —
   * хост загружает данные сам.
   */
  @Output() pageLoaded = new EventEmitter<AurPageLoadedEvent<T>>();
```

И дополнить существующий импорт из `'./model/AurPage'`:

```ts
import {AurPage, AurPageSource} from './model/AurPage';
```

(если импортируется только `AurPageSource` — добавить `AurPageLoadedEvent` к фактическому списку):

```ts
import {AurPageLoadedEvent, AurPageSource} from './model/AurPage';
```

Эмит НЕ добавлять — это Task 2.

- [ ] **Step 1.3: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-page-loaded.spec.ts`:

```ts
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
  }));

  it('к моменту эмита paginatorState уже применён', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(host.stateLengthAtEmit).toEqual([42]); // length == totalElements события
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
```

- [ ] **Step 1.4: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-page-loaded.spec.ts'
```

Ожидание — ровно 3 FAIL и 2 PASS:
- FAIL «стартовая загрузка с sortCfg…» (output объявлен, но не эмитится → 0 событий);
- FAIL «смена страницы…» (0 событий вместо 2);
- FAIL «к моменту эмита paginatorState…» (пустой массив);
- PASS «pageError есть, pageLoaded нет» (пин: ошибка уже идёт в pageError);
- PASS «tableData без pageSource: события нет» (пин клиентского режима).

Иное распределение — остановиться и разобраться, не подгонять.

---

### Task 2: Зелёный — эмит в `onResult`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (~строка 781, `startServerController`)

- [ ] **Step 2.1: Эмит.** Найти в `startServerController()`:

```ts
      onResult: result => {
        this.paginatorState = result.state;
        this.applyExternalPaginatorState(result.state);
        this.tableData = result.content;
        this.refreshTable();
        this.cdr.markForCheck();
      },
```

заменить на:

```ts
      onResult: result => {
        this.paginatorState = result.state;
        this.applyExternalPaginatorState(result.state);
        this.tableData = result.content;
        this.refreshTable();
        // эмит ПОСЛЕ refreshTable(): подписчик читает уже применённое публичное состояние таблицы
        this.pageLoaded.emit({
          content: result.content,
          totalElements: result.state.length,
          pageIndex: result.state.pageIndex,
        });
        this.cdr.markForCheck();
      },
```

- [ ] **Step 2.2: Зелёный прогон** того же спека (команда из Step 1.4). Ожидание: 5 PASS, 0 FAIL.

- [ ] **Step 2.3: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **154 of 154 SUCCESS** (149 существующих + 5 новых), 0 FAILED. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (после абзаца **Sorting:** в секции server pagination)

- [ ] **Step 3.1: README.** Найти абзац, начинающийся с `**Sorting:**` (заканчивается «…makes the first `pageSource` request carry this sort.»), и добавить ПОСЛЕ него отдельный абзац (пустая строка до и после):

```md
**Page data for the host:** `(pageLoaded)` emits `{ content, totalElements, pageIndex }` after each successfully applied page — handy for header counters and charts. `loadingChange` and `pageError` cover the rest of the load lifecycle.
```

- [ ] **Step 3.2: Сборка**:

```bash
npm run build_lib
```

Ожидание: успешно, без ошибок.

- [ ] **Step 3.3: Коммит** (один на пункт):

```powershell
git add projects/ngx-aur-mat-table/src/lib README.md
git commit -m @'
feat(pagination): pageLoaded event with the applied server page

(pageLoaded) emits { content, totalElements, pageIndex } from the
ServerPageController onResult callback after refreshTable(): the parent
reads consistent public table state (header counters, charts) without
wrapping pageSource in tap(). Emitted on every successful load (start,
page change, sort, reload); errors keep going to pageError; no event in
manual/legacy/client modes.
'@
```

После коммита `git show --stat HEAD`: ровно 4 файла — `model/AurPage.ts`, `ngx-aur-mat-table.component.ts`, `ngx-aur-mat-table-page-loaded.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
