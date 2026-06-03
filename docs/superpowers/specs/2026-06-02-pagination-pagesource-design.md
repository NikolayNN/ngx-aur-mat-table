# Pagination wiring improvement: explicit mode + `pageSource` + external paginator (A + B + C)

**Date:** 2026-06-02
**Status:** Approved (design)
**Scope:** `ngx-aur-mat-table` library — pagination connection API
**Compatibility:** Additive only. The existing API keeps working; new API is added on top; the old server-side helper is marked `@deprecated`.

## Problem

Today the table supports two pagination modes, but how you wire them up is implicit and ceremonious.

- **Client (internal):** set `pageableCfg: { enable: true, size }` and the `MatTableDataSource` slices the data. Simple.
- **Server (external):** same `pageableCfg`, but additionally you must:
  - pass `[paginatorState]="paginatorState"`,
  - subscribe to `(pageChange)="loadPage($event)"`,
  - build `new PaginatorState(totalElements, pageIndex)` by hand (positional args — easy to swap `length`/`pageIndex`),
  - call `NgxAurTablePageEventUtils.createEmpty(tableConfig)` for the first load.

Pain points:

1. **Mode is implicit.** Internal vs external is decided only by *whether `paginatorState` happens to be passed* (`if (!this.paginatorState) initPaginator()`, and `getTimelineVisibleData()` returns unsliced data when `paginatorState` is set). Not visible from config, undocumented.
2. **Server mode is ceremonious.** Three wiring points (config + state input + event output) plus manual state assembly.
3. **`PaginatorState` constructor is positional** — `new PaginatorState(total, pageIndex)` is easy to get wrong.
4. **`createEmpty` is awkward.** It *is* exported via `public-api.ts`, but the demo imports it through a deep relative path (`../../../../ngx-aur-mat-table/src/lib/utils/...`) — a discoverability smell.

## Goals

- Make the mode **explicit** in config.
- **Reduce server-side ceremony** to a single typed function.
- Keep the **public API clean and self-sufficient**.
- Provide a **type-safe page contract** so `length`/`pageIndex` can't be confused and orchestration isn't rewritten each time.
- Allow the host to drive the table from an **external paginator** it owns, independently of client/server data.
- Support **external (app-owned) filters** with a single `reload()` call, without the library modeling filters.

## Non-goals

- A controller/state object for advanced flows (debounce/cancel/cache) — deferred (YAGNI) until there is real demand.
- Removing the old API — additive only this release.

## Capability matrix

Two independent axes — where the paginator lives, and where the data comes from. All four combinations must work:

| | data: client (in-memory) | data: server (`pageSource`) |
|---|---|---|
| **paginator: built-in** | ✅ exists today | ✅ approach B |
| **paginator: external** | 🆕 approach C (`externalPaginator`) | 🆕 approach C + B |

## Chosen approach: A (foundation) + B (ergonomic API) + C (external paginator)

### A — Explicit mode + clean exports

Extend `PaginationConfig` (additive, optional field):

```ts
export interface PaginationConfig {
  enable: boolean;
  size: number;
  sizes?: number[];
  style?: string;
  position?: 'under' | 'bottom';
  mode?: 'client' | 'server';   // NEW. default: 'client'
}
```

Named factory on `PaginatorState` (positional constructor stays for back-compat):

```ts
public static of(args: { total: number; pageIndex: number }): PaginatorState {
  return new PaginatorState(args.total, args.pageIndex);
}
```

Usage: `PaginatorState.of({ total: 100, pageIndex: 0 })`.

### B — `[pageSource]` declarative loader (recommended server API)

New public contract types:

```ts
export interface AurPageRequest {
  pageIndex: number;
  pageSize: number;
  sort?: Sort;            // from @angular/material/sort
}

// Field names mirror Spring Data Page<T> so a backend Page<T> is
// structurally assignable to AurPage<T> with no mapping. The library
// only requires this subset; extra Page fields (empty/first/last/
// totalPages/...) are allowed by structural typing.
export interface AurPage<T> {
  content: T[];
  totalElements: number;  // → paginator length
  number?: number;        // page index; falls back to request.pageIndex if omitted
}

export type AurPageSource<T> =
  (request: AurPageRequest) => Observable<AurPage<T>>;
```

New component input:

```ts
@Input() pageSource?: AurPageSource<T>;
```

