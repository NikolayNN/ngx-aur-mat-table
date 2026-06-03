# Pagination `pageSource` + `mode` + `externalPaginator` + `reload` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an ergonomic, additive server-pagination API (`[pageSource]`), an explicit `mode` flag, an external-paginator input, and a public `reload()` to `ngx-aur-mat-table`, without breaking the existing client/server wiring.

**Architecture:** A new Angular-free `ServerPageController<T>` owns the server fetch loop (initial load, page/sort events, `reload()`, `switchMap` cancellation, loading/error). The component wires Angular bits (paginator/sort events, applying results) and resolves a single `activePaginator = externalPaginator ?? matPaginator`. Server data reuses the existing `paginatorState` machinery so `MatTableDataSource` never re-slices it.

**Tech Stack:** Angular (standalone:false components, OnPush), Angular Material (`MatPaginator`/`MatSort`/`MatTableDataSource`), RxJS, Karma + Jasmine.

**Spec:** `docs/superpowers/specs/2026-06-02-pagination-pagesource-design.md`

---

## File Structure

**Create:**
- `projects/ngx-aur-mat-table/src/lib/model/AurPage.ts` — contract types `AurPageRequest`, `AurPage<T>`, `AurPageSource<T>`.
- `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.ts` — Angular-free server fetch controller.
- `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.spec.ts` — unit tests for the controller.
- `projects/ngx-aur-mat-table/src/lib/model/AurPage.spec.ts` — type-level/runtime assignability test for Spring-Data-shaped page.
- Demo: `projects/aur-demo/src/app/table-with-server-filters/` (`*.component.ts` + `*.component.html`).
- Demo: `projects/aur-demo/src/app/table-with-external-paginator/` (`*.component.ts` + `*.component.html`).

**Modify:**
- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — add `mode?` to `PaginationConfig` (interface near line 209).
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — `PaginatorState.of`, new inputs/outputs, `activePaginator`, `reload()`, controller wiring (lines 47-63 for `PaginatorState`; inputs around 133-153; `ngAfterViewInit` ~264; `getTimelineVisibleData`/`resetPaginatorPageIndex`/`onPageChangeInternal`/`sortTable`).
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — guard built-in `<mat-paginator>` with `!externalPaginator` (lines 404-415).
- `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts` — `@deprecated` on `createEmpty`.
- `projects/ngx-aur-mat-table/src/public-api.ts` — export new types + controller.
- `projects/aur-demo/src/app/app.module.ts` + `app.component.html` — register demos.
- `README.md`, `changelog` — docs.

**Test command (single file):**
`npx ng test ngx-aur-mat-table --watch=false --include='**/<file>.spec.ts'`

**Test command (all lib):**
`npx ng test ngx-aur-mat-table --watch=false`

---

## Task 1: `AurPage` contract types

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/model/AurPage.ts`
- Test: `projects/ngx-aur-mat-table/src/lib/model/AurPage.spec.ts`

- [ ] **Step 1: Write the failing test**

`AurPage.spec.ts`:

```ts
import { Observable, of } from 'rxjs';
import { AurPage, AurPageSource } from './AurPage';

// Mirrors the consuming app's Spring Data Page<T> (extra fields included on purpose).
class SpringPage<T> {
  empty = false;
  first = true;
  last = false;
  number = 0;
  numberOfElements = 0;
  totalElements = 0;
  totalPages = 0;
  content: T[] = [];
}

