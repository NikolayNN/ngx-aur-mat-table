# Авто-offset индекса в серверном режиме — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В серверном (`pageSource`) режиме колонка индекса показывает абсолютный номер строки через страницы (`pageIndex*pageSize + позиция + offset`), а не `1..N` на каждой странице. Клиентский режим не затронут.

**Architecture:** Предвычисляемое поле `_indexPageOffset` в `prepareTableData()` (0 в клиентском режиме, `pageIndex*pageSize` при наличии `paginatorState`) + одна правка шаблона `format(element.id + _indexPageOffset)`. `IndexProvider` не меняется. TDD: 1 красный (страница 2) + 3 пина.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-15-server-index-offset-design.md`

**Контекст ветки:** `feat/19.7.0-feedback`, коммит на пункт. НЕ мержить. `public-api.ts` правки не требует (поле внутреннее).

---

### Task 1: Красный спек (без правок исходников)

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-server-index.spec.ts`

Тесты проверяют только DOM (отображённые индексы), поле `_indexPageOffset` не упоминают — поэтому красная фаза компилируется без изменений компонента.

- [ ] **Step 1.1: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-server-index.spec.ts`:

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

/** Индексы строк: колонка tbl_index стоит первой → первый td каждой строки тела. */
function readIndices(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'))
    .map(tr => ((tr as HTMLElement).querySelector('td:first-child') as HTMLElement).textContent!.trim());
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
```

- [ ] **Step 1.2: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-server-index.spec.ts'
```

Ожидание — 1 FAIL и 3 PASS:
- PASS «страница 0: 1,2,3» (на странице 0 offset == 0 и без фикса — пин);
- FAIL «страница 2: 41,42,43» (без фикса серверная страница 2 показывает `1,2,3`);
- PASS «client страница 0: 1..5» (клиент уже корректен — пин);
- PASS «client страница 2: 6..10» (ids сквозные — пин).

Если распределение иное (особенно если падает client-навигация «6..10» — значит пагинатор не перерисовал срез) — остановиться, разобраться, доложить с логами. НЕ подгонять.

---

### Task 2: Зелёный — поле + вычисление + биндинг

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (поле рядом с `_alignClass`/`_rowsInteractive` ~строка 120-123; вычисление в `prepareTableData()` после `paginationProvider` ~строка 416)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:163`

- [ ] **Step 2.1: Поле.** Найти:

```ts
  /** Строки интерактивны (clickCfg задан) → tabindex/клавиатурная активация. */
  _rowsInteractive = false;
```

заменить на:

```ts
  /** Строки интерактивны (clickCfg задан) → tabindex/клавиатурная активация. */
  _rowsInteractive = false;

  /** Смещение индекса строки на номер страницы в серверном режиме (pageIndex*pageSize); 0 в клиентском. */
  _indexPageOffset = 0;
```

- [ ] **Step 2.2: Вычисление в `prepareTableData()`.** Найти:

```ts
    this.paginationProvider = PaginationProvider.create(this.tableConfig);
```

заменить на:

```ts
    this.paginationProvider = PaginationProvider.create(this.tableConfig);

    // Серверная страница содержит только свои строки (id = позиция в странице) — смещаем индекс
    // на номер страницы. Клиентский режим режет весь датасет локально (id сквозной) → offset 0.
    const pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    this._indexPageOffset = this.paginatorState ? this.paginatorState.pageIndex * pageSize : 0;
```

- [ ] **Step 2.3: Биндинг шаблона.** В `ngx-aur-mat-table.component.html` найти (строка 163, тело колонки индекса):

```html
            {{ indexProvider.format(element.id) }}
```

заменить на:

```html
            {{ indexProvider.format(element.id + _indexPageOffset) }}
```

- [ ] **Step 2.4: Зелёный прогон** того же спека (команда из Step 1.2). Ожидание: 4 PASS, 0 FAIL.

- [ ] **Step 2.5: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **162 of 162 SUCCESS** (158 существующих + 4 новых), 0 FAILED. Особое внимание: `ngx-aur-mat-table-column-offsets.spec.ts`, `ngx-aur-mat-table-display-columns*.spec.ts`, любые спеки с `indexCfg`. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (~строка 113, после абзаца **First/last buttons:**)

- [ ] **Step 3.1: README.** Найти абзац:

```md
**First/last buttons:** `paginationCfg.showFirstLastButtons: false` hides the built-in paginator's jump-to-first/last buttons (default shown). Bound straight to the config, so swapping the `tableConfig` reference at runtime (e.g. on a breakpoint) toggles them without rebuilding data.
```

и добавить ПОСЛЕ него отдельный абзац (пустая строка до и после):

```md
**Row index across pages:** with `indexCfg` in server mode the index column shows the absolute row number (`pageIndex * pageSize + position`), so page 2 continues 21, 22, … rather than restarting at 1. Client-mode pagination is unaffected (the index already spans the full dataset).
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
fix(index): absolute row index across pages in server mode

In server (pageSource) mode tableData holds only the current page, so row
ids are 0..N within the page and the index column restarted at 1 on every
page. Add _indexPageOffset = pageIndex * pageSize (0 in client mode, gated
on paginatorState like currentPaging/getTimelineVisibleData) and render
format(element.id + _indexPageOffset). Client mode is unchanged — its ids
already span the full dataset. Fixes the "server-индексы" audit bug.
'@
```

После коммита `git show --stat HEAD`: ровно 4 файла — `ngx-aur-mat-table.component.ts`, `ngx-aur-mat-table.component.html`, `ngx-aur-mat-table-server-index.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
