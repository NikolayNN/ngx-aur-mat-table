# Explicit Pagination Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `paginationCfg.mode` the single source of truth for the pagination/sort mode, fixing the manual-server regression and removing the back-compat leftovers that made `paginatorState` mean three contradictory things.

**Architecture:** Collapse three scattered "server" signals into two private predicates on `NgxAurMatTableComponent` — `isServerMode()` (`mode==='server' || pageSource`, gates wiring/slicing/state) and `hasPageSource()` (`pageSource`, gates the `ServerPageController`). All paginator/sort/index/timeline wiring routes through `isServerMode()`; `paginatorState` becomes a pure state input. Remove the `@deprecated` `createEmpty` helper and make the positional `PaginatorState` constructor private.

**Tech Stack:** Angular 19 (standalone:false module), TypeScript, Jasmine + Karma, Angular Material table/paginator/sort.

## Global Constraints

- **Target version:** 19.16.0 (leading digit tracks targeted Angular major; breaking changes ship as minor bumps — NOT semver). Bump `projects/ngx-aur-mat-table/package.json` from `19.15.0` to `19.16.0`.
- **Component is `ChangeDetectionStrategy.OnPush`** — any imperative state change that must render calls `this.cdr.markForCheck()`.
- **Dev-only warnings** use `isDevMode()` (already imported in the component) and `console.warn`.
- **Changelog** is Russian, Keep-a-Changelog, authored via the `writing-changelog` skill, under `changelog/`.
- **Conventional-commit messages, Russian**, matching repo style; breaking commits use the `!` marker (e.g. `feat(table)!:`).
- **Run the library test suite** with: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`. Single file: append `--include='**/<file>.spec.ts'`.

---

## File Structure

**Library (`projects/ngx-aur-mat-table/src/`)**
- `lib/ngx-aur-mat-table.component.ts` — predicate definitions + 9 wiring edits (the core change).
- `lib/model/PaginatorState.ts` — constructor made `private`.
- `lib/utils/ngx-aur-table-page-event.utils.ts` — **deleted** (only held the deprecated `createEmpty`).
- `public-api.ts` — drop the deleted util export.
- `lib/ngx-aur-mat-table-manual-server-pagination.spec.ts` — **new** regression spec.
- `lib/ngx-aur-mat-table-server-sort.spec.ts` — rewrite the `LegacyManualHostComponent` pin.
- `lib/model/PaginatorState.spec.ts` — drop the positional-constructor test.

**Demo (`projects/aur-demo/src/app/`)**
- `table-with-manual-server-pagination/table-with-manual-server-pagination.component.{ts,html}` — **new** demo.
- `app.module.ts` — declare the demo component.
- `app.component.html` — add a tab.

**Docs**
- `docs/MIGRATION-19.16.0.md` — **new**.
- `changelog/19.16.0.md` + changelog index — **new** entry.
- `README.md` — pagination section update.
- `projects/ngx-aur-mat-table/package.json` — version bump.

---

## Task 1: Failing regression spec for manual server pagination

Reproduces the bug first: `mode:'server'` + `[paginatorState]` + `[tableData]`, no `pageSource`. On current code the built-in paginator is bound and re-slices the server page.

**Files:**
- Test (create): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-manual-server-pagination.spec.ts`

**Interfaces:**
- Consumes: `NgxAurMatTableComponent` (`tableDataSource`, `matPaginator`, `matSort`, `onPageChangeInternal`), `PaginatorState.of`, `NgxAurMatTableModule`.
- Produces: nothing (test-only).

- [ ] **Step 1: Write the failing spec**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-manual-server-pagination.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageEvent } from '@angular/material/paginator';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { PaginatorState } from './model/PaginatorState';

interface Row { name: string; }

/** 20 rows of an already-fetched server page (page index varies in the test). */
function pageRows(): Row[] {
  return Array.from({ length: 20 }, (_, i) => ({ name: 'r' + i }));
}