describe('AurPage contract', () => {
  it('accepts a Spring-Data-shaped Page<T> as AurPage<T> with no mapping', () => {
    const page = new SpringPage<{ id: number }>();
    page.content = [{ id: 1 }];
    page.totalElements = 1;

    const asAurPage: AurPage<{ id: number }> = page; // must compile (structural)
    expect(asAurPage.content.length).toBe(1);
    expect(asAurPage.totalElements).toBe(1);
    expect(asAurPage.number).toBe(0);
  });

  it('lets a service returning Observable<Page<T>> satisfy AurPageSource<T>', () => {
    const source: AurPageSource<{ id: number }> = req => {
      const page = new SpringPage<{ id: number }>();
      page.number = req.pageIndex;
      return of(page) as Observable<AurPage<{ id: number }>>;
    };
    source({ pageIndex: 2, pageSize: 10 }).subscribe(p => expect(p.number).toBe(2));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/AurPage.spec.ts'`
Expected: FAIL — `Cannot find module './AurPage'`.

- [ ] **Step 3: Write minimal implementation**

`AurPage.ts`:

```ts
import { Observable } from 'rxjs';
import { Sort } from '@angular/material/sort';

/** What the table asks for when it needs a page (server mode). */
export interface AurPageRequest {
  pageIndex: number;
  pageSize: number;
  sort?: Sort;
}

/**
 * A page of server data. Field names mirror Spring Data `Page<T>` so a backend
 * `Page<T>` is structurally assignable with no mapping. Only this subset is required;
 * extra `Page` fields (empty/first/last/totalPages/...) are allowed by structural typing.
 */
export interface AurPage<T> {
  content: T[];
  totalElements: number;
  number?: number; // page index; falls back to request.pageIndex when omitted
}

/** Host-supplied loader: given a request, return the matching page. */
export type AurPageSource<T> = (request: AurPageRequest) => Observable<AurPage<T>>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/AurPage.spec.ts'`
Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/AurPage.ts projects/ngx-aur-mat-table/src/lib/model/AurPage.spec.ts
git commit -m "feat(pagination): add AurPage/AurPageRequest/AurPageSource contract types"
```

---

## Task 2: `PaginationConfig.mode` field

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:209-215`

- [ ] **Step 1: Add the field**

Change the `PaginationConfig` interface:

```ts
export interface PaginationConfig {
  enable: boolean;
  size: number;
  sizes?: number[];
  style?: string;
  position?: 'under' | 'bottom';
  /** 'client' (default) lets MatTableDataSource slice in memory; 'server' uses pageSource / paginatorState. */
  mode?: 'client' | 'server';
}
```

- [ ] **Step 2: Verify the library still builds**

Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds (no type errors).

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "feat(pagination): add explicit mode flag to PaginationConfig"
```

---

## Task 3: Extract `PaginatorState` to its own file + add `.of` factory

**Why:** `ServerPageController` (Task 4) needs `PaginatorState`. If it imports it from the component while the component imports the controller, that's a runtime circular dependency (`PaginatorState` can be `undefined` at controller init). Extract `PaginatorState` into `model/PaginatorState.ts` and re-export it from the component so the existing public export is preserved.

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:47-63` (remove the class body, re-export instead)

- [ ] **Step 1: Write the failing test**

`PaginatorState.spec.ts`:

```ts
import { PaginatorState } from '../ngx-aur-mat-table.component'; // via the re-export (public path)

describe('PaginatorState.of', () => {
  it('builds state from named args (length=total, pageIndex)', () => {
    const state = PaginatorState.of({ total: 100, pageIndex: 3 });
    expect(state.length).toBe(100);
    expect(state.pageIndex).toBe(3);
  });

  it('still supports the positional constructor (back-compat)', () => {
    const state = new PaginatorState(50, 1);
    expect(state.length).toBe(50);
    expect(state.pageIndex).toBe(1);
  });

  it('empty() yields zeros', () => {
    const state = PaginatorState.empty();
    expect(state.length).toBe(0);
    expect(state.pageIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/PaginatorState.spec.ts'`
Expected: FAIL — `PaginatorState.of is not a function`.

- [ ] **Step 3: Create the extracted class with the new factory**

`model/PaginatorState.ts`:

```ts
export class PaginatorState {

  constructor(private _length: number, private _pageIndex: number) {
  }

  get length(): number {
    return this._length;
  }

  get pageIndex(): number {
    return this._pageIndex;
  }

  public static empty(): PaginatorState {
    return new PaginatorState(0, 0);
  }

  public static of(args: { total: number; pageIndex: number }): PaginatorState {
    return new PaginatorState(args.total, args.pageIndex);
  }
}
```

- [ ] **Step 4: Replace the class in the component with a re-export**

In `ngx-aur-mat-table.component.ts`, delete the entire `export class PaginatorState { ... }` block (lines ~47-63) and add a re-export near the top (after the existing imports):

```ts
export { PaginatorState } from './model/PaginatorState';
import { PaginatorState } from './model/PaginatorState';
```

(The `import` is needed because the component body uses `PaginatorState` directly; the `export {}` preserves `import { PaginatorState } from 'ngx-aur-mat-table'` for consumers via `public-api.ts`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/PaginatorState.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 6: Verify the whole library still builds (re-export wiring)**

Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/PaginatorState.ts projects/ngx-aur-mat-table/src/lib/model/PaginatorState.spec.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "refactor(pagination): extract PaginatorState to own file + add of() factory"
```

---

## Task 4: `ServerPageController` — initial load + result mapping

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.ts`
- Test: `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.spec.ts`

The controller is Angular-free and testable with a fake `pageSource` and callbacks. It carries the current `pageIndex`/`pageSize`/`sort`, drives a `switchMap` pipeline, and reports via callbacks.

- [ ] **Step 1: Write the failing test (initial load + mapping)**

`ServerPageController.spec.ts`:

```ts
import { of } from 'rxjs';
import { AurPage, AurPageRequest } from '../model/AurPage';
import { ServerPageController, ServerPageResult } from './ServerPageController';

function makePage<T>(content: T[], totalElements: number, number?: number): AurPage<T> {
  return { content, totalElements, number };
}

describe('ServerPageController', () => {
  it('fires an initial request and maps the page to a result + state', () => {
    const requests: AurPageRequest[] = [];
    const results: ServerPageResult<number>[] = [];

    const controller = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([1, 2, 3], 30, req.pageIndex)); },
      {
        onResult: r => results.push(r),
        onLoading: () => {},
        onError: () => {},
      }
    );

    controller.start({ pageSize: 10 });

    expect(requests).toEqual([{ pageIndex: 0, pageSize: 10, sort: undefined }]);
    expect(results.length).toBe(1);
    expect(results[0].content).toEqual([1, 2, 3]);
    expect(results[0].state.length).toBe(30);
    expect(results[0].state.pageIndex).toBe(0);
  });

  it('uses request.pageIndex when page.number is omitted', () => {
    const results: ServerPageResult<number>[] = [];
    const controller = new ServerPageController<number>(
      req => of(makePage([], 5)), // no `number`
      { onResult: r => results.push(r), onLoading: () => {}, onError: () => {} }
    );
    controller.start({ pageIndex: 2, pageSize: 10 });
    expect(results[0].state.pageIndex).toBe(2);
  });

  it('seeds initial sort from start()', () => {
    const requests: AurPageRequest[] = [];
    const controller = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    controller.start({ pageSize: 10, sort: { active: 'name', direction: 'asc' } });
    expect(requests[0].sort).toEqual({ active: 'name', direction: 'asc' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/ServerPageController.spec.ts'`
Expected: FAIL — `Cannot find module './ServerPageController'`.

- [ ] **Step 3: Write minimal implementation**

`ServerPageController.ts`:

```ts
import { Subject, Subscription, EMPTY } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Sort } from '@angular/material/sort';
import { AurPage, AurPageRequest, AurPageSource } from '../model/AurPage';
import { PaginatorState } from '../model/PaginatorState';

export interface ServerPageResult<T> {
  content: T[];
  state: PaginatorState;
}

export interface ServerPageCallbacks<T> {
  onResult: (result: ServerPageResult<T>) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: unknown) => void;
}

export class ServerPageController<T> {

  private readonly request$ = new Subject<AurPageRequest>();
  private subscription?: Subscription;

  private pageIndex = 0;
  private pageSize = 0;
  private sort?: Sort;

  constructor(
    private readonly pageSource: AurPageSource<T>,
    private readonly callbacks: ServerPageCallbacks<T>
  ) {}

  start(initial: { pageIndex?: number; pageSize: number; sort?: Sort }): void {
    this.pageIndex = initial.pageIndex ?? 0;
    this.pageSize = initial.pageSize;
    this.sort = initial.sort;

    this.subscription = this.request$
      .pipe(
        tap(() => this.callbacks.onLoading(true)),
        switchMap(req =>
          this.pageSource(req).pipe(
            map(page => ({ req, page })),
            catchError(error => {
              this.callbacks.onLoading(false);
              this.callbacks.onError(error);
              return EMPTY;
            })
          )
        )
      )
      .subscribe(({ req, page }) => {
        this.callbacks.onLoading(false);
        this.callbacks.onResult({
          content: page.content,
          state: PaginatorState.of({
            total: page.totalElements,
            pageIndex: page.number ?? req.pageIndex,
          }),
        });
      });

    this.emit();
  }

  private emit(): void {
    this.request$.next({ pageIndex: this.pageIndex, pageSize: this.pageSize, sort: this.sort });
  }

  stop(): void {
    this.subscription?.unsubscribe();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/ServerPageController.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.ts projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.spec.ts
git commit -m "feat(pagination): ServerPageController initial load + result mapping"
```

---

## Task 5: `ServerPageController` — page/sort/reload + loading

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `ServerPageController.spec.ts`:

```ts
describe('ServerPageController events', () => {
  it('onPage builds a request with the new pageIndex/pageSize', () => {
    const requests: AurPageRequest[] = [];
    const c = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0, req.pageIndex)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    c.onPage({ pageIndex: 2, pageSize: 25 });
    expect(requests[1]).toEqual({ pageIndex: 2, pageSize: 25, sort: undefined });
  });

  it('onSort resets pageIndex to 0 and carries the sort', () => {
    const requests: AurPageRequest[] = [];
    const c = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0, req.pageIndex)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    c.onPage({ pageIndex: 3, pageSize: 10 });
    c.onSort({ active: 'name', direction: 'desc' });
    expect(requests[2]).toEqual({ pageIndex: 0, pageSize: 10, sort: { active: 'name', direction: 'desc' } });
  });

  it('reload() re-invokes with reset pageIndex by default, keeps it when resetPageIndex=false', () => {
    const requests: AurPageRequest[] = [];
    const c = new ServerPageController<number>(
      req => { requests.push(req); return of(makePage([], 0, req.pageIndex)); },
      { onResult: () => {}, onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });
    c.onPage({ pageIndex: 4, pageSize: 10 });
    c.reload();                              // default reset -> 0
    expect(requests[2].pageIndex).toBe(0);
    c.onPage({ pageIndex: 4, pageSize: 10 });
    c.reload({ resetPageIndex: false });     // keep current
    expect(requests[4].pageIndex).toBe(4);
  });

  it('toggles loading true then false around a request', () => {
    const log: boolean[] = [];
    const c = new ServerPageController<number>(
      () => of(makePage([], 0)),
      { onResult: () => {}, onLoading: v => log.push(v), onError: () => {} }
    );
    c.start({ pageSize: 10 });
    expect(log).toEqual([true, false]);
  });

  it('cancels a stale in-flight request (switchMap)', () => {
    const first = new Subject<AurPage<number>>();
    const second = new Subject<AurPage<number>>();
    let call = 0;
    const results: ServerPageResult<number>[] = [];
    const c = new ServerPageController<number>(
      () => (call++ === 0 ? first : second),
      { onResult: r => results.push(r), onLoading: () => {}, onError: () => {} }
    );
    c.start({ pageSize: 10 });   // subscribes to `first`
    c.onPage({ pageIndex: 1, pageSize: 10 }); // switches to `second`, cancels `first`
    first.next(makePage([99], 1)); // stale -> must be ignored
    second.next(makePage([7], 1, 1));
    expect(results.length).toBe(1);
    expect(results[0].content).toEqual([7]);
  });

  it('keeps the stream alive after an error', () => {
    const errors: unknown[] = [];
    const results: ServerPageResult<number>[] = [];
    let call = 0;
    const c = new ServerPageController<number>(
      req => {
        if (call++ === 0) { return throwError(() => new Error('boom')); }
        return of(makePage([1], 1, req.pageIndex));
      },
      { onResult: r => results.push(r), onLoading: () => {}, onError: e => errors.push(e) }
    );
    c.start({ pageSize: 10 });            // errors
    c.onPage({ pageIndex: 1, pageSize: 10 }); // still works
    expect(errors.length).toBe(1);
    expect(results.length).toBe(1);
  });
});
```

Replace the rxjs import line at the top of the spec with:

```ts
import { Subject, of, throwError } from 'rxjs';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/ServerPageController.spec.ts'`
Expected: FAIL — `onPage`/`onSort`/`reload` are not functions.

- [ ] **Step 3: Implement the methods**

Add to `ServerPageController` (after `emit()`):

```ts
  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.emit();
  }

  onSort(sort: Sort): void {
    this.sort = sort;
    this.pageIndex = 0;
    this.emit();
  }

  reload(opts?: { resetPageIndex?: boolean }): void {
    if (opts?.resetPageIndex !== false) {
      this.pageIndex = 0;
    }
    this.emit();
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/ServerPageController.spec.ts'`
Expected: PASS (all controller specs).

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.ts projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.spec.ts
git commit -m "feat(pagination): ServerPageController page/sort/reload + loading + cancellation"
```

---

## Task 6: Component — inputs, outputs, `activePaginator`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

- [ ] **Step 1: Add imports**

At the top of the component file, extend the existing imports:

```ts
import { AurPage, AurPageRequest, AurPageSource } from './model/AurPage';
import { ServerPageController } from './providers/ServerPageController';
import { Subscription } from 'rxjs';
```

- [ ] **Step 2: Add inputs/outputs and the controller field**

Near the other `@Input()`s (after `paginatorState`, ~line 142) add:

```ts
  // Server-mode declarative loader. When set, the table owns the fetch loop.
  // @ts-ignore
  @Input() pageSource?: AurPageSource<T>;

  // Optional host-owned paginator placed elsewhere in the host layout.
  // @ts-ignore
  @Input() externalPaginator?: MatPaginator;
```

Near the other `@Output()`s add:

```ts
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() pageError = new EventEmitter<unknown>();
```

As a private field near the other providers:

```ts
  private serverPageController?: ServerPageController<T>;
  private externalPaginatorSub?: Subscription;
```

- [ ] **Step 3: Add the `activePaginator` resolver**

Add a getter on the component (e.g. just after the `@ViewChild(MatPaginator ...)` declaration):

```ts
  get activePaginator(): MatPaginator {
    return this.externalPaginator ?? this.matPaginator;
  }
```

- [ ] **Step 4: Verify the library builds**

Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "feat(pagination): add pageSource/externalPaginator inputs, loading/error outputs, activePaginator"
```

---

## Task 7: Component — route paginator usages through `activePaginator`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

- [ ] **Step 1: Replace `this.matPaginator` with `this.activePaginator` in non-ViewChild logic**

In `initPaginator()`:

```ts
  private initPaginator(): void {
    if (this.tableDataSource) {
      this.tableDataSource.paginator = this.activePaginator;
    }
  }
```

In `resetPaginatorPageIndex()`:

```ts
  public resetPaginatorPageIndex() {
    if (this.activePaginator) {
      this.activePaginator.firstPage();
    }
  }
```

In `getTimelineVisibleData()` (the client-side branch):

```ts
    if (this.paginationProvider.isEnabled && this.activePaginator) {
      const start = this.activePaginator.pageIndex * this.activePaginator.pageSize;
      return data.slice(start, start + this.activePaginator.pageSize);
    }
```

(Leave the `@ViewChild(MatPaginator) matPaginator` declaration unchanged — `activePaginator` falls back to it.)

- [ ] **Step 2: Verify the library builds and existing specs pass**

Run: `npx ng test ngx-aur-mat-table --watch=false`
Expected: PASS (existing specs unaffected).

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "refactor(pagination): route paginator logic through activePaginator"
```

---

## Task 8: Template — render built-in paginator only without external

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:404-415`

- [ ] **Step 1: Guard the built-in paginator and disable position classes for external**

Replace the `@if (this.paginationProvider.isEnabled)` guard:

```html
  <!-- Pagination -->
  @if (this.paginationProvider.isEnabled && !externalPaginator) {
    <mat-paginator [ngClass]="{'hidePaginator': isTableBodyHide}"
                   [pageSizeOptions]="paginationProvider.sizes"
                   [pageSize]="paginationProvider.size"
                   [style]="tableConfig?.pageableCfg?.style"
                   [length]="paginatorState?.length"
                   [pageIndex]="paginatorState?.pageIndex"
                   (page)="onPageChangeInternal($event)"
                   showFirstLastButtons>
    </mat-paginator>
  }
```

Also update the two `bottom-pagination` `ngClass` guards (lines 2 and 25) so they don't add spacing for an absent built-in paginator:

```html
[ngClass]="{'bottom-pagination': paginationProvider.isEnabled && !externalPaginator && paginationProvider.position === 'bottom'}"
```

- [ ] **Step 2: Verify the library builds**

Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "feat(pagination): hide built-in paginator when externalPaginator is provided"
```

---

## Task 9: Component — wire the server controller (mode B)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

This connects everything: seed `paginatorState` so server data isn't sliced, start the controller in `ngAfterViewInit`, subscribe page/sort/external events, apply results (including imperative external-paginator update), and implement `reload()`.

- [ ] **Step 1: Add server-mode predicates and paginatorState seeding**

Add helpers. `isServerMode()` drives controller usage (needs a `pageSource`); `isServerWiring()` matches the spec's mode-resolution table (also true for the legacy `mode: 'server'` path) and drives the seeding that prevents `MatTableDataSource` from slicing server data:

```ts
  private isServerMode(): boolean {
    return !!this.pageSource;
  }

  private isServerWiring(): boolean {
    return !!this.pageSource || this.tableConfig?.pageableCfg?.mode === 'server';
  }
```

In `ngOnInit()` (after the mandatory-config check), seed empty state so existing server guards engage (`!this.paginatorState` becomes false → `prepareTableData()` skips `initPaginator()` → fresh dataSource has no paginator → no client slicing of server data):

```ts
    if (this.isServerWiring() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
```

- [ ] **Step 2: Start the controller and wire events in `ngAfterViewInit`**

Extend `ngAfterViewInit()`:

```ts
  ngAfterViewInit(): void {
    this.initPaginator();
    this.initSortingDataAccessor();
    this.resizeColumnOffsetsObserver = new ResizeObserver(() => this.updateColumnOffsets());
    this.resizeColumnOffsetsObserver.observe(this.table.nativeElement);

    if (this.isServerMode()) {
      this.startServerController();
    }
  }

  private startServerController(): void {
    if (!this.pageSource) {
      return;
    }
    this.serverPageController = new ServerPageController<T>(this.pageSource, {
      onResult: result => {
        this.paginatorState = result.state;
        this.applyExternalPaginatorState(result.state);
        this.tableData = result.content;
        this.refreshTable();
        this.cdr.markForCheck();
      },
      onLoading: loading => {
        this.loadingChange.emit(loading);
        this.cdr.markForCheck();
      },
      onError: error => this.pageError.emit(error),
    });

    this.subscribeExternalPaginator();

    const initialSort: Sort | undefined =
      this.matSort?.active ? { active: this.matSort.active, direction: this.matSort.direction } : undefined;

    this.serverPageController.start({
      // provider may not be initialized yet (no tableData binding in server mode) — read from config
      pageSize: this.tableConfig.pageableCfg?.size ?? 20,
      sort: initialSort,
    });
  }

  private subscribeExternalPaginator(): void {
    this.externalPaginatorSub?.unsubscribe();
    if (this.externalPaginator) {
      this.externalPaginatorSub = this.externalPaginator.page.subscribe(event =>
        this.onPageChangeInternal(event)
      );
    }
  }

  private applyExternalPaginatorState(state: PaginatorState): void {
    if (this.externalPaginator) {
      // RISK (see spec approach C): OnPush MatPaginator needs CD to reflect imperative changes.
      this.externalPaginator.length = state.length;
      this.externalPaginator.pageIndex = state.pageIndex;
      this.cdr.markForCheck();
    }
  }
```

Add the `Sort` import if not present:

```ts
import { MatSort, Sort } from '@angular/material/sort';
```

(`Sort` is already imported in this file — confirm; if not, add it.)

- [ ] **Step 3: Route page/sort events to the controller**

Update `onPageChangeInternal()`:

```ts
  onPageChangeInternal(event: PageEvent): void {
    this.updateTimelineBounds();
    this.pageChange.emit(event);
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.onPage({ pageIndex: event.pageIndex, pageSize: event.pageSize });
    }
  }
```

Update `sortTable()`:

```ts
  sortTable(sortParameters: Sort) {
    this.sort.emit(sortParameters);
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.onSort(sortParameters);
    }
    Promise.resolve().then(() => {
      this.updateTimelineBounds();
      this.cdr.markForCheck();
    });
  }
```

- [ ] **Step 4: Implement the public `reload()` and clean up**

Add the public method:

```ts
  /** Re-invoke pageSource (server mode). resetPageIndex defaults to true (e.g. external filter changed). */
  public reload(opts?: { resetPageIndex?: boolean }): void {
    if (this.isServerMode() && this.serverPageController) {
      this.serverPageController.reload(opts);
    } else {
      // Client mode: re-apply current data/filters.
      this.refreshTable();
    }
  }
```

Extend `ngOnDestroy()`:

```ts
  ngOnDestroy() {
    this.resizeColumnOffsetsObserver.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
  }
```

- [ ] **Step 5: Verify build + existing specs**

Run: `npx ng build ngx-aur-mat-table && npx ng test ngx-aur-mat-table --watch=false`
Expected: build succeeds; existing specs pass.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "feat(pagination): wire ServerPageController into the table (mode B + reload + external)"
```

---

## Task 10: Component integration tests (mode resolution, reload, external)

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-pagination.spec.ts`

Use TestBed with a host component. Keep the fake `pageSource` synchronous (`of(...)`) so assertions are deterministic.

- [ ] **Step 1: Write the failing tests**

`ngx-aur-mat-table-pagination.spec.ts`:

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

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"
                   (loadingChange)="loading = $event"></aur-mat-table>`
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  loading = false;
  calls: AurPageRequest[] = [];
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    pageableCfg: { enable: true, size: 10, mode: 'server' },
  };
  source: AurPageSource<Row> = (req) => {
    this.calls.push(req);
    const page: AurPage<Row> = { content: [{ name: 'a' }], totalElements: 42, number: req.pageIndex };
    return of(page);
  };
}

describe('NgxAurMatTable server pagination', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('loads the first page automatically when pageSource is set', fakeAsync(() => {
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit
    tick();
    expect(host.calls.length).toBe(1);
    expect(host.calls[0].pageIndex).toBe(0);
    expect(host.table.paginatorState?.length).toBe(42);
  }));

  it('emits loadingChange around the fetch', fakeAsync(() => {
    const log: boolean[] = [];
    host.loading = false;
    fixture.detectChanges();
    tick();
    // with synchronous of(), loading toggled true then false
    expect(host.loading).toBeFalse();
  }));

  it('reload() re-invokes pageSource from page 0', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    host.table.reload();
    tick();
    expect(host.calls.length).toBe(2);
    expect(host.calls[1].pageIndex).toBe(0);
  }));
});
```

- [ ] **Step 2: Run tests to verify they fail (then pass once wiring from Task 9 is present)**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/ngx-aur-mat-table-pagination.spec.ts'`
Expected: PASS (Task 9 already implemented the behavior). If any fail, fix the wiring in `ngx-aur-mat-table.component.ts` before continuing.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-pagination.spec.ts
git commit -m "test(pagination): integration tests for server mode + reload"
```

---

## Task 11: External-paginator integration test (gates the RISK spike)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-pagination.spec.ts`