Usage:

```ts
pageableCfg = { enable: true, size: 20, mode: 'server' };

// svc.page(...) returns Observable<Page<Customer>> (Spring Data shape).
// Page<Customer> is structurally assignable to AurPage<Customer> → no map needed.
loadPage: AurPageSource<Customer> = (req) =>
  this.customerService.page(req.pageIndex, req.pageSize);
```

```html
<aur-mat-table [tableConfig]="tableConfig" [pageSource]="loadPage"></aur-mat-table>
```

No manual `[tableData]`, `[paginatorState]`, `(pageChange)`, `createEmpty`, `new PaginatorState(...)`, or response mapping.

### Spring Data `Page<T>` compatibility

The consuming project returns Spring Data `Page<T>` from its services:

```ts
class Page<T> { content: T[]; number; numberOfElements; totalElements;
                totalPages; first; last; empty; urlParams?; }
```

`AurPage<T>` deliberately uses the same field names for the subset it needs
(`content`, `totalElements`, optional `number`), so `Page<T>` is assignable to
`AurPage<T>` one-to-one. The internal `PaginatorState` is built from
`page.number ?? request.pageIndex` and `page.totalElements`.

### C — External paginator (`[externalPaginator]`)

Today the `<mat-paginator>` is hard-wired inside the table template and bound via
`@ViewChild`. There is no way to drive the table from a paginator the host places
elsewhere in its own layout. Approach C adds that, orthogonally to client/server data.

New component input:

```ts
@Input() externalPaginator?: MatPaginator;   // from @angular/material/paginator
```

Usage:

```html
<aur-mat-table [tableConfig]="cfg" [externalPaginator]="pg"></aur-mat-table>
<!-- anywhere else in the host layout -->
<mat-paginator #pg></mat-paginator>
```

Rules:

- The library resolves a single **`activePaginator = externalPaginator ?? matPaginator`**.
  All paginator logic (client slicing via `dataSource.paginator`, the server
  controller's `(page)` subscription, timeline slicing in `getTimelineVisibleData()`,
  `resetPaginatorPageIndex()`) targets `activePaginator` — never `matPaginator` directly.
- The built-in `<mat-paginator>` is rendered **only when `externalPaginator` is not provided**
  (template guard: `paginationProvider.isEnabled && !externalPaginator`).
- `externalPaginator` is read in `ngAfterViewInit` / on change; if it arrives after init,
  wiring is (re)applied.

Combines with both data modes:

- **External + client:** `tableDataSource.paginator = activePaginator` — `MatTableDataSource`
  slices and sets `length` on the external paginator automatically, exactly as for the
  built-in one.
- **External + server (`pageSource`):** the `ServerPageController` subscribes to
  `activePaginator.page`. Because the external paginator's template is owned by the host,
  the library cannot bind `[length]`/`[pageIndex]`; it sets them **imperatively** on the
  instance (`activePaginator.length = total; activePaginator.pageIndex = idx`). See the
  RISK below for how the OnPush paginator is made to re-render.

> **RISK (must spike before implementing external + server):** `MatPaginator` is OnPush and
> its `length`/`pageIndex` `@Input` setters do not call `markForCheck` themselves, so after
> setting them imperatively the external paginator may not re-render. There is no **public**
> API on `MatPaginator` to force this; the obvious levers (`_changePageSize`,
> `_changeDetectorRef`, `_intl.changes`) are **private/internal** and may break across
> `@angular/material` versions. Plan:
>
> 1. **Spike first.** Verify whether setting `length`/`pageIndex` synchronously inside the
>    host's change-detection cycle and calling `markForCheck()` on the **host** component is
>    enough (it usually is when the external paginator is a sibling under the same CD root).
>    Add an integration test that fails if the paginator UI does not reflect the new
>    `length`/`pageIndex`.
> 2. **If the spike passes:** ship as above — no Material internals touched.
> 3. **Fallback if it does not:** do **not** reach into Material private fields. Instead, for
>    the `external + server` cell only, require the host to bind `[length]`/`[pageIndex]`
>    itself (the table still drives `(page)` and data via `pageSource`), and document this as
>    the supported wiring for that one combination. Optionally provide a thin
>    `aurPaginatorBridge` directive on `<mat-paginator>` that owns the bindings, so the host
>    cost stays one attribute.
>
> The other three matrix cells (built-in × client/server, external × client) carry no such
> risk: `MatTableDataSource.paginator = …` handles `length` for client data, and the
> built-in paginator is bound declaratively in the table's own template.

