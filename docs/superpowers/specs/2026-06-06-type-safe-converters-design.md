# Design: type-safe converters (`any` → generic `V` / `unknown`)

**Date:** 2026-06-06
**Target version:** 19.3.0 (own branch `refactor/type-safe-converters`; not bundled with the 19.2.0 cleanup)
**Status:** Approved

## Problem

Recommendation #8. The converter/total surface of the public API is typed with
`any`, so cell values and column totals carry no static type:

- `ColumnConfig<T>.valueConverter: (value: T) => any` — the produced cell value is `any`.
- `ColumnConfig<T>.totalConverter?: (value: TableRow<T>[]) => any` — the column total is `any`.
- `TotalHook<T, R>` totals param `Map<string, any>`, mirrored by
  `TotalRowProvider.totals = new Map<string, any>()` and the component's
  `resolveTotal` totals param.

`any` here disables checking and silently swallows mistakes.

## Decision

Adopt **Option 1 — a per-column cell-type generic `V`** (the "second per-column
generic"), with `V` defaulting to `unknown`. This is the lightest change that
matches #8's literal goal (remove `any` from the converter/total surface) at a cost
proportionate to the architecture. Full keyed-schema safety (Option 3) is rejected:
the library is built on `TableRow<T>` with a load-bearing `[key: string]: any`
index signature and runtime string-keyed columns; a schema rewrite would break that
ergonomics and ripple heavily into the demo and the consuming `locator-front`.

### Cell-type generic on `ColumnConfig`

```ts
export interface ColumnConfig<T, V = unknown> {
  name: string;
  key: string;
  valueConverter: (value: T) => V;                 // was (value: T) => any
  sort?: SortConfig<T>;
  headerView?: ColumnView<string>;
  valueView?: ColumnView<(value: TableRow<T>) => string>;
  totalConverter?: (value: TableRow<T>[]) => unknown;  // was => any (see below)
  size?: ColumnSize;
}
```

- `V` is the cell value type. It is **opt-in**: it pays off for standalone-declared
  columns (`const c: ColumnConfig<Person, number> = { key: 'age', valueConverter: v => v.age, … }`
  forces `valueConverter` to return `number`). Inside a `ColumnConfig<T>[]` array
  `V` collapses to its default `unknown` (the array is heterogeneous). This is the
  accepted, known limitation of Option 1.
- **`totalConverter` stays independent of `V`** — it becomes `(rows) => unknown`,
  not `(rows) => V`. Tying it to `V` would conflict for columns whose total type
  differs from the cell type (e.g. a string-cell column with a numeric `length`
  total). A third type parameter for the total is not justified: totals are always
  read back from a heterogeneous `Map<string, unknown>`, so capturing the per-column
  total type buys nothing downstream.

### `any → unknown` hardening on the totals aggregate

The totals map aggregates *different* columns under string keys, so it cannot be a
single `V`. Harden its `any` to `unknown` everywhere it appears:

- `TotalHook<T, R>`: `R | ((totals: Map<string, any>, data: TableRow<T>[]) => R)`
  → `Map<string, unknown>`.
- `TotalRowProvider.totals`: `new Map<string, any>()` → `new Map<string, unknown>()`.
  `this.totals.set(col.key, col.totalConverter(data))` stays valid (`unknown` value).
- `NgxAurMatTableComponent.resolveTotal`'s `totals` parameter: `Map<string, any>`
  → `Map<string, unknown>`. The body casts the hook to `any` before calling
  (`(v as any)(totals, data)`), so no internal change is needed.

## Affected code

### Library — types (`model/ColumnConfig.ts`)
- `ColumnConfig<T>` → `ColumnConfig<T, V = unknown>`; `valueConverter` return `any` → `V`;
  `totalConverter` return `any` → `unknown`. Update JSDoc to describe `V` and the
  independent total type.
- `TotalHook<T, R>` (l.111): totals param `Map<string, any>` → `Map<string, unknown>`.

### Library — totals plumbing
- `providers/TotalRowProvider.ts:9`: `totals = new Map<string, any>()`
  → `new Map<string, unknown>()`.
- `ngx-aur-mat-table.component.ts:611–612`: `resolveTotal`'s union and `totals`
  param `Map<string, any>` → `Map<string, unknown>`.

### Library — spec narrowing (totals read becomes `unknown`)
- `ngx-aur-mat-table-row-style.spec.ts:104,105`:
  `totals.get('name') >= 2` → `(totals.get('name') as number) >= 2`
  (both the `style` and `class` hooks).

### Demo (`projects/aur-demo`) — totals read becomes `unknown`
- `table-with-total/table-with-total.component.ts:41`:
  `totals.get('age') < 100` → `(totals.get('age') as number) < 100`.

### Release / docs
- New `changelog/19.3.0.md`: a "type-safety" section explaining the `ColumnConfig`
  cell-type generic `V` (default `unknown`), the `totalConverter`/totals-map
  `any → unknown` hardening, that it is source-compatible for `ColumnConfig<T>`
  references, and a before/after showing the one migration (narrowing a
  `totals.get(key)` read). Note `locator-front` may need the same narrowing
  (documented only — separate repo).
- Bump `projects/ngx-aur-mat-table/package.json` version `19.2.0` → `19.3.0`.

### Explicit non-goals (stay `any`)
- `TableRow<T>` `[key: string]: any` — the dynamic escape hatch for `row[key]`
  reads in templates; tightening it is Option 3 (rejected).
- `SortConfig.customSort: (data, key) => any` — a comparator result, outside #8's
  converter/total scope. Possible standalone follow-up; **not** touched here.
- `columnsCfg: ColumnConfig<T>[]` references across lib/demo — unchanged. `V`
  defaults to `unknown`; concrete converter returns widen to `unknown` with no error.

## Compatibility

- **TypeScript:** adding a defaulted second type parameter is **not** breaking for
  any `ColumnConfig<T>` reference — the default applies. Existing inline columns
  with concrete converters (`v => v.name`) remain assignable to
  `ColumnConfig<T, unknown>` (return widens to `unknown`).
- **The only break:** code using the function form of `TotalHook` that reads the
  totals map (`totals.get(k)`) now receives `unknown` and must narrow. Enumerated
  above: one demo site, two spec lines, and possibly `locator-front`.
- **Runtime:** no behavior change — purely type-level.

## Tests

- Existing `ng test ngx-aur-mat-table` suite stays green (with the two narrowed
  `row-style.spec.ts` lines).
- Optional: a focused type-level assertion that a standalone
  `ColumnConfig<Person, number>` rejects a `valueConverter` returning a non-`number`
  (compile-fail probe), kept out of the runtime suite.

## Verification

- `npm run build_lib` compiles clean (AOT is the type oracle — catches any missed
  `any` site or a totals read left un-narrowed).
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` passes.
- `ng build aur-demo` template/TS compilation succeeds (pre-existing bundle-budget
  ERROR is unrelated/out of scope).
- Grep confirms no remaining `=> any` on `valueConverter`/`totalConverter` and no
  `Map<string, any>` in the totals plumbing (`TotalHook`, `TotalRowProvider`,
  `resolveTotal`).

## Risk

Low–moderate. The subtleties: (1) keep `totalConverter` independent of `V`
(`=> unknown`, not `=> V`) — enumerated; (2) the `unknown` totals reads need
explicit narrowing at the three known sites; (3) do **not** touch the `TableRow`
index signature or `customSort` (scope discipline). Everything else is a mechanical
type swap across an enumerated set of sites, source-compatible for existing
`ColumnConfig<T>` usage.

## Not touched

The consuming `locator-front` app (separate repo — changelog note only); the
`changelog/19.0.*`, `19.1.0`, `19.2.0` files; prior `docs/superpowers/` specs/plans;
recommendations #2 and #7.