- [ ] **Step 1: Write the failing test**

Append a second host + describe block:

```ts
import { MatPaginator } from '@angular/material/paginator';

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"
                   [externalPaginator]="pg"></aur-mat-table>
    <mat-paginator #pg [pageSizeOptions]="[10]"></mat-paginator>`
})
class ExternalHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  @ViewChild('pg') pg!: MatPaginator;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    pageableCfg: { enable: true, size: 10, mode: 'server' },
  };
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }], totalElements: 99, number: req.pageIndex } as AurPage<Row>);
}

describe('NgxAurMatTable external paginator (server)', () => {
  let fixture: ComponentFixture<ExternalHostComponent>;
  let host: ExternalHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExternalHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ExternalHostComponent);
    host = fixture.componentInstance;
  });

  it('pushes length/pageIndex onto the external paginator and it reflects them', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(host.pg.length).toBe(99);
    expect(host.pg.pageIndex).toBe(0);
    // built-in paginator must NOT be rendered
    const builtIn = fixture.nativeElement.querySelectorAll('mat-paginator');
    // only the host's own external paginator exists in the DOM
    expect(builtIn.length).toBe(1);
  }));
});
```

- [ ] **Step 2: Run the test**

Run: `npx ng test ngx-aur-mat-table --watch=false --include='**/ngx-aur-mat-table-pagination.spec.ts'`
Expected: PASS. **If `host.pg.length`/`pageIndex` do not update**, the RISK in the spec materialised — apply the spec's fallback (Task 9 `applyExternalPaginatorState`): keep the imperative set + `markForCheck()`; if still failing, switch that one cell to host-bound `[length]`/`[pageIndex]` and update the test + spec accordingly. Do not reach into Material private fields.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-pagination.spec.ts
git commit -m "test(pagination): external paginator reflects server length/pageIndex"
```