function renderedNames(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td'))
    .map(td => (td as HTMLElement).textContent!.trim());
}

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data" [paginatorState]="state"
                   (pageChange)="onPage($event)" (sort)="sortCalls = sortCalls + 1">
    </aur-mat-table>`,
})
class ManualServerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, sort: {} }],
    paginationCfg: { enable: true, size: 20, mode: 'server' },
  };
  data: Row[] = pageRows();
  state = PaginatorState.of({ total: 200, pageIndex: 0 });
  pageEvents: PageEvent[] = [];
  sortCalls = 0;
  onPage(e: PageEvent) { this.pageEvents.push(e); }
}

describe('NgxAurMatTable manual server pagination (mode:server, no pageSource)', () => {
  let fixture: ComponentFixture<ManualServerHostComponent>;
  let host: ManualServerHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ManualServerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ManualServerHostComponent);
    host = fixture.componentInstance;
  });

  it('does not bind the data source paginator or sort', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.table.tableDataSource.paginator).toBeNull();
    expect(host.table.tableDataSource.sort).toBeNull();
  }));

  it('renders all 20 provided rows on page index 0', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(renderedNames(fixture).length).toBe(20);
  }));

  it('renders all 20 provided rows on page index 1 (no re-slice of the server page)', fakeAsync(() => {
    host.state = PaginatorState.of({ total: 200, pageIndex: 1 });
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    // The bug: client paginator slices data.slice(20,40) of a 20-row array → empty / reset.
    expect(renderedNames(fixture).length).toBe(20);
  }));

  it('emits (pageChange) and does not auto-load (data stays as provided)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const before = host.table.tableDataSource.data.length;
    host.table.onPageChangeInternal({ pageIndex: 1, pageSize: 20, previousPageIndex: 0, length: 200 });
    tick();
    expect(host.pageEvents.length).toBe(1);
    expect(host.pageEvents[0].pageIndex).toBe(1);
    // no pageSource → table did not replace data on its own
    expect(host.table.tableDataSource.data.length).toBe(before);
  }));
});
```

- [ ] **Step 2: Run the spec, verify it FAILS**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-manual-server-pagination.spec.ts'`
Expected: FAIL — `tableDataSource.paginator` is the built-in `MatPaginator` (not null), and the page-index-1 test renders 0 rows (the re-slice bug).

- [ ] **Step 3: Commit the failing spec**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-manual-server-pagination.spec.ts
git commit -m "test(table): регрессия ручной серверной пагинации (mode:server без pageSource)"
```

---

## Task 2: Consolidate server predicates and fix the wiring

The core change. Turns Task 1 green and keeps the existing suite green.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

**Interfaces:**
- Consumes: `isDevMode` (already imported), `PaginatorState` (already imported), `this.pageSource`, `this.externalPaginator`, `this.serverPageController`, `this.tableConfig.paginationCfg?.mode`.
- Produces (private API used across the file): `isServerMode(): boolean`, `hasPageSource(): boolean`, `warnPaginationModeMisconfig(): void`. **Removes** `isServerWiring(): boolean`.

- [ ] **Step 1: Replace the predicate definitions**

Find (the `isServerMode`/`isServerWiring` pair):

```ts
  private isServerMode(): boolean {
    return !!this.pageSource;
  }

  private isServerWiring(): boolean {
    return !!this.pageSource || this.tableConfig?.paginationCfg?.mode === 'server';
  }
```

Replace with:

```ts
  /** Server contract: no client paginator/sort binding, no re-slicing, server index offset/timeline. */
  private isServerMode(): boolean {
    return this.tableConfig?.paginationCfg?.mode === 'server' || !!this.pageSource;
  }

  /** Table owns the load loop (declarative). Gates ServerPageController only. */
  private hasPageSource(): boolean {
    return !!this.pageSource;
  }

  /** Dev-mode guards for contradictory pagination wiring. */
  private warnPaginationModeMisconfig(): void {
    if (!isDevMode()) return;
    if (this.tableConfig.paginationCfg?.mode === 'client' && this.pageSource) {
      console.warn('[aur-mat-table] paginationCfg.mode:"client" игнорируется при заданном [pageSource] — режим серверный.');
    }
    if (this.isServerMode() && this.externalPaginator && !this.hasPageSource()) {
      console.warn('[aur-mat-table] внешний пагинатор в ручном серверном режиме не поддерживается; используйте [pageSource] или встроенный пагинатор.');
    }
  }
