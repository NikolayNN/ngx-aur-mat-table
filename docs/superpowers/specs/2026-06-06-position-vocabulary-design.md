# Design: unify `position` vocabularies

**Date:** 2026-06-06
**Target version:** 19.2.0 (same release/branch as the other API cleanups — `refactor/output-rename`)
**Status:** Approved

## Problem

`position` fields across the config use three different vocabularies:

| Field | Vocab | Meaning | Consumed? |
|---|---|---|---|
| `ActionConfig.position` | `'start' \| 'end'` | which end the actions column sits | yes — `RowActionProvider:40` |
| `SelectionConfig.position` | `'start' \| 'end'` | which end the checkbox column sits | yes — `SelectionProvider:37` |
| `SortConfig.position` | `'right' \| 'left'` | sort-arrow side | yes — template `:260` |
| `IconView.position` | `'right' \| 'left'` | icon side vs text | **no — dead** (copied by factories, never rendered) |
| `PaginationConfig.position` | `'under' \| 'bottom'` | paginator vertical placement | yes — template `:2,:25` + provider |

Two findings narrow the work:
- `IconView.position` is unused — set by `ActionViewFactory`/`TableViewFactory` but read
  by no template.
- `PaginationConfig.position` is a *different axis* (vertical paginator placement), not a
  "which side" choice; its only flaw is that `under`/`bottom` read as synonyms.

The demo only uses `'start'` (×4, Action/Selection) and pagination `'under'`/`'bottom'`
(×2) — no demo uses the `right|left` fields, so converting them is low-risk.

## Decision

1. **Standardize horizontal "which side" on `'start' | 'end'`** (logical, RTL-friendly,
   matches Angular Material / CSS logical properties). `SortConfig.position` adopts it;
   `ActionConfig`/`SelectionConfig` already use it.
2. **Remove the dead `IconView.position`** field (YAGNI).
3. **Rename `PaginationConfig.position` `'under' | 'bottom'` → `'inline' | 'sticky'`** for
   clarity (it is a distinct vertical concept, not part of the start/end unification).

### Pagination behavior (drives the new names)

- `'bottom'` (current default) adds the `bottom-pagination` class: host fills
  `height: 100%`, `.table-container` gets `flex-grow:1; overflow:auto`, so the body
  scrolls and the paginator is **pinned to the bottom** of a fixed-height table →
  renamed **`'sticky'`**.
- `'under'` adds no class: the paginator sits **inline, directly under** the table in
  normal flow → renamed **`'inline'`**.

## Affected code

### Types — `model/ColumnConfig.ts`
- `SortConfig.position?: 'right' | 'left'` → `position?: 'start' | 'end'` (~l.183)
- `IconView.position?: 'right' | 'left'` → **delete the field** (~l.144)
- `PaginationConfig.position?: 'under' | 'bottom'` → `position?: 'inline' | 'sticky'` (~l.259)

### Sort consumer — `ngx-aur-mat-table.component.html:260`
- `[arrowPosition]="columnConfig.sort?.position === 'right' ? 'before' : 'after'"` →
  `[arrowPosition]="columnConfig.sort?.position === 'start' ? 'before' : 'after'"`
- Mapping: `'start'` → `'before'` (left in LTR), `'end'`/unset → `'after'` (right in LTR).
  **Default (unset) stays `'after'` — unchanged behavior.** The old `'left'`→`'after'`
  mapping was effectively inverted; the new one is logically correct.

### IconView.position removal — factories
- `factories/ActionViewFactory.ts:49` — delete `position: iconSource.position,` from
  `prepareIconConfig`.
- `model/TableViewFactory.ts:45` — delete `position: iconSource.position,` from
  `configureIcon`.
- The resolved `IconView<string>` no longer carries `position`; nothing reads it, so no
  template change is needed.

### Pagination consumer
- `providers/PaginationProvider.ts:11` — `public position: 'under' | 'bottom';` →
  `public position: 'inline' | 'sticky';`
- `providers/PaginationProvider.ts:17` — `this.position = config.position || 'bottom';`
  → `this.position = config.position || 'sticky';`
- `ngx-aur-mat-table.component.html:2` and `:25` — `paginationProvider.position === 'bottom'`
  → `paginationProvider.position === 'sticky'`, and the applied class
  `'bottom-pagination'` → `'sticky-pagination'`.
- `ngx-aur-mat-table.component.scss:5,17` — rename the two `&.bottom-pagination` selectors
  to `&.sticky-pagination`. (Internal CSS class — not public API.)

### Demo — `projects/aur-demo`
- `table-with-sticky-header/table-with-sticky-header.component.ts:33` — `position: 'under'`
  → `position: 'inline'`
- `table-with-sticky-header/table-with-sticky-header.component.ts:57` — `position: 'bottom'`
  → `position: 'sticky'`
- Action/Selection `'start'` usages unchanged (already `start|end`).

### Release / docs
- Append a fifth section to `changelog/19.2.0.md` documenting: `SortConfig.position`
  `right|left` → `start|end` (with the arrow/default note), `IconView.position` removed,
  and `PaginationConfig.position` `under|bottom` → `inline|sticky`. No version bump.

### Not touched
`ActionConfig`/`SelectionConfig` (already consistent); recommendations #2/#7/#8;
`changelog/19.0.*`; prior specs/plans.

## Tests

- Add `providers/PaginationProvider.spec.ts` cases (the file exists from the `enable`
  work): `position` defaults to `'sticky'` when unset; passes through `'inline'` when set.
- Existing `ng test` suite must stay green.

## Verification

- `npm run build_lib` compiles clean (AOT catches any missed `position` literal — e.g. a
  surviving `'right'`/`'bottom'` reference or a read of the removed `IconView.position`).
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` passes (existing +
  new pagination cases).
- `ng build aur-demo` template compilation succeeds (pre-existing bundle-budget ERROR is
  unrelated/out of scope).
- Grep confirms no remaining `'right' | 'left'` on `SortConfig`, no `IconView.position`,
  no `'under' | 'bottom'`, and no `bottom-pagination` outside history.

## Risk

Low. The only subtleties: (1) keep the Sort default (unset → `'after'`) unchanged, and
(2) the internal CSS class rename must update both the `.scss` selectors and the two
template `ngClass` references together. Everything else is a mechanical vocabulary swap
across an enumerated set of sites; the dead `IconView.position` removal is isolated to the
type plus two factory lines.