---

## Task 12: Public API exports + deprecate `createEmpty`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts`

- [ ] **Step 1: Export new symbols**

Append to `public-api.ts`:

```ts
export * from './lib/model/AurPage';
export * from './lib/providers/ServerPageController';
```

- [ ] **Step 2: Deprecate `createEmpty`**

In `ngx-aur-table-page-event.utils.ts`, add JSDoc above `createEmpty`:

```ts
  /**
   * @deprecated Not needed with the `pageSource` API — the table performs the initial
   * load itself. Kept for the legacy manual server-pagination path.
   */
  public static createEmpty(tableConfig: TableConfig<any>): PageEvent {
```

- [ ] **Step 3: Verify the library builds**

Run: `npx ng build ngx-aur-mat-table`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/public-api.ts projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts
git commit -m "feat(pagination): export pageSource API; deprecate createEmpty"
```

---

## Task 13: Demo — server pagination with external filters + reload

**Files:**
- Create: `projects/aur-demo/src/app/table-with-server-filters/table-with-server-filters.component.ts`
- Create: `projects/aur-demo/src/app/table-with-server-filters/table-with-server-filters.component.html`
- Modify: `projects/aur-demo/src/app/app.module.ts`, `projects/aur-demo/src/app/app.component.html`

This mirrors the `locator-front` pattern (host-owned fetch + filter + reload) using the existing `CustomerService`/`Customer`.

- [ ] **Step 1: Create the component**

`table-with-server-filters.component.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { NgxAurMatTableComponent, AurPageSource, TableConfig } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerService } from '../table-with-server-pagination-component/customer.service';