## Usage examples

All four matrix cells, same `Customer` model.

### 1. Built-in paginator + client data (simplest, as today)

```ts
@Component({ selector: 'app-t1', templateUrl: './t1.html', standalone: false })
export class T1Component {
  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'Name', key: 'name', valueConverter: v => v.name },
      { name: 'Age',  key: 'age',  valueConverter: v => v.age  },
    ],
    pageableCfg: { enable: true, size: 20 },   // mode defaults to 'client'
  };
  tableData = CustomerGenerator.generate(100);
}
```
```html
<aur-mat-table [tableConfig]="tableConfig" [tableData]="tableData"></aur-mat-table>
```
The table renders the paginator and `MatTableDataSource` slices the data. Nothing else needed.

### 2. Built-in paginator + server data (`pageSource`)

```ts
@Component({ selector: 'app-t2', templateUrl: './t2.html', standalone: false })
export class T2Component {
  constructor(private svc: CustomerService) {}

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'Name', key: 'name', valueConverter: v => v.name },
      { name: 'Age',  key: 'age',  valueConverter: v => v.age  },
    ],
    pageableCfg: { enable: true, size: 20, mode: 'server' },   // explicit mode
  };

  // svc.page(...) -> Observable<Page<Customer>> (Spring Data) — no map
  loadPage: AurPageSource<Customer> = req =>
    this.svc.page(req.pageIndex, req.pageSize);
}
```
```html
<aur-mat-table [tableConfig]="tableConfig" [pageSource]="loadPage"></aur-mat-table>
```
No `[tableData]`, `[paginatorState]`, `(pageChange)`, or `createEmpty` — the table loads on init / page change / sort itself.

### 3. External paginator + client data

```ts
@Component({ selector: 'app-t3', templateUrl: './t3.html', standalone: false })
export class T3Component {
  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'Name', key: 'name', valueConverter: v => v.name },
      { name: 'Age',  key: 'age',  valueConverter: v => v.age  },
    ],
    pageableCfg: { enable: true, size: 20 },   // in-memory data, table slices
  };
  tableData = CustomerGenerator.generate(100);
}
```
```html
<!-- table without its own paginator -->
<aur-mat-table
  [tableConfig]="tableConfig"
  [tableData]="tableData"
  [externalPaginator]="pg">
</aur-mat-table>

<!-- host-owned paginator, placed anywhere -->
<div class="my-footer">
  <mat-paginator #pg [pageSizeOptions]="[5, 10, 20]"></mat-paginator>
</div>
```
The table binds `dataSource.paginator = pg`; the built-in paginator is **not rendered**. Material sets `length` automatically.

### 4. External paginator + server data

```ts
@Component({ selector: 'app-t4', templateUrl: './t4.html', standalone: false })
export class T4Component {
  constructor(private svc: CustomerService) {}

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'Name', key: 'name', valueConverter: v => v.name },
      { name: 'Age',  key: 'age',  valueConverter: v => v.age  },
    ],
    pageableCfg: { enable: true, size: 20, mode: 'server' },
  };

  loadPage: AurPageSource<Customer> = req =>
    this.svc.page(req.pageIndex, req.pageSize);
}
```
```html
<aur-mat-table
  [tableConfig]="tableConfig"
  [pageSource]="loadPage"
  [externalPaginator]="pg">
</aur-mat-table>

<mat-paginator #pg [pageSizeOptions]="[10, 20, 50]"></mat-paginator>
```
The controller listens to the external `pg`'s `(page)`, loads via `loadPage`, and pushes `length`/`pageIndex` onto the external paginator itself.

### Optional: loading spinner and errors (server modes 2 and 4)

```html
<aur-mat-table
  [tableConfig]="tableConfig"
  [pageSource]="loadPage"
  (loadingChange)="loading = $event"
  (pageError)="onError($event)">
</aur-mat-table>
<mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>
```

## Real-world adoption: external filters + host-owned fetch

Verified against the consuming app (`locator-front`, e.g. `UnitBillingLogsComponent`). The real `/page` request is richer than `{ pageIndex, pageSize, sort }`:

