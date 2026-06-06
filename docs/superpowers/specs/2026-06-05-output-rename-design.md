# Design: `@Output` naming cleanup

**Date:** 2026-06-05
**Target version:** 19.2.0
**Status:** Approved

## Problem

The component's `@Output()` events mix two naming styles:

- No prefix: `sort`, `pageChange`, `selected`, `selectionModel`, `loadingChange`, `pageError`, `columnOffsets`
- `on`-prefix: `onRowAction`, `onSelect`, `onDeselect`, `onSelectedRowsAction`, `onRowClick`, `onFilter`, `onHeaderButton`

The Angular style guide forbids the `on` prefix on outputs (it produces awkward `(onRowClick)="..."` bindings and collides with the DOM `on*` handler convention). The library should expose one consistent style: no prefix.

Additionally, the selection events are named inconsistently relative to their payloads:

- `selected` emits the **entire current selection** (`selection.selected`)
- `onSelect` emits **only the added** items (`event.added`)
- `onDeselect` emits **only the removed** items (`event.removed`)

The names do not signal that two of them are deltas while one is the full set.

## Decision

Rename outputs to a single prefix-free convention, with the selection trio renamed to make the full-set-vs-delta distinction explicit. **Hard break, no deprecated aliases.**

### Rename table

| Current | New | Payload (unchanged) |
|---|---|---|
| `selected` | `selectChange` | full current selection `T[]` |
| `onSelect` | `selectAdded` | added items `T[]` (`event.added`) |
| `onDeselect` | `selectRemoved` | removed items `T[]` (`event.removed`) |
| `onRowClick` | `rowClick` | `T` |
| `onRowAction` | `rowAction` | `ActionEvent<T>` |
| `onSelectedRowsAction` | `selectedRowsAction` | `ActionEvent<T[]>` |
| `onFilter` | `filterChange` | `T[]` |
| `onHeaderButton` | `headerButton` | `MouseEvent` |

> Naming notes (decided during implementation review): the selection family uses
> a single `select` stem (`selectChange`/`selectAdded`/`selectRemoved`) for symmetry
> and to avoid colliding with Angular Material's `selectionChange`. The filter event
> is `filterChange` (not bare `filter`) to read clearly as an Angular `*Change` event
> and avoid confusion with `Array.prototype.filter`.

### Unchanged

`sort`, `pageChange`, `loadingChange`, `pageError`, `selectionModel`, `columnOffsets` (already prefix-free; `columnOffsets` is already `@deprecated`).

### Scope

Only `@Output()` events. Inputs, config keys, providers' public types, and other API surfaces are **out of scope** for this change (tracked separately as future cleanup).

## Affected code

**Library:**
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — 8 `@Output()` declarations, their internal `.emit()` call sites, and the argument passed to `SelectionProvider.bindEventEmitters(...)`.
- `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts` — `bindEventEmitters` parameter names (cosmetic, kept in sync for readability).
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — only if it binds to these outputs internally (verify during implementation).
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-menu-action.spec.ts` — update assertions/bindings on renamed outputs.

**Demo (`projects/aur-demo`):**
- Templates binding renamed outputs: `complex-object`, `table-big`, `table-editable`, `table-with-filter-actions`, `table-with-menu`, `table-with-pagination-and-checkboxes`, `table-with-selection`, `with-actions/actions-before`, `with-actions/table-with-actions`.
- Consumer handler method names in the `.ts` files may stay as-is; only the template binding's left-hand side (the output name) must change.

**Docs / release:**
- `README.md` — update output references and any examples.
- New migration section (in README or migration guide) documenting old → new names.
- `CHANGELOG` entry.
- `package.json` version bump → `19.2.0`.

**Explicitly NOT touched (historical records):**
- `changelog/19.0.17.md`, `changelog/19.0.18.md`
- `docs/superpowers/plans/2026-06-02-action-icon-menu.md`
- `docs/superpowers/specs/2026-06-02-action-icon-menu-design.md`

## Verification

- `ng build ngx-aur-mat-table` compiles clean.
- Demo app builds (`ng build`) — catches any missed template binding (Angular errors on unknown `@Output` bindings under strict templates).
- `ng test` passes, including the updated menu-action spec.
- Grep confirms no remaining references to old output names outside the historical files listed above.

## Risk

None outstanding. The earlier concern about a bare `filter` output name was resolved by
naming it `filterChange`.