@Component({
  selector: 'app-table-with-server-filters',
  templateUrl: './table-with-server-filters.component.html',
  standalone: false,
})
export class TableWithServerFiltersComponent {
  private customerService = new CustomerService();

  @ViewChild('table') table!: NgxAurMatTableComponent<Customer>;

  showSpinner = false;
  nameFilter = '';

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    pageableCfg: { enable: true, size: 20, mode: 'server' },
  };

  loadPage: AurPageSource<Customer> = req =>
    this.customerService.page(req.pageIndex, req.pageSize).pipe(
      map(page => ({
        // demo filter applied client-side over the page service for illustration
        content: page.content.filter(c => !this.nameFilter || c.name.includes(this.nameFilter)),
        totalElements: page.totalElements,
        number: page.number,
      }))
    );

  onNameFilterChange(value: string): void {
    this.nameFilter = value;
    this.table.reload(); // resets to page 0 and refetches with the new filter
  }
}
```

- [ ] **Step 2: Create the template**

`table-with-server-filters.component.html`:

```html
<div class="toolbar">
  <input placeholder="filter name" (input)="onNameFilterChange($any($event.target).value)">
  <span *ngIf="showSpinner">loading…</span>
</div>

<aur-mat-table #table
  [tableConfig]="tableConfig"
  [pageSource]="loadPage"
  (loadingChange)="showSpinner = $event">
