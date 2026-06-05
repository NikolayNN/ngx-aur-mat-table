# Design: type-safe `visible` / `disabled` (replace magic strings)

**Date:** 2026-06-05
**Target version:** 19.2.0 (same release/branch as the `@Output` and `TableConfig` renames — `refactor/output-rename`)
**Status:** Approved

## Problem

The control fields `display` and `disabled` are typed as the generic `T` on
`IconView<T>`, `Action<T>`, and `MenuItem<T>`. Because `T` is either `string`
(static config) or `(value) => string` (dynamic config), these fields inherit no
constraint on their *value*:

- `IconView<T>.display` / `Action<T>.display` / `MenuItem<T>.display` accept the
  magic strings `'show' | 'none'` unchecked.
- `MenuItem<T>.disabled` accepts the string-booleans `'true' | 'false'` unchecked.

There is no autocompletion and a typo (`'shows'`, `'False'`) compiles silently.
This is the dirtiest remaining inconsistency in the public API.

## Decision

Hard break (no deprecated aliases), consistent with the other 19.2.0 renames.
Replace the magic strings with **boolean semantics**, and rename `display` →
`visible` on all three interfaces.

### New exported helper type

Keeps the existing static-or-function duality but pins the resolved value type:

```ts
/** Static value R when T is a plain value; a (value) => R resolver when T is a function. */
export type Resolvable<T, R> = T extends (arg: infer A) => any ? (arg: A) => R : R;
```

- `IconView<string>` → `Resolvable<string, boolean>` = `boolean`
- `IconView<(row) => string>` → `Resolvable<(row) => string, boolean>` = `(row) => boolean`

### Config type changes (`model/ColumnConfig.ts`)

| Interface | Before | After |
|---|---|---|
| `IconView<T>` | `display?: T` | `visible?: Resolvable<T, boolean>` |
| `Action<T>` | `display?: T` | `visible?: Resolvable<T, boolean>` |
| `MenuItem<T>` | `display?: T` | `visible?: Resolvable<T, boolean>` |
| `MenuItem<T>` | `disabled?: T` | `disabled?: Resolvable<T, boolean>` |

### Semantics

- `visible`: `undefined` or `true` → shown; `false` → hidden.
  (Inverts the old `'show'`/`'none'` vocabulary — `'none'` becomes `false`.)
- `disabled`: `undefined` or `false` → enabled; `true` → disabled.

Resolved view types (`IconView<string>`, `Action<string>`, `MenuItem<string>` —
what the factories produce) automatically collapse to `boolean`.

## Affected code

**Library — type/field definitions:**
- `model/ColumnConfig.ts`
  - add `Resolvable<T, R>` helper type
  - `IconView<T>` (l.143 `display?: T` + comment l.140-142) → `visible?`
  - `Action<T>` (l.213 `display?: T`) → `visible?`
  - `MenuItem<T>` (l.224 `display?` + comment, l.226 `disabled?` + comment) → `visible?` / `disabled?`
  - update JSDoc on the renamed fields to describe the booleans

**Library — factories (resolve to booleans with correct defaults):**
- `factories/ActionViewFactory.ts`
  - l.29 `display: action.display ? action.display(row.rowSrc) : 'show'`
    → `visible: action.visible ? action.visible(row.rowSrc) : true`
  - l.39 `display: item.display ? item.display(value) : 'show'`
    → `visible: item.visible ? item.visible(value) : true`
  - l.40 `disabled: item.disabled ? item.disabled(value) : 'false'`
    → `disabled: item.disabled ? item.disabled(value) : false`
- `model/TableViewFactory.ts`
  - l.47 `display: iconSource.display ? iconSource.display(row) : 'show'`
    → `visible: iconSource.visible ? iconSource.visible(row) : true`

**Library — template comparisons:**
- `ngx-aur-mat-table.component.html`
  - l.167, l.208, l.237 `action.display !== 'none'` → `action.visible !== false`
  - l.212 `item.display !== 'none'` → `item.visible !== false`
  - l.213 `item.disabled === 'true'` → `item.disabled === true`
- `components/icon-view/icon-view.component.html`
  - l.3 `view?.display !== 'none'` → `view?.visible !== false`

**Library — specs:**
- `factories/ActionViewFactory.spec.ts`
  - l.29 fixture `display: (c) => (c.age < 21 ? 'none' : 'show')` → `visible: (c) => c.age >= 21`
  - l.30 fixture `disabled: (c) => (c.age < 21 ? 'true' : 'false')` → `disabled: (c) => c.age < 21`
  - l.51 `expect(edit.display).toBe('show')` → `expect(edit.visible).toBe(true)`
  - l.52 `expect(edit.disabled).toBe('false')` → `expect(edit.disabled).toBe(false)`
  - l.59 `expect(del.display).toBe('none')` → `expect(del.visible).toBe(false)`
  - l.60 `expect(del.disabled).toBe('true')` → `expect(del.disabled).toBe(true)`
  - l.38 test title `'resolves menu item functions to strings per row'` → `'... to booleans per row'`
    (cosmetic; the field values are now booleans)

**Demo (`projects/aur-demo`):**
- `with-actions/table-with-actions/table-with-actions.component.ts`
  - l.62 `disabled: (c) => (c.age < 18 ? 'true' : 'false')` → `disabled: (c) => c.age < 18`
  - l.67 `display: (c) => (c.age < 18 ? 'none' : 'show')` → `visible: (c) => c.age >= 18`
- `table-with-menu/table-with-menu.component.ts`
  - l.46 `disabled: (c) => (c.age < 18 ? 'true' : 'false')` → `disabled: (c) => c.age < 18`
  - l.52 `display: (c) => (c.age < 18 ? 'none' : 'show')` → `visible: (c) => c.age >= 18`
- `table-with-icons/table-with-icons.component.ts`
  - l.51 `display: v => v.rowSrc.name.length % 2 == 0 ? 'none' : 'show'`
    → `visible: v => v.rowSrc.name.length % 2 !== 0`

**Release / docs:**
- Append a third breaking section to `changelog/19.2.0.md` documenting the
  `display → visible` rename, the `'show'/'none'` → boolean and `'true'/'false'`
  → boolean change, with an old→new table and a before/after example.
- No version bump — already `19.2.0` in this branch.

**Not touched:** the consuming `locator-front` app (separate repo — documented in
changelog only); `changelog/19.0.*`; prior `docs/superpowers/` specs/plans.

## Verification

- `npm run build_lib` compiles clean (catches missed field references and any
  place a resolver still returns a string instead of a boolean).
- `ng build aur-demo` template compilation succeeds with no NG-binding/type errors
  (the pre-existing bundle-budget ERROR is unrelated and out of scope).
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` passes.
- Grep confirms no remaining `.display` config access, `'show'`/`'none'` control
  strings, or `'true'`/`'false'` string-booleans outside historical files and the
  unrelated `style-builder` `NONE = "none"` enum / `gapStyle` `'none'` literal.

## Risk

Low. The change set is a small, enumerated list of sites. The one subtlety is the
**logic inversion** for `display → visible` (`'none'` means hidden → `visible: false`);
each demo and template site is inverted explicitly in this spec. The `style-builder`
`none` and `TimelineLineConfig.gapStyle: 'none'` are unrelated namesakes and must NOT
be touched.