- A `PageParams` object carries `page`, `size`, `sizes`, `sort` (backend string like `'desc#createdTime'`), `elements` (total). Material `Sort` is mapped to the backend string by the host via `PageParams.sortParamsToAscDesc(sort)`.
- Filters live in **separate UI components** (radio, date-range). On change, the host rebuilds a `filterMap: Map<string,string>` and reloads from page 0.
- Service signatures are bespoke and need host-only context: `getLogsPage(unitId, pageParams, filterMap) → Observable<Page<T>>`.

This fits `pageSource` because the **host closure owns the fetch and captures filter/id state**; the table only drives `pageIndex`/`pageSize`/`sort`. The one missing piece is a way for the host to tell the table to reload when an *external* filter changes — solved by a public `reload()` method.

### `reload()` API

```ts
/** Re-invoke pageSource. resetPageIndex defaults to true (filter changes go to page 0). */
reload(opts?: { resetPageIndex?: boolean }): void;
```

Accessed via a template ref (`#table`), matching the app's existing imperative style (it already calls `loadData()` by hand). In client mode `reload()` is a no-op-safe refresh of the current view; in server mode it re-runs `pageSource` through the same `switchMap` (so an in-flight request is cancelled).

### Before / after (real component)

Before — per-component boilerplate: `paginatorState`, `onPageChange`, and a `loadData()` with `showSpinner`/`finalize`/`takeUntilDestroyed`/`new PaginatorState(...)`/`tableData.set(...)`.

After:

```ts
pageParams = new PageParams('desc#createdTime', 20);
filterMap = new Map<string, string>();

loadPage: AurPageSource<UnitBillingLog> = req => {
  this.pageParams.page = req.pageIndex;
  this.pageParams.size = req.pageSize;
  if (req.sort?.active) this.pageParams.sort = PageParams.sortParamsToAscDesc(req.sort);
  return this.unitBillingService.getLogsPage(this.unitId, this.pageParams, this.filterMap);
};

onMethodFilterChange(v: string) { this.selectedMethod = v; this.rebuildFilters(); this.table.reload(); }
```

```html
<aur-mat-table #table
  [tableConfig]="tableConfig"
  [pageSource]="loadPage"
  (loadingChange)="showSpinner = $event">
</aur-mat-table>
```

Removed: `paginatorState`, `onPageChange`, manual `new PaginatorState(...)`, `tableData.set(...)`, `showSpinner`+`finalize`, host-side `takeUntilDestroyed` for the page fetch (the table owns the subscription and cancellation). Remaining host code is only the irreducibly app-specific part: building `filterMap`, mapping `Sort`→backend string, and one `this.table.reload()` per external filter change.

Notes:
- The library does **not** model filters; they stay app-specific and are captured by the `pageSource` closure (read fresh on each invocation).
- `Sort`→backend-string mapping stays in the host closure; `AurPageRequest.sort` remains a Material `Sort`.

### Host responsibilities (the whole contract)

With `pageSource`, the host's only obligation is a **correct `loadPage`**:

1. Read `req` and apply it to the request: `pageIndex`, `pageSize`, and `sort` (if table sorting is used).
2. Capture app-specific context via closure (`unitId`, `filterMap`, …) — read fresh on each call.
3. Return `Observable<AurPage<T>>` (a Spring Data `Page<T>` qualifies as-is) — **no** `subscribe`, no `paginatorState`, no `tableData.set`, no spinner bookkeeping.

Plus one non-`loadPage` action: call `this.table.reload()` when an **external** filter changes (the table cannot observe app-owned filters).

Everything else — initial load, subscription/cancellation (`switchMap`), `length`/`pageIndex`, spinner, `tableData` — is owned by the table.

### What improves vs the previous (manual) approach

Removed from the host:

- `paginatorState = PaginatorState.empty()` → table-managed
- `onPageChange(event)` + manual `pageParams.page/size` → table sends `req`
- `loadData()` body (`showSpinner`, `subscribe`, `finalize`, `takeUntilDestroyed`, `new PaginatorState(total, number)`, `pageParams.elements`, `tableData.set`) → replaced by a pure `loadPage` (just `return`)
- `this.loadData()` in `ngOnInit` → initial load is automatic
- manual cancellation of stale ("jumping") requests → `switchMap` inside the table
- `[paginatorState]` + `(pageChange)` in HTML → `[pageSource]` + `(loadingChange)`
- `pageParams.page = 0` before each reload → `reload()` resets to page 0 by default