</aur-mat-table>
```

- [ ] **Step 3: Register the demo**

In `app.module.ts`, add the import and to `declarations`:

```ts
import { TableWithServerFiltersComponent } from './table-with-server-filters/table-with-server-filters.component';
```
…add `TableWithServerFiltersComponent` to the `declarations` array.

In `app.component.html`, add:

```html
<h3>Server pagination with external filter + reload()</h3>
<app-table-with-server-filters></app-table-with-server-filters>
```

- [ ] **Step 4: Verify the demo builds**

Run: `npx ng build aur-demo`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add projects/aur-demo/src/app/table-with-server-filters projects/aur-demo/src/app/app.module.ts projects/aur-demo/src/app/app.component.html
git commit -m "docs(demo): server pagination with external filter + reload"
```

---

## Task 14: Demo — external paginator

**Files:**
- Create: `projects/aur-demo/src/app/table-with-external-paginator/table-with-external-paginator.component.ts`
- Create: `projects/aur-demo/src/app/table-with-external-paginator/table-with-external-paginator.component.html`
- Modify: `projects/aur-demo/src/app/app.module.ts`, `projects/aur-demo/src/app/app.component.html`

- [ ] **Step 1: Create the component**

`table-with-external-paginator.component.ts`:

```ts
import { Component } from '@angular/core';
import { TableConfig } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';

@Component({
  selector: 'app-table-with-external-paginator',
  templateUrl: './table-with-external-paginator.component.html',
  standalone: false,
})
export class TableWithExternalPaginatorComponent {
  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    pageableCfg: { enable: true, size: 20 }, // client data
  };
  tableData: Customer[] = CustomerGenerator.generate(100);
}
```

