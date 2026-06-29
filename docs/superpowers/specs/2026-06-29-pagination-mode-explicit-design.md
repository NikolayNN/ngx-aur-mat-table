# Explicit pagination mode: single source of truth, manual-server fix, back-compat cleanup

**Date:** 2026-06-29
**Status:** Approved (design)
**Scope:** `ngx-aur-mat-table` library — pagination/sort mode resolution
**Target version:** 19.16.0 (the leading `19` tracks the targeted Angular major — *not* semver; breaking changes ship as minor bumps within the Angular-major line)
**Compatibility:** Breaking (API contract). `paginationCfg.mode` becomes the single mode switch; `paginatorState` stops affecting the mode; two deprecated/back-compat APIs are removed. Shipped in 19.16.0 per the Angular-pinned versioning scheme.

## Problem

"Server-ness" is decided by **three** signals that disagree with each other:

1. `isServerMode()` → `!!pageSource` — gates the **paginator** wiring (`dataSource.paginator`).
2. `isServerWiring()` → `!!pageSource || paginationCfg.mode === 'server'` — gates the **sort** wiring (`dataSource.sort`).
3. raw `!!this.paginatorState` — gates the index offset, timeline slicing, `currentPaging()`, the `prepareTableData()` paginator skip, and the `ngOnInit` seed.

Consequences observed in 19.15.0:

- **Manual server pagination is broken** (`mode: 'server'` + `[paginatorState]` + `(pageChange)`, no `pageSource`). `initPaginator()` gates on signal #1, which is false without `pageSource`, so the built-in paginator is bound to `MatTableDataSource`. The already-paged server slice is re-sliced client-side: `MatTableDataSource._updatePaginator()` overwrites `paginator.length` with the array length, clamps `pageIndex` back to 0 on pages beyond the first, and emits a spurious `(page)` event. Sorting, meanwhile, is correctly server (signal #2). The `mode: 'server'` contract is internally inconsistent. This is a regression: the unconditional `initPaginator()` added to `ngAfterViewInit` for the `externalPaginator` feature re-binds the paginator regardless of `paginatorState`, defeating the original `prepareTableData()` back-compat guard.
- **The same input means different things.** Bare `[paginatorState]` without `mode` is treated as **client** for sorting (pinned by `LegacyManualHostComponent` in `ngx-aur-mat-table-server-sort.spec.ts`) but as **server** for the index offset and timeline. One input, two contradictory interpretations.
- **Back-compat leftovers add noise:** the implicit "paginatorState presence ⇒ server" detection, the `@deprecated` `NgxAurTablePageEventUtils.createEmpty`, and the positional `PaginatorState(total, pageIndex)` constructor (kept "for back-compat", replaced by `.of()`).

## Goals

- Make **`paginationCfg.mode` the single source of truth** for the pagination/sort mode.
- Make `paginatorState` a **pure state input** — total + page index for the paginator UI, never a mode signal.
- **Fix manual server pagination**: `mode: 'server'` without `pageSource` must not bind the paginator/sort to the data source and must not re-slice the server page.
- **Collapse three internal signals into two** clearly-named predicates.
- **Remove the back-compat leftovers** that created the confusion.
- Keep the API lean and the contract self-evident from config.

## Non-goals

