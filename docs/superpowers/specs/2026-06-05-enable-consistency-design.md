# Design: consistent `enable` model across configs

**Date:** 2026-06-05
**Target version:** 19.2.0 (same release/branch as the other API cleanups — `refactor/output-rename`)
**Status:** Approved

## Problem

`TableConfig`'s sub-configs use three different `enable` models:

1. **Required opt-in** (`enable: boolean`, must write `enable: true`): `SortConfig`,
   `IndexConfig`, `FilterConfig`, `SelectionConfig`, `PaginationConfig`,
   `HeaderButtonConfig`, `DragDropConfig`, `TimelineConfig`, `TotalRowConfig`.
2. **Optional, default ON**: `ActionConfig.enable?` (`RowActionProvider` treats
   `undefined`/`null`/`true` as on).
3. **Presence/signal-based, default ON unless `enable: false`**: `HoverConfig`
   (`h?.enable !== false`) and — in practice — `TotalRowConfig` (declared *required*
   but `TotalRowProvider` reads `totalRowCfg?.enable ?? true`, a declared-vs-actual
   mismatch).

Eleven consumer sites each re-implement the on/off check differently
(`?? false`, `&& cfg.enable`, `?? true`, `=== undefined || ...`). Inconsistent and
error-prone.

Two facts shape the fix:
- Every `xxxCfg` key on `TableConfig` is already optional — a feature's config is
  **present only when the user opts in**, so requiring `enable: true` on top is
  redundant.
- `EmptyValue.*_CONFIG` (the `enable: false` blocks) are only **internal
  fallback/dummy-provider** configs; they are NOT merged into the user's
  `tableConfig`, so the model change does not interact with them.

## Decision

Unify on a single principle: **`enable` is an optional opt-OUT**, never a required
opt-in. `enable: false` always means "off"; the field is optional everywhere.

`enable` becomes `enable?: boolean` on all nine currently-required configs. Whether a
feature actually runs depends on its **enabling signal**, which differs by group:

### Group 1 — presence = intent (most features)

The feature is enabled when **its config object is present**, unless `enable: false`.
A shared helper expresses this:

```ts
// projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.ts
/** A feature is enabled when its config object is present, unless `enable: false`. */
export function isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
  return !!cfg && cfg.enable !== false;
}
```

Applies to: `SortConfig`, `IndexConfig`, `FilterConfig`, `SelectionConfig`,
`PaginationConfig`, `HeaderButtonConfig`, `DragDropConfig`, `TimelineConfig`,
`ActionConfig`.

### Group 2 — enabled by another signal; `enable` is pure opt-out (absence ≠ off)

Here the enabling signal is NOT "config present", so the helper does **not** apply and
the consumer keeps a default-on predicate (`cfg?.enable !== false`):

- **`HoverConfig`** — enabled by hover interaction; an absent `hoverCfg` still allows
  the hover overlay. Consumer `ngx-aur-mat-table.component.ts:618`
  (`h?.enable !== false`) is **left unchanged**.
- **`TotalRowConfig`** — enabled by the presence of columns with a `totalConverter`
  (`TotalRowProvider.canEnable`); `enable: false` only suppresses. Consumer keeps its
  default-on semantics (`TotalRowProvider.ts:29`). Only the *type* becomes optional.

> **Why two groups:** applying `isFeatureEnabled` (which returns `false` for an absent
> config) to Hover or TotalRow would be a behavior regression — an absent `hoverCfg`
> would disable hover, and an absent `totalRowCfg` would hide totals even when columns
> define `totalConverter`. Their enabling signal is interaction / total-columns, not
> config presence.

## Affected code

### Types — `model/ColumnConfig.ts` (required → optional)

Change `enable: boolean` → `enable?: boolean` in: `SortConfig`, `IndexConfig`,
`FilterConfig`, `SelectionConfig`, `PaginationConfig`, `HeaderButtonConfig`,
`DragDropConfig`, `TimelineConfig`, `TotalRowConfig`. Update each field's JSDoc to:
"default on when this config is present; set `false` to disable" (for `TotalRowConfig`:
"default on when any column defines `totalConverter`; set `false` to disable").
`ActionConfig.enable?` and `HoverConfig.enable?` are already optional — JSDoc only,
no signature change.

### New helper

- Create `projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.ts` exporting
  `isFeatureEnabled` (signature above).

### Group 1 consumers — switch to the helper

Providers (import `isFeatureEnabled` from `../utils/feature-enabled.util`):