- [ ] **Step 2: Create the template**

`table-with-external-paginator.component.html`:

```html
<aur-mat-table
  [tableConfig]="tableConfig"
  [tableData]="tableData"
  [externalPaginator]="pg">
</aur-mat-table>

<div class="my-footer">
  <mat-paginator #pg [pageSizeOptions]="[5, 10, 20]" [pageSize]="20"></mat-paginator>
</div>
```

- [ ] **Step 3: Register the demo**

In `app.module.ts`:

```ts
import { TableWithExternalPaginatorComponent } from './table-with-external-paginator/table-with-external-paginator.component';
```
…add `TableWithExternalPaginatorComponent` to `declarations`. Ensure `MatPaginatorModule` is imported in the demo module (it is transitively via Material, but add `import { MatPaginatorModule } from '@angular/material/paginator';` to `imports` if the build complains).

In `app.component.html`:

```html
<h3>External (host-owned) paginator</h3>
<app-table-with-external-paginator></app-table-with-external-paginator>
```

- [ ] **Step 4: Verify the demo builds**

Run: `npx ng build aur-demo`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add projects/aur-demo/src/app/table-with-external-paginator projects/aur-demo/src/app/app.module.ts projects/aur-demo/src/app/app.component.html
git commit -m "docs(demo): external host-owned paginator"
```

---

## Task 15: Fix legacy demo import + README + changelog

**Files:**
- Modify: `projects/aur-demo/src/app/table-with-server-pagination-component/table-with-server-pagination.component.ts:6`
- Modify: `README.md`
- Modify: `changelog`

- [ ] **Step 1: Fix the deep relative import in the legacy demo**

Replace:

```ts
import {NgxAurTablePageEventUtils} from "../../../../ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils";
```

with the public entry point:

```ts
import { NgxAurTablePageEventUtils } from "ngx-aur-mat-table";
```

(Confirm `NgxAurTablePageEventUtils` is exported from `public-api.ts` — it is.)

- [ ] **Step 2: Add README section**

In `README.md`, add a section "Server pagination via `pageSource` (recommended)" with the mode-2 example, the external-filter `reload()` note, and the capability matrix from the spec. Add "Using an external paginator (`externalPaginator`)".

```md
## Server pagination via `pageSource` (recommended)