Net effect:

- **Less code:** ~20 lines of state bookkeeping → ~6 lines of `loadPage`.
- **Fewer failure points:** 3 coupled bindings (data + state + event) → 1 (`pageSource`).
- **Type-safe:** `Page<T>` fits as-is; `length`/`pageIndex` can't be swapped.
- **Fewer bugs:** stale-request cancellation out of the box.
- **Explicit mode:** `mode: 'server'` visible in config, no `paginatorState` magic.
- **No leaks:** subscription/teardown owned by the table (no host `takeUntilDestroyed` for the fetch).
- **Clean API:** `createEmpty` unneeded; nothing imported from private paths.
- **Uniform pattern:** every table looks the same — `loadPage` + `reload()`.
- **Zero migration risk:** the old path keeps working; this is additive.

## Architecture

### `activePaginator` resolver (new)

A single read accessor on the component: `get activePaginator(): MatPaginator { return this.externalPaginator ?? this.matPaginator; }`. Every place that currently touches `this.matPaginator` (`initPaginator`, `getTimelineVisibleData`, `resetPaginatorPageIndex`, and the new `ServerPageController` wiring) is routed through `activePaginator`. This is the single seam that makes approach C orthogonal to client/server data handling.

### `ServerPageController<T>` (new, in the existing provider style)

A small, independently testable unit that owns server-driven loading. The component delegates to it so the component file does not grow.

Responsibilities:

- Hold the `AurPageSource<T>` and the page size from config.
- On the initial load, seed the request's `sort` from the current `MatSort` state (default sort), not just `{ pageIndex: 0, pageSize }`.
- Trigger a load on: initial init, `(page)` from `activePaginator` (built-in or external), `(matSortChange)` (resetting to page index 0), and an explicit host-driven `reload()`.
- Expose `reload(opts?: { resetPageIndex?: boolean })` (delegated from the component's public method); `resetPageIndex` defaults to `true`. It pushes a new request through the same `switchMap`, cancelling any in-flight one.
- In server mode with an external paginator, push `length`/`pageIndex` back onto `activePaginator` imperatively (see approach C).
- Use **`switchMap`** so a newer request cancels a stale in-flight one (fast clicking).
- On success: expose `content` and an internal `PaginatorState` (`length = page.totalElements`, `pageIndex = page.number ?? request.pageIndex`).
- On error: emit via `pageError`, keep the stream alive (`catchError` inside the `switchMap` projection so the outer subscription survives).
- Track and expose a `loading` flag.
- `markForCheck()` for OnPush after each emission.

What it does / how it's used / what it depends on:

- **Does:** translates paginator + sort events into `AurPageRequest`s, calls the source, produces `{ data, state, loading }`.
- **Used by:** `NgxAurMatTableComponent` only — wired in `ngAfterViewInit` once `MatPaginator`/`MatSort` exist.
- **Depends on:** the user-supplied `AurPageSource<T>`, `PaginationConfig.size`, RxJS, the component's `ChangeDetectorRef`.

The component, when `pageSource` is present, assigns the controller's `data` to its internal `tableData` and the controller's `state` to its internal `paginatorState`, then runs the existing `refreshTable()` path. This **reuses the existing machinery**: `getTimelineVisibleData()` already returns unsliced data when `paginatorState` is set, and `prepareTableData()` already skips `initPaginator()` when `paginatorState` is set, so server data is not re-sliced client-side.

### Mode resolution (back-compat)

Effective mode is resolved as:

| Condition | Effective mode |
|---|---|
| `[pageSource]` is provided | **server (new, B)** |
| `[paginatorState]` is provided OR `pageableCfg.mode === 'server'` | server (legacy/manual path) |
| otherwise | client |

This keeps every existing usage working unchanged: the old server wiring (`pageableCfg` + `[paginatorState]` + `(pageChange)`) behaves exactly as before because `paginatorState` still forces server behavior.

## Data flow (mode B)

1. `ngAfterViewInit`: `activePaginator` (external if supplied, else built-in `MatPaginator`)/`MatSort` exist → controller reads the current `MatSort` state and fires the initial request `{ pageIndex: 0, pageSize: config.size, sort }`, where `sort` is the active default sort if a column declares one (`matSort.active` + `matSort.direction`), otherwise `undefined`. This ensures a table with a default sort loads correctly sorted on first paint.
2. `pageSource(request)` returns `Observable<AurPage<T>>`.
3. On emit: controller sets `loading=false`, computes `PaginatorState.of({ total: page.totalElements, pageIndex: page.number ?? request.pageIndex })`, hands `content` + state to the component, which assigns them internally and calls `refreshTable()`; `markForCheck()`.
4. User clicks page / changes size → `MatPaginator` `(page)` → controller builds new request (sort changes reset `pageIndex` to 0) → `switchMap` cancels any in-flight request → back to step 2.
5. Host changes an external filter → rebuilds its own filter state → calls `#table.reload()` → controller re-invokes `pageSource` (reading the fresh closure state), resetting to page 0 by default → back to step 2.

## Error handling

- Errors from `pageSource` are caught inside the `switchMap` projection; the outer subscription is never torn down.
- `@Output() pageError = EventEmitter<unknown>` surfaces the error to the host.
- `@Output() loadingChange = EventEmitter<boolean>` lets the host show a spinner.
- Both outputs are inert when `pageSource` is not used.

## Backward compatibility & deprecation

- Old client and server wiring untouched and fully supported.
- `externalPaginator` is optional; when absent, the built-in paginator renders and behaves exactly as today.
- `(pageChange)` and `(sort)` continue to emit in mode B (optional to listen).
- `NgxAurTablePageEventUtils.createEmpty` marked `@deprecated` (not needed in mode B).
- Fix the demo's deep relative import of `NgxAurTablePageEventUtils` to use the public entry point.

## Public API additions (`public-api.ts`)

- `AurPageRequest`, `AurPage<T>`, `AurPageSource<T>`
- `ServerPageController` (export for typing/testing)
- `PaginatorState.of` (already public via the component export; no new export line needed)
- `externalPaginator` input reuses `MatPaginator` from `@angular/material/paginator` — no new library type to export
- `reload(opts?: { resetPageIndex?: boolean })` — public method on `NgxAurMatTableComponent` (call via template ref)

## Testing

- `ServerPageController` unit tests:
  - initial load fires with `{ pageIndex: 0, pageSize }` (no default sort)
  - initial load seeds `sort` from an active default `MatSort` when a column declares one
  - page change builds the correct request
  - sort change resets `pageIndex` to 0
  - stale request is cancelled by a newer one (`switchMap`)
  - `pageSource` error → `pageError` emitted, stream stays alive
  - `loading` toggles true→false around a request
  - `pageIndex` taken from `page.number` when present, else from `request.pageIndex`
  - a Spring Data `Page<T>` value is accepted by `AurPageSource<T>` with no mapping (type-level + runtime)
  - `reload()` re-invokes `pageSource` reading fresh closure state (filters); `reload({ resetPageIndex: true })` (default) goes to page 0, `reload({ resetPageIndex: false })` keeps the current page
  - `reload()` while a request is in flight cancels the stale one (`switchMap`)
- Mode-resolution tests covering the table above (pageSource / paginatorState / mode / none).
- External paginator (`activePaginator`) tests, all four matrix cells:
  - external + client: `dataSource.paginator` bound to the external instance; built-in paginator not rendered
  - external + server: controller subscribes to the external `(page)`; `length`/`pageIndex` pushed onto the external paginator and it re-renders — **integration test that fails if the external paginator UI does not reflect the new `length`/`pageIndex`** (gates the RISK spike in approach C)
  - `activePaginator` resolves to `externalPaginator` when set, else built-in
  - external paginator supplied after `ngAfterViewInit` is still wired
- New demo component `table-with-server-pagesource` alongside the existing manual demo (which stays as the legacy example).
- New demo component `table-with-external-paginator` showing a host-owned `<mat-paginator>` driving the table (client and server variants).
- New demo component `table-with-server-filters` showing external filter components + `pageSource` + `reload()` (mirrors the `locator-front` pattern).

## Documentation

- README: new section “Server pagination via `pageSource` (recommended)”, with the manual path documented as legacy.
- README: new section “Using an external paginator (`externalPaginator`)” with the capability matrix.
- Changelog entry for the new `pageSource` API, `mode` field, `PaginatorState.of`, and `externalPaginator`.