- **Do not remove the manual server path.** The feedback that prompted this explicitly asks not to require `pageSource`; manual server (`mode: 'server'` + `[paginatorState]` + `(pageChange)`) stays — it just becomes explicit.
- **Do not change client mode.** `mode: 'client'` / unset behaves exactly as today.
- **Do not touch `ServerPageController` / `pageSource` internals.** The declarative loader is unchanged.
- **Do not redesign `PaginatorState`** into a plain interface. It stays a class; only the constructor visibility changes.
- **Manual server + `externalPaginator` is out of scope.** Manual server uses the built-in paginator. External-paginator server flows are supported via `pageSource` only (the host owns the external paginator's template and cannot have the table push `[length]`/`[pageIndex]` declaratively in the manual case). A dev-mode warning covers the unsupported combination (see Detailed changes §8).

## The contract (public, after this change)

| Configuration | Behavior |
|---|---|
| `mode: 'client'` or unset | Client pagination + sort in memory (unchanged) |
| `mode: 'server'` + `[paginatorState]` + `(pageChange)` | **Manual server** — host loads pages; table never re-slices, sorts on the server, emits `(pageChange)`/`(sort)` |
| `mode: 'server'` + `[pageSource]` | **Auto server** — table owns the load loop (unchanged) |
| `[pageSource]` without `mode` | Implies server (a `pageSource` is never client) |
| bare `[paginatorState]` without `mode` | **Client** (breaking — was a contradictory half-server) |

## Mode resolution (internal, after this change)

Two predicates replace the three signals:

```ts
/** Server contract: no client paginator/sort binding, no re-slicing, server index offset/timeline. */
private isServerMode(): boolean {
  return this.tableConfig?.paginationCfg?.mode === 'server' || !!this.pageSource;
}

/** Table owns the load loop (declarative). Gates ServerPageController only. */
private hasPageSource(): boolean {
  return !!this.pageSource;
}
```

`isServerWiring()` is **deleted** — it was the confusing near-synonym.

Rule of thumb for future edits: touching `ServerPageController` → `hasPageSource()`; touching wiring / slicing / state → `isServerMode()`.

**`pageSource ⇒ server`** falls out of `isServerMode()` (a `pageSource` forces server even if `mode` is omitted). **Contradiction guard:** if `paginationCfg.mode === 'client'` *and* `pageSource` is set, log a `isDevMode()` warning and treat it as server (`pageSource` wins). The table never silently ignores a `pageSource`.

## Detailed changes (`ngx-aur-mat-table.component.ts`)

1. **`isServerMode()`** (currently `!!pageSource`) → `mode === 'server' || !!pageSource`.
2. **Add `hasPageSource()`** → `!!pageSource`. **Delete `isServerWiring()`.**
3. **`initPaginator()`** — already gates on `isServerMode()`; now correct because `isServerMode()` is broad. No body change, but it is now the bug fix. (Keep the `if (this.tableDataSource.paginator !== target)` guard.)
4. **`initSortingDataAccessor()`** — replace `isServerWiring()` with `isServerMode()`. Same effect for `pageSource`/`mode:'server'`; now also keeps sort detached in any server config consistently.
5. **`prepareTableData()`** — remove the `if (!this.paginatorState) { ... }` wrapper around `initPaginator()`; call `initPaginator()` unconditionally. It is idempotent (target guard) and self-gates via `isServerMode()`, so the `paginatorState`-presence check is no longer needed.
6. **`_indexPageOffset`** (in `prepareTableData()`) — gate on `isServerMode()` instead of `!!paginatorState`, null-safe:
   `this._indexPageOffset = (this.isServerMode() && this.paginatorState) ? this.paginatorState.pageIndex * pageSize : 0;`
   (During the first `ngOnChanges`, before the `ngOnInit` seed, `paginatorState` may be undefined in server mode with no host value yet → offset 0, recomputed on the next refresh when data + state arrive.)
7. **`getTimelineVisibleData()`** and **`currentPaging()`** — replace `if (this.paginatorState)` with `if (this.isServerMode())`. `currentPaging()` reads `this.paginatorState` (guaranteed by the `ngOnInit` seed by the time the template evaluates total-row visibility); fall back to `PaginatorState.empty()` defensively.
8. **`ngOnInit` seed** — replace `isServerWiring()` with `isServerMode()`:
   `if (this.isServerMode() && !this.paginatorState) { this.paginatorState = PaginatorState.empty(); }`
   Add the contradiction dev-warn here (`mode:'client'` + `pageSource`) and the unsupported-combination dev-warn (`isServerMode()` + `externalPaginator` + `!hasPageSource()` → "manual server uses the built-in paginator; for an external paginator + server use `pageSource`").
9. **Controller-touching sites** — `sortTable()`, `onPageChangeInternal()`, `reload()`, and the `ngAfterViewInit` start gate currently use `isServerMode()` (old narrow meaning). Re-gate them on the controller's existence / `hasPageSource()`:
   - `ngAfterViewInit`: `if (this.hasPageSource()) { this.startServerController(); }`
   - `sortTable()` / `onPageChangeInternal()`: `if (this.serverPageController) { ... }` (drop the `isServerMode() &&` prefix — the controller only exists with `pageSource`).
   - `reload()`: `if (this.serverPageController) { ... } else { this.refreshTable(); }`.
10. **`ngOnChanges` `externalPaginator` branch** — keeps `isServerMode()` (now broad), which is *more* correct: `mode:'server'` + `externalPaginator` without `pageSource` no longer binds the external paginator to the data source. Subscribing/state-push for the external paginator stays controller-gated (`pageSource` only); the §8 dev-warn flags the unsupported manual+external combination.

### `PaginatorState` (`model/PaginatorState.ts`)

- Make the constructor **`private`**. Keep `static of({ total, pageIndex })` and `static empty()` as the only ways to build it.

### Remove `createEmpty`

- Delete `NgxAurTablePageEventUtils` (file `utils/ngx-aur-table-page-event.utils.ts` contains only `createEmpty`).
- Remove its export from `public-api.ts` (line 5).
- The server-mode auto-seed (`PaginatorState.empty()` in `ngOnInit`) replaces every use.

## Before / after (for changelog + migration)

### A. Behavior by configuration

| Configuration | Was (19.15.0) | Now (19.16.0) | Kind |
|---|---|---|---|
| `mode:'client'` / unset | Fully client | unchanged | ✅ |
| `mode:'server'` + `[paginatorState]` + `(pageChange)` | ❌ server sort but paginator bound → client re-slices the server page (empty page / reset to 0 / spurious `pageChange`) | ✅ `paginator=null`, no re-slice, all rows shown on any page, `(pageChange)` emits, host loads | 🐞→✅ fix |
| `mode:'server'` + `[pageSource]` | works | unchanged | ✅ |
| `[pageSource]` without `mode` | works as server | unchanged | ✅ |
| bare `[paginatorState]` without `mode` | ⚠️ contradictory (sort client, index/timeline server, pagination broken) | fully **client** | ⚠️ breaking |

### B. Why it was confusing — by subsystem

| Subsystem | bare `paginatorState` (no mode) — was | `mode:'server'` + `paginatorState` — was | Now (both via `isServerMode()`) |
|---|---|---|---|
| `dataSource.paginator` | bound → slices | bound → **slices (bug)** | `null` when server, bound when client |
| `dataSource.sort` | client (`matSort`) | server (`null`) | consistent with paginator |
| `_indexPageOffset` | server (by `paginatorState`) | server | by `isServerMode()` |
| timeline slicing | server | server | by `isServerMode()` |

### C. Public API

| Element | Was | Now | Kind |
|---|---|---|---|
| Mode source | `pageSource` **or** `mode` **or** `paginatorState` presence | `mode` only (`pageSource ⇒ server`) | ⚠️ breaking |
| `paginatorState` | switched mode + carried state | **state only** | ⚠️ breaking |
| `new PaginatorState(total, idx)` | public positional ctor | `private`; only `.of({total,pageIndex})` / `.empty()` | ⚠️ breaking |
| `NgxAurTablePageEventUtils.createEmpty(cfg)` | `@deprecated`, needed for manual start | removed; server auto-seeds `PaginatorState.empty()` | ⚠️ breaking |
| Internal predicates | `isServerMode()`=pageSource, `isServerWiring()`=pageSource\|\|mode | `isServerMode()`=mode\|\|pageSource, `hasPageSource()`=pageSource; `isServerWiring()` removed | internal |

## Demo

Add `table-with-manual-server-pagination` to `aur-demo`, mirroring the existing `table-with-server-pagination` component but with the manual wiring:

- Config: `paginationCfg: { enable: true, size: 20, sizes: [...], mode: 'server' }`.
- Template: `[tableData]="page.content"`, `[paginatorState]="paginatorState"`, `(pageChange)="loadPage($event)"`.
- Host: `loadPage(e: PageEvent)` calls the existing `CustomerService.page(pageIndex, pageSize)`, then sets `tableData = page.content` and `paginatorState = PaginatorState.of({ total: page.totalElements, pageIndex: page.number })`. Initial load in `ngOnInit`.
- Register in the demo module + routing/menu next to the existing server-pagination demo, so both the declarative (`pageSource`) and manual paths are demonstrated.

## Testing

**Rewrite the contradictory pin:**
- `ngx-aur-mat-table-server-sort.spec.ts` → `LegacyManualHostComponent`: bare `[paginatorState]` without `mode` is now **fully client**. Update the expectation: `tableDataSource.sort === matSort` still holds (client sort), and add that `tableDataSource.paginator === matPaginator` (client pagination) — i.e. the bare-state case is uniformly client now, not half-server. Rename to reflect "no mode ⇒ client".

**New manual-server regression spec** (`ngx-aur-mat-table-manual-server-pagination.spec.ts`):
- `mode:'server'` + `[paginatorState]` + `[tableData]` (e.g. 20 rows), no `pageSource`.
- `tableDataSource.paginator === null` and `tableDataSource.sort === null`.
- All 20 rows render on `pageIndex: 0` **and** on `pageIndex: 1` (the array is not re-sliced) — the original bug.
- `(pageChange)` emits the `PageEvent` on paginator interaction.
- No automatic fetch occurs (no `pageSource` to call; assert via a spy that nothing is invoked / data stays as provided).
- Paginator renders `length`/`pageIndex` from `paginatorState`.
- `(sort)` emits `matSortChange`, and the current server page is **not** re-sorted locally.

**`PaginatorState.spec.ts`:**
- Remove the "still supports the positional constructor (back-compat)" test.
- Keep `.of(...)` and `.empty()` tests. (A type-level note: `new PaginatorState(...)` from outside no longer compiles.)

**Regression guard (existing must stay green):**
- `ngx-aur-mat-table-pagination.spec.ts` (server `pageSource`, external paginator server, external paginator client) — unchanged behavior.
- Any spec importing `NgxAurTablePageEventUtils` / `createEmpty` — migrate to `PaginatorState.empty()` or delete.
- `grep` for `new PaginatorState(` and `createEmpty(` across `projects/**` (lib specs + demos) and migrate every call site.

## Documentation

- **`docs/MIGRATION-19.16.0.md`** — the three before/after tables (A, B, C), plus migration snippets per breaking item:
  - manual server now requires `mode: 'server'` (add the field);
  - bare `[paginatorState]` without `mode` is now client (add `mode: 'server'` to keep server behavior);
  - `new PaginatorState(total, idx)` → `PaginatorState.of({ total, pageIndex: idx })`;
  - `NgxAurTablePageEventUtils.createEmpty(cfg)` → remove (server auto-seeds) or `PaginatorState.empty()`.
- **Changelog 19.16.0** (Russian, Keep-a-Changelog, via the `writing-changelog` skill) — Breaking section listing the four API changes + the manual-server fix.
- **README** — pagination section: `mode` as the single switch; the three-row contract table; note that `paginatorState` is state-only.

## Files touched (summary)

- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — predicates + the 10 wiring changes.
- `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.ts` — private constructor.
- `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts` — deleted.
- `projects/ngx-aur-mat-table/src/public-api.ts` — drop the deleted export.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-server-sort.spec.ts` — rewrite legacy-manual pin.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-manual-server-pagination.spec.ts` — new.
- `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.spec.ts` — drop positional-ctor test.
- `projects/aur-demo/src/app/table-with-manual-server-pagination/**` — new demo + module/route wiring.
- `docs/MIGRATION-19.16.0.md`, `changelog/19.16.0.md`, `README.md` — docs.