```ts
pageableCfg = { enable: true, size: 20, mode: 'server' };
loadPage: AurPageSource<Customer> = req =>
  this.svc.page(req.pageIndex, req.pageSize); // returns Observable<Page<Customer>>
```
```html
<aur-mat-table #table [tableConfig]="cfg" [pageSource]="loadPage"
               (loadingChange)="loading = $event"></aur-mat-table>
```
On external filter change call `table.reload()` (resets to page 0).

> The legacy `[paginatorState]` + `(pageChange)` wiring still works and is documented below as legacy.
```

- [ ] **Step 3: Add changelog entry**

Prepend an entry to `changelog` describing: new `pageSource` API, `PaginationConfig.mode`, `PaginatorState.of`, `externalPaginator`, `reload()`, `loadingChange`/`pageError`; `createEmpty` deprecated; fully additive.

- [ ] **Step 4: Verify both projects build**

Run: `npx ng build ngx-aur-mat-table && npx ng build aur-demo`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add README.md changelog projects/aur-demo/src/app/table-with-server-pagination-component/table-with-server-pagination.component.ts
git commit -m "docs(pagination): README + changelog; fix legacy demo import to public entry point"
```

---

## Task 16: Full verification pass

- [ ] **Step 1: Run the whole library test suite**

Run: `npx ng test ngx-aur-mat-table --watch=false`
Expected: all specs pass (existing + new: `AurPage`, `PaginatorState`, `ServerPageController`, `ngx-aur-mat-table-pagination`).

- [ ] **Step 2: Build both projects**

Run: `npx ng build ngx-aur-mat-table && npx ng build aur-demo`
Expected: both succeed with no type errors.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run: `npx ng serve aur-demo`, open the demo, verify: (a) server-filters demo loads page 0, paging works, typing in the filter refetches from page 0; (b) external-paginator demo pages the client data via the host-owned paginator; (c) the built-in paginator is absent in the external demo.

- [ ] **Step 4: Final commit (if any doc tweaks)**

```bash
git add -A
git commit -m "chore(pagination): verification pass"
```
