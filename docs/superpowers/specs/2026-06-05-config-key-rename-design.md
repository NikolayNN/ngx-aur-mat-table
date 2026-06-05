# Design: `TableConfig` key & type naming cleanup

**Date:** 2026-06-05
**Target version:** 19.2.0 (same release/branch as the `@Output` rename — `refactor/output-rename`)
**Status:** Approved

## Problem

Four `TableConfig<T>` keys break the established `xxxCfg` convention or diverge from
their own type names:

- `pageableCfg` has type `PaginationConfig` — key name and type disagree.
- `tableHeaderButtonCfg` is verbose and redundantly prefixed with `table`.
- `tableView` has no `Cfg` suffix.
- `dragCfg` diverges from its type `DragDropConfig` and the drag-and-drop feature name.

Two of the corresponding type names are also inconsistent with the `XxxConfig`
convention used by every other config type (`IndexConfig`, `FilterConfig`,
`PaginationConfig`, …).

## Decision

Hard break (no deprecated aliases), consistent with the `@Output` rename in the same release.

### Key renames (on `TableConfig<T>`)

| Old key | New key |
|---|---|
| `pageableCfg` | `paginationCfg` |
| `tableHeaderButtonCfg` | `headerButtonCfg` |
| `tableView` | `tableViewCfg` |
| `dragCfg` | `dragDropCfg` |

### Type renames

| Old type | New type | Reason |
|---|---|---|
| `TableHeaderButtonConfig` | `HeaderButtonConfig` | drop redundant `Table` prefix |
| `TableView` | `TableViewConfig` | add `Config` suffix to match the family |
| `PaginationConfig` | *(unchanged)* | already correct |
| `DragDropConfig` | *(unchanged)* | already correct |

### Unchanged keys (already consistent)

`columnsCfg`, `indexCfg`, `filterCfg`, `actionCfg`, `selectionCfg`, `stickyCfg`,
`totalRowCfg`, `timelineCfg`, `headerRowCfg`, `bodyRowCfg`, plus the non-config
`name` field.

### Scope

Only `TableConfig` keys and the two type names above. Field *contents* (the shape of
each sub-config) are unchanged. The `@Output` rename is a separate, already-completed
change in this same branch.

## Critical: `tableView` has a namesake that must NOT change

The component has an internal property `tableView: Map<string, ColumnView<string>>[]`
(`ngx-aur-mat-table.component.ts:105`) used in the template as `tableView[element.id]`
(`ngx-aur-mat-table.component.html:292`) and assigned at `component.ts:426`. This is a
**different** symbol from the `TableConfig.tableView` key. Only the config-key accesses
(`tableConfig.tableView?.height|maxHeight|minHeight` in the template) are renamed; the
internal `tableView` property stays as-is.

## Affected code

**Library — type/key definitions:**
- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
  - key defs: `pageableCfg` (l.40), `tableView` (l.42), `tableHeaderButtonCfg` (l.43), `dragCfg` (l.44)
  - type defs: `TableView` (l.258), `TableHeaderButtonConfig` (l.270)
  - in-file type references on the renamed keys (l.42, l.43)

**Library — `paginationCfg` (was `pageableCfg`) consumers:**
- `model/EmptyValue.ts:32`
- `ngx-aur-mat-table.component.html:408`
- `ngx-aur-mat-table.component.ts:670, 699`
- `providers/PaginationProvider.ts:20, 24, 25`
- `utils/ngx-aur-table-page-event.utils.ts:11`

**Library — `headerButtonCfg` (was `tableHeaderButtonCfg`) consumers:**
- `ngx-aur-mat-table.component.ts:396`
- `providers/HeaderButtonProvider.ts:2` (import of type), `:10` (param type)

**Library — `tableViewCfg` (was `tableView` config key) consumers:**
- `ngx-aur-mat-table.component.html:39, 40, 41` (`tableConfig.tableView?.…`)
- NOT `:292`, NOT `component.ts:105, 426` (internal property — leave unchanged)

**Library — `dragDropCfg` (was `dragCfg`) consumers:**
- `providers/DragDropProvider.ts:48, 54` (`tableConfig.dragCfg…`)
- The local constructor parameter named `dragCfg` (`DragDropProvider.ts:22-29`) is renamed
  to `dragDropCfg` for readability (cosmetic; it receives the key's value).

**Library — type rename `TableHeaderButtonConfig → HeaderButtonConfig`:**
- `ColumnConfig.ts:270` (def), `:43` (usage)
- `providers/HeaderButtonProvider.ts:2` (import), `:10` (param)

**Library — type rename `TableView → TableViewConfig`:**
- `ColumnConfig.ts:258` (def), `:42` (usage)

**Demo (`projects/aur-demo`) — `pageableCfg → paginationCfg`:**
- `table-hide-show-body`, `table-pagination-matrix` (×2 lines), `table-with-external-paginator`,
  `table-with-pagination-and-checkboxes`, `table-with-pagination`, `table-with-server-filters`,
  `table-with-server-pagination-component/.../table-with-server-pagination-and-select`,
  `table-with-server-pagination-component/table-with-server-pagination`,
  `table-with-sticky-header` (×2 lines)

**Demo — `tableHeaderButtonCfg → headerButtonCfg`:**
- `table-with-filter-custom-buttons`, `table-with-settings-button`

**Demo — `dragCfg → dragDropCfg`:**
- `table-drag/tables-drag-drop/table-drag-drop/table-drag.component.ts:37`

**Demo — `tableView → tableViewCfg`:** none found (no demo sets the table-view config key).

**Release / docs:**
- Append a section to `changelog/19.2.0.md` documenting the key/type renames.
- (No version bump — already `19.2.0` in this branch.)

**Not touched (historical):** `changelog/19.0.*`, prior `docs/superpowers/` specs/plans.

## Verification

- `npm run build_lib` compiles clean (catches missed type references).
- `ng build aur-demo` template compilation succeeds with no NG-binding/type errors
  (the pre-existing bundle-budget ERROR is unrelated and out of scope).
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` passes.
- Grep confirms no remaining `pageableCfg`, `tableHeaderButtonCfg`, `dragCfg`, or
  `TableConfig.tableView` key access, and no `TableHeaderButtonConfig`/`TableView` type
  references, outside historical files.

## Risk

`tableView` namesake collision (addressed above) is the only trap. Everything else is a
straightforward identifier rename across a known, enumerated set of sites.