```

- [ ] **Step 2: `ngOnInit` — seed via `isServerMode()` + run the dev-warn**

Find:

```ts
    this.assertNoReservedColumnKeys();
    if (this.isServerWiring() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
```

Replace with:

```ts
    this.assertNoReservedColumnKeys();
    this.warnPaginationModeMisconfig();
    if (this.isServerMode() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
```

- [ ] **Step 3: `ngAfterViewInit` — start controller only when a `pageSource` exists**

Find:

```ts
    if (this.isServerMode()) {
      this.startServerController();
    }
```

Replace with:

```ts
    if (this.hasPageSource()) {
      this.startServerController();
    }
```

- [ ] **Step 4: `initSortingDataAccessor` — gate on `isServerMode()`**

Find:

```ts
    const sort = this.isServerWiring() ? null : (this.matSort ?? null);
```

Replace with:

```ts
    const sort = this.isServerMode() ? null : (this.matSort ?? null);
```

(`initPaginator()` already gates on `isServerMode()` — no edit there; it is now correct because the predicate is broad.)

- [ ] **Step 5: `prepareTableData` — call `initPaginator()` unconditionally**

Find:

```ts
    if (!this.paginatorState) {
      // Если пагинатор не серверный, то я инициализирую его здесь, иначе при обновлении данных пагинатор ломается и отображаются все элементы
      this.initPaginator();
    }
    this.initSortingDataAccessor();
```

Replace with:

```ts
    // initPaginator() идемпотентен (гвард по target) и сам держит paginator=null в server-режиме —
    // отдельная проверка paginatorState больше не нужна.
    this.initPaginator();
    this.initSortingDataAccessor();
```

- [ ] **Step 6: `_indexPageOffset` — gate on `isServerMode()`**

Find:

```ts
    const pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    this._indexPageOffset = this.paginatorState ? this.paginatorState.pageIndex * pageSize : 0;
```

Replace with:

```ts
    const pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    this._indexPageOffset = (this.isServerMode() && this.paginatorState) ? this.paginatorState.pageIndex * pageSize : 0;
```

- [ ] **Step 7: `getTimelineVisibleData` — gate on `isServerMode()`**

Find:

```ts
    // Server-side: данные уже постраничные, не режем повторно
    if (this.paginatorState) return data;
```

Replace with:

```ts
    // Server-side: данные уже постраничные, не режем повторно
    if (this.isServerMode()) return data;
```

- [ ] **Step 8: `currentPaging` — gate on `isServerMode()` with null-safety**

Find:

```ts
    if (this.paginatorState) {
      total = this.paginatorState.length;
      pageIndex = this.paginatorState.pageIndex;
      pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    } else {
```

Replace with:

```ts
    if (this.isServerMode()) {
      const st = this.paginatorState ?? PaginatorState.empty();
      total = st.length;
      pageIndex = st.pageIndex;
      pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    } else {
```

- [ ] **Step 9: Narrow the controller-touching call sites**

In `sortTable`, find:

```ts
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.onSort(sortParameters);
    }
```

Replace with:

```ts
    if (this.serverPageController) {
      this.serverPageController.onSort(sortParameters);
    }
```

In `onPageChangeInternal`, find:

```ts
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.onPage({ pageIndex: event.pageIndex, pageSize: event.pageSize });
    }
```

Replace with:

```ts
    if (this.serverPageController) {
      this.serverPageController.onPage({ pageIndex: event.pageIndex, pageSize: event.pageSize });
    }
```

In `reload`, find:

```ts
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.reload(opts);
    } else {
```

Replace with:

```ts
    if (this.serverPageController) {
      this.serverPageController.reload(opts);
    } else {
```

- [ ] **Step 10: Run the Task 1 spec, verify it PASSES**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-manual-server-pagination.spec.ts'`
Expected: PASS (all four cases).

- [ ] **Step 11: Run the FULL library suite as the regression gate**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: All green **except** `LegacyManualHostComponent` in `ngx-aur-mat-table-server-sort.spec.ts` may need updated assertions — that is Task 3. If any *other* spec fails, investigate before continuing (likely a missed `isServerMode`/`isServerWiring` call site).

- [ ] **Step 12: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "fix(table)!: paginationCfg.mode — единственный источник режима; фикс ручного server

isServerMode()=mode||pageSource гейтит paginator/sort/индекс/timeline;
hasPageSource()=pageSource гейтит ServerPageController; isServerWiring удалён.
paginatorState больше не переключает режим. dev-warn на mode:client+pageSource
и на внешний пагинатор в ручном server."
```

---

## Task 3: Rewrite the legacy-manual pin (bare paginatorState → fully client)

`LegacyManualHostComponent` previously documented a contradictory half-server state. Update it to pin the new contract: bare `[paginatorState]` without `mode` is uniformly client.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-server-sort.spec.ts` (the block after `// ---------- legacy manual (paginatorState без mode): регрессия ----------`)

**Interfaces:**
- Consumes: `tableDataSource.sort`, `tableDataSource.paginator`, `matSort`, `matPaginator`.

- [ ] **Step 1: Replace the legacy describe block**

Find (lines from the `// ---------- legacy manual` comment through the end of its `describe`):

```ts
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

Replace with:

```ts
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
```

- [ ] **Step 2: Run the server-sort spec, verify PASS**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-server-sort.spec.ts'`
Expected: PASS (the `pageSource` server-sort describe + the new bare-state-client describe).

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-server-sort.spec.ts
git commit -m "test(table): bare paginatorState без mode теперь полностью client"
```

---

## Task 4: Make the `PaginatorState` constructor private

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.spec.ts`

**Interfaces:**
- Produces: `PaginatorState.of({ total, pageIndex })`, `PaginatorState.empty()` remain the only public constructors. `new PaginatorState(...)` no longer compiles outside the class.

- [ ] **Step 1: Make the constructor private**

In `PaginatorState.ts`, find:

```ts
  constructor(private _length: number, private _pageIndex: number) {
  }
```

Replace with:

```ts
  private constructor(private _length: number, private _pageIndex: number) {
  }
```

- [ ] **Step 2: Remove the positional-constructor test**

In `PaginatorState.spec.ts`, find and delete this block (and the blank line after it):

```ts
  it('still supports the positional constructor (back-compat)', () => {
    const state = new PaginatorState(50, 1);
    expect(state.length).toBe(50);
    expect(state.pageIndex).toBe(1);
  });

```

- [ ] **Step 3: Run the PaginatorState spec, verify PASS**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/PaginatorState.spec.ts'`
Expected: PASS (`of` + `empty` cases; positional case removed). No TS compile error for `new PaginatorState` since that usage is gone.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/PaginatorState.ts projects/ngx-aur-mat-table/src/lib/model/PaginatorState.spec.ts
git commit -m "refactor(table)!: PaginatorState — приватный конструктор, только .of()/.empty()"
```

---

## Task 5: Remove the deprecated `createEmpty` helper

**Files:**
- Delete: `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts`
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Modify: `README.md` (drop the deprecated-wiring note)

**Interfaces:**
- Removes from public API: `NgxAurTablePageEventUtils`.

- [ ] **Step 1: Confirm no code call sites remain**

Run: `git grep -n "createEmpty\|NgxAurTablePageEventUtils" -- 'projects/**/*.ts'`
Expected: only the file being deleted (`ngx-aur-table-page-event.utils.ts`) and the `public-api.ts` export. If a `.ts` outside these two references it, migrate that site to `PaginatorState.empty()` before deleting.

- [ ] **Step 2: Delete the util file**

```bash
git rm projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts
```

- [ ] **Step 3: Drop the export line**

In `public-api.ts`, find and delete this line:

```ts
export * from './lib/utils/ngx-aur-table-page-event.utils'
```

- [ ] **Step 4: Remove the README deprecated-wiring note**

In `README.md`, find and delete the blockquote line:

```
> The legacy manual wiring (`[paginatorState]` + `(pageChange)` + `NgxAurTablePageEventUtils.createEmpty`) still works but is deprecated in favour of `pageSource`.
```

(If neighboring sentences reference `createEmpty`, trim them so the paragraph still reads cleanly — the manual path now uses `mode: 'server'` + `PaginatorState.of(...)`.)

- [ ] **Step 5: Build the library to verify the public surface compiles**

Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds with no reference to the deleted symbol.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(table)!: удалить deprecated NgxAurTablePageEventUtils.createEmpty"
```

---

## Task 6: Manual-server demo

A demo that exercises the fixed manual path: `mode:'server'` + `[paginatorState]` + `(pageChange)`, no `pageSource`. Reuses the existing demo `CustomerService` and `Page` model.

**Files:**
- Create: `projects/aur-demo/src/app/table-with-manual-server-pagination/table-with-manual-server-pagination.component.ts`
- Create: `projects/aur-demo/src/app/table-with-manual-server-pagination/table-with-manual-server-pagination.component.html`
- Modify: `projects/aur-demo/src/app/app.module.ts`
- Modify: `projects/aur-demo/src/app/app.component.html`

**Interfaces:**
- Consumes: `CustomerService.page(pageIndex, pageSize): Observable<Page<Customer>>` (from `../table-with-server-pagination-component/customer.service`), `PaginatorState.of`, `TableConfig`.

- [ ] **Step 1: Create the component**

Create `table-with-manual-server-pagination.component.ts`:

```ts
import { Component, OnInit } from '@angular/core';
import { PaginatorState, TableConfig } from 'ngx-aur-mat-table';
import { PageEvent } from '@angular/material/paginator';
import { Customer } from '../shared/model/customer';
import { CustomerService } from '../table-with-server-pagination-component/customer.service';

@Component({
  selector: 'app-table-with-manual-server-pagination',
  templateUrl: './table-with-manual-server-pagination.component.html',
  standalone: false,
})
export class TableWithManualServerPaginationComponent implements OnInit {
  private customerService = new CustomerService();

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    paginationCfg: { enable: true, size: 20, sizes: [8, 15, 20, 25], mode: 'server' },
  };

  tableData: Customer[] = [];
  paginatorState = PaginatorState.empty();

  ngOnInit(): void {
    this.loadPage({ pageIndex: 0, pageSize: 20, previousPageIndex: 0, length: 0 });
  }

  loadPage(event: PageEvent): void {
    this.customerService.page(event.pageIndex, event.pageSize).subscribe(page => {
      this.tableData = page.content;
      this.paginatorState = PaginatorState.of({ total: page.totalElements, pageIndex: page.number });
    });
  }
}
```

- [ ] **Step 2: Create the template**

Create `table-with-manual-server-pagination.component.html`:

```html
<aur-mat-table
  [tableConfig]="tableConfig"
  [tableData]="tableData"
  [paginatorState]="paginatorState"
  (pageChange)="loadPage($event)">
</aur-mat-table>
```

- [ ] **Step 3: Declare the component in `app.module.ts`**

Add the import near the other server-pagination imports:

```ts
import {
  TableWithManualServerPaginationComponent
} from "./table-with-manual-server-pagination/table-with-manual-server-pagination.component";
```

Add to the `declarations` array (after `TableWithServerPaginationAndSelectComponent`):

```ts
    TableWithManualServerPaginationComponent,
```

- [ ] **Step 4: Add a tab in `app.component.html`**

After the `С пагинацией BATCH` tab block, insert:

```html
  <mat-tab label="Ручная server пагинация">
    <ng-template matTabContent>
      <h3>mode:'server' + [paginatorState] + (pageChange), без pageSource</h3>
      <app-table-with-manual-server-pagination></app-table-with-manual-server-pagination>
    </ng-template>
  </mat-tab>
```

- [ ] **Step 5: Build the demo app to verify it compiles and wires up**

Run: `npx ng build aur-demo`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add projects/aur-demo/src/app/table-with-manual-server-pagination projects/aur-demo/src/app/app.module.ts projects/aur-demo/src/app/app.component.html
git commit -m "docs(demo): пример ручной серверной пагинации (mode:server без pageSource)"
```

---

## Task 7: Version bump, migration doc, changelog, README

**Files:**
- Modify: `projects/ngx-aur-mat-table/package.json` (version → `19.16.0`)
- Create: `docs/MIGRATION-19.16.0.md`
- Create: `changelog/19.16.0.md` + update changelog index
- Modify: `README.md` (pagination section)

**Interfaces:** none (docs/metadata).

- [ ] **Step 1: Bump the library version**

In `projects/ngx-aur-mat-table/package.json`, change:

```json
  "version": "19.15.0",
```

to:

```json
  "version": "19.16.0",
```

- [ ] **Step 2: Write the migration guide**

Create `docs/MIGRATION-19.16.0.md` with the three before/after tables (A, B, C) verbatim from the spec `docs/superpowers/specs/2026-06-29-pagination-mode-explicit-design.md`, followed by per-item migration snippets:

````markdown
# Миграция на 19.16.0 — явный режим пагинации

`paginationCfg.mode` теперь единственный переключатель режима. `paginatorState` — только состояние пагинатора (total + индекс страницы), он больше не включает серверный режим.

## A. Поведение по конфигурации
<таблица A из спеки>

## B. Почему было путано — по подсистемам
<таблица B из спеки>

## C. Публичный API
<таблица C из спеки>

## Что менять в приложении

### 1. Ручная серверная пагинация — добавьте `mode: 'server'`
```ts
// было (работало случайно через присутствие paginatorState):
paginationCfg: { enable: true, size: 20 }
// стало:
paginationCfg: { enable: true, size: 20, mode: 'server' }
```
Разметка без изменений: `[tableData]="page.content"` + `[paginatorState]` + `(pageChange)`.

### 2. bare `[paginatorState]` без `mode` теперь client
Если вы полагались на серверное поведение без `mode` — добавьте `mode: 'server'` (см. п.1). Иначе таблица будет нарезать данные локально.

### 3. `new PaginatorState(total, idx)` → `PaginatorState.of(...)`
```ts
// было:
new PaginatorState(total, pageIndex)
// стало:
PaginatorState.of({ total, pageIndex })
```

### 4. `NgxAurTablePageEventUtils.createEmpty(cfg)` удалён
В серверном режиме начальное состояние сеется автоматически (`PaginatorState.empty()`).
Если нужно явно — используйте `PaginatorState.empty()`.
````

Fill the `<таблица …>` placeholders with the actual table markdown copied from the spec.

- [ ] **Step 3: Write the changelog entry**

Invoke the `writing-changelog` skill to add the `19.16.0` entry (Russian, Keep-a-Changelog), with a **Breaking** section covering: `paginationCfg.mode` as the single mode switch; `paginatorState` is state-only; private `PaginatorState` constructor; removed `NgxAurTablePageEventUtils.createEmpty`; and the manual-server pagination fix. Link to `docs/MIGRATION-19.16.0.md`.

- [ ] **Step 4: Update the README pagination section**

In `README.md`, ensure the pagination section presents `mode` as the single switch and the three-row contract:

```markdown
| Конфигурация | Поведение |
|---|---|
| `mode: 'client'` / не задан | Пагинация и сортировка локально |
| `mode: 'server'` + `[paginatorState]` + `(pageChange)` | Ручная серверная пагинация (данные грузит родитель) |
| `mode: 'server'` + `[pageSource]` | Декларативная серверная пагинация (рекомендуется) |
```

Add a note: «`paginatorState` — только состояние пагинатора; режим задаётся только `mode` (а `pageSource` всегда означает server)».

- [ ] **Step 5: Full suite + build sanity check**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: all green.
Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/package.json docs/MIGRATION-19.16.0.md changelog README.md
git commit -m "docs(table): 19.16.0 — bump, миграция, чейнджлог, README по явному mode"
```

---

## Self-Review notes (resolved)

- **Spec coverage:** Detailed-changes §1–10 → Task 2 (steps 1–9); `PaginatorState` private ctor → Task 4; remove `createEmpty` → Task 5; rewrite legacy pin → Task 3; new manual-server spec → Task 1; demo → Task 6; before/after tables A/B/C + migration + changelog + README + version → Task 7. The two dev-warns (contradiction + unsupported external) → Task 2 step 1/2. No spec requirement is left without a task.
- **`isServerWiring()` removal:** its only two callers (`ngOnInit` seed, `initSortingDataAccessor`) are converted to `isServerMode()` in Task 2 steps 2 and 4; safe to delete in step 1.
- **Type/name consistency:** `isServerMode()`, `hasPageSource()`, `warnPaginationModeMisconfig()` used consistently; `PaginatorState.of`/`.empty()` used everywhere a state is built; demo imports `CustomerService` from the existing server-pagination demo folder; `Page.number` is the page index (per `page.model.ts`).
- **Ordering:** Task 1 fails → Task 2 fixes → Task 3 realigns the only other affected existing spec. Tasks 4–7 are independent cleanups/docs and can run in any order after Task 2.