| File:line | Before | After |
|---|---|---|
| `providers/IndexProvider.ts:54` | `(tableConfig.indexCfg && tableConfig.indexCfg.enable) \|\| false` | `isFeatureEnabled(tableConfig.indexCfg)` |
| `providers/SelectionProvider.ts:77` | `(tableConfig.selectionCfg && tableConfig.selectionCfg.enable) \|\| false` | `isFeatureEnabled(tableConfig.selectionCfg)` |
| `providers/PaginationProvider.ts:20` | `(tableConfig.paginationCfg && tableConfig.paginationCfg.enable) \|\| false` | `isFeatureEnabled(tableConfig.paginationCfg)` |
| `providers/HeaderButtonProvider.ts:12` | `cfg?.enable ?? false` | `isFeatureEnabled(cfg)` |
| `providers/DragDropProvider.ts:54` | `tableConfig?.dragDropCfg?.enable ?? false` | `isFeatureEnabled(tableConfig?.dragDropCfg)` |
| `providers/TimelineProvider.ts:48` | `tableConfig.timelineCfg?.enable ?? false` | `isFeatureEnabled(tableConfig.timelineCfg)` |
| `providers/RowActionProvider.ts:62` | `(tableConfig.actionCfg && (tableConfig.actionCfg.enable === undefined \|\| ... \|\| tableConfig.actionCfg.enable)) \|\| false` | `isFeatureEnabled(tableConfig.actionCfg)` |

Component TS — Sort filter (`ngx-aur-mat-table.component.ts:418`):
- Before: `.filter(c => c.sort && c.sort.enable && c.sort.customSort)`
- After: `.filter(c => c.sort != null && isFeatureEnabled(c.sort) && c.sort.customSort)`
  (the `c.sort != null` guard preserves type-narrowing for `c.sort.customSort`; import
  `isFeatureEnabled` into the component).

Template — two sites use the helper via a component passthrough (Angular templates
can't call free functions). Add to the component:
```ts
import { isFeatureEnabled as isFeatureEnabledFn } from './utils/feature-enabled.util';
// ...
/** Template helper: feature on when its config is present unless `enable: false`. */
isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
  return isFeatureEnabledFn(cfg);
}
```
(The component's Sort filter at `:418` uses the same imported `isFeatureEnabledFn`.)

- `ngx-aur-mat-table.component.html:5` (Filter):
  `*ngIf="tableConfig.filterCfg?.enable ?? false"` →
  `*ngIf="isFeatureEnabled(tableConfig.filterCfg)"`
- `ngx-aur-mat-table.component.html:258` (Sort):
  `*ngIf="columnConfig.sort && columnConfig.sort.enable; else notSortable"` →
  `*ngIf="isFeatureEnabled(columnConfig.sort); else notSortable"`

### Group 2 consumers — unchanged behavior

- `ngx-aur-mat-table.component.ts:618` (Hover) — leave `h?.enable !== false` as-is.
- `providers/TotalRowProvider.ts:29` — leave `tableConfig.totalRowCfg?.enable ?? true`
  as-is (default-on; gated by `canEnable`).

### `EmptyValue.ts` — unchanged

The internal `enable: false` fallback/dummy configs stay (still valid; they correctly
represent "off"). Not merged into user config, so no interaction.

## Compatibility

- **TypeScript:** required → optional is **not** a breaking change for callers — every
  existing config object still satisfies the type.
- **Runtime:** existing valid code always set `enable` (it was required), so
  `true`→on / `false`→off behaves identically. The only new behavior — *omitting*
  `enable` on a present Group-1 config now means on — was previously a compile error,
  so nothing existing relied on it. **No runtime regressions.**
- Side benefit: fixes the `TotalRowConfig` declared-required-vs-actual-optional
  mismatch.
- Conceptually the rule changes from opt-in to opt-out; documented as a (compatible)
  consistency change in the changelog.

## Tests

- Existing `ngx-aur-mat-table-pagination.spec.ts` (`{ enable: true, ... }`) and
  `ngx-aur-mat-table-row-style.spec.ts` (`enable: true`) continue to pass unchanged.
- Add focused unit tests for the helper `isFeatureEnabled`: absent → false; `{}` → true;
  `{enable:true}` → true; `{enable:false}` → false.
- Add provider-level cases for one representative Group-1 feature (Selection or
  Pagination): "config present without `enable` → enabled" and "`enable:false` →
  disabled", proving the new default-on-when-present behavior.

## Changelog

Append a fourth section to `changelog/19.2.0.md`: explain `enable` is now an optional
opt-out (default on when the feature's config is present, except `enable: false`), note
the two Group-2 exceptions keep their existing signal-driven default-on behavior, and
show a before/after where redundant `enable: true` is dropped.

## Verification

- `npm run build_lib` compiles clean.
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` passes (existing +
  new tests).
- `ng build aur-demo` template compilation succeeds (pre-existing bundle-budget ERROR is
  unrelated/out of scope). Note: demo configs currently pass `enable: true` explicitly;
  they remain valid and need no edits (optional cleanup only, out of scope).
- Grep confirms no Group-1 consumer still reads `enable` via the old ad-hoc predicates.

## Risk

Low. The subtlety is the **Group-1 vs Group-2 split** (Hover and TotalRow must NOT use
the helper — enumerated above). Everything else is a mechanical predicate unification
plus required→optional type relaxation, which is type- and runtime-compatible.
