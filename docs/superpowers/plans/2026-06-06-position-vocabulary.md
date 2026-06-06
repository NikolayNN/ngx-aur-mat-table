# Unify `position` Vocabularies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize horizontal placement on `'start' | 'end'` (Sort adopts it), remove the dead `IconView.position`, and rename `PaginationConfig.position` `'under' | 'bottom'` → `'inline' | 'sticky'`.

**Architecture:** Three independent vocabulary changes, each self-contained and build-green on its own commit: (1) delete dead `IconView.position` + its two factory copies; (2) `SortConfig.position` `right|left`→`start|end` + the one arrow-mapping template predicate; (3) Pagination `under|bottom`→`inline|sticky` across type, provider, template, and the internal CSS class. Then a provider test, demo migration, and changelog.

**Tech Stack:** Angular 19.2, Angular Material 18.2, TypeScript, Karma/Jasmine.

---

## Critical context for the implementer (read before starting)

- **`IconView.position` is dead** — no template reads it; it is only copied by two
  factories. Removing it is safe and isolated.
- **Sort default must not change.** The template maps the arrow as
  `position === 'start' ? 'before' : 'after'`, so an *unset* position still yields
  `'after'` (unchanged). Only the explicit vocabulary changes (`'right'`→`'start'`/`'end'`).
- **Pagination is a different axis** (vertical paginator placement). `'bottom'` (the
  current default) pins the paginator to the bottom of a fixed-height scrolling table →
  `'sticky'`; `'under'` is inline flow → `'inline'`. The internal CSS class
  `bottom-pagination` is renamed to `sticky-pagination` (scss + 2 template refs together).
- **Two interfaces contain the identical line `position?: 'right' | 'left';`** (`IconView`
  and `SortConfig`). The Edits below include surrounding context so each is unambiguous.
- **Build is the oracle.** `npm run build_lib` (AOT) after each task; it catches any
  surviving `'right'`/`'bottom'` literal or a read of the removed field.
- **Windows env.** `LF will be replaced by CRLF` git warnings are normal.

## File structure (what each task touches)

| File | Responsibility | Task |
|---|---|---|
| `model/ColumnConfig.ts` (IconView) + `factories/ActionViewFactory.ts` + `model/TableViewFactory.ts` | remove dead `IconView.position` | 1 |
| `model/ColumnConfig.ts` (SortConfig) + `ngx-aur-mat-table.component.html:260` | Sort `right\|left`→`start\|end` | 2 |
| `model/ColumnConfig.ts` (PaginationConfig) + `providers/PaginationProvider.ts` + `component.html:2,25` + `component.scss:5,17` | Pagination `under\|bottom`→`inline\|sticky` | 3 |
| `providers/PaginationProvider.spec.ts` | position default/passthrough tests | 4 |
| demo `table-with-sticky-header.component.ts` | consumer migration | 5 |
| `changelog/19.2.0.md` | document the changes | 6 |

Tasks 1–3 are independent and each keeps `build_lib` green. Order is arbitrary but
follow 1→6.

---

### Task 1: Remove the dead `IconView.position`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts`

- [ ] **Step 1: Delete the field from `IconView<T>`**

In `ColumnConfig.ts`, replace:
```ts
  /** icon tooltip if null disabled */
  tooltip?: T;

  position?: 'right' | 'left';

  wrapper?: IconWrapper<T>;
```
with:
```ts
  /** icon tooltip if null disabled */
  tooltip?: T;

  wrapper?: IconWrapper<T>;
```

- [ ] **Step 2: Remove the copy in `ActionViewFactory.prepareIconConfig`**

In `factories/ActionViewFactory.ts`, delete the `position` line:
```ts
      tooltip: iconSource.tooltip ? iconSource.tooltip(value) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
```
becomes:
```ts
      tooltip: iconSource.tooltip ? iconSource.tooltip(value) : undefined,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
```

- [ ] **Step 3: Remove the copy in `TableViewFactory.configureIcon`**

In `model/TableViewFactory.ts`, delete the `position` line:
```ts
      tooltip: iconSource.tooltip ? iconSource.tooltip(row) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(row)}: undefined,
```
becomes:
```ts
      tooltip: iconSource.tooltip ? iconSource.tooltip(row) : undefined,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(row)}: undefined,
```

- [ ] **Step 4: Verify build**

Run: `npm run build_lib`
Expected: PASS — nothing reads `IconView.position`, so removal compiles clean.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts \
        projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts
git commit -m "refactor(api)!: remove unused IconView.position field"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 2: `SortConfig.position` `right|left` → `start|end`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (SortConfig)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:260`

- [ ] **Step 1: Change the type**

In `ColumnConfig.ts`, replace (this pair is unique to `SortConfig` — `enable?: boolean;`
directly precedes the position line here):
```ts
  enable?: boolean;
  position?: 'right' | 'left';
```
with:
```ts
  enable?: boolean;
  position?: 'start' | 'end';
```

- [ ] **Step 2: Update the arrow-mapping predicate**

In `ngx-aur-mat-table.component.html`, replace:
```html
                [arrowPosition]="columnConfig.sort?.position === 'right' ? 'before' : 'after'"
```
with:
```html
                [arrowPosition]="columnConfig.sort?.position === 'start' ? 'before' : 'after'"
```
(`'start'` → arrow `before` (left in LTR); `'end'` or unset → `after` (right in LTR).
The unset default stays `'after'`, unchanged.)

- [ ] **Step 3: Verify build**

Run: `npm run build_lib`
Expected: PASS — AOT type-checks the template against the new `'start' | 'end'` union.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "refactor(api)!: SortConfig.position uses start|end vocabulary"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 3: Pagination `under|bottom` → `inline|sticky`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (PaginationConfig)
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.ts:11,17`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:2,25`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss:5,17`

- [ ] **Step 1: Change the config type**

In `ColumnConfig.ts`, replace:
```ts
  position?: 'under' | 'bottom';
```
with:
```ts
  position?: 'inline' | 'sticky';
```

- [ ] **Step 2: Update the provider field type and default**

In `providers/PaginationProvider.ts`, replace:
```ts
  public position: 'under' | 'bottom';
```
with:
```ts
  public position: 'inline' | 'sticky';
```
and replace:
```ts
    this.position = config.position || 'bottom';
```
with:
```ts
    this.position = config.position || 'sticky';
```

- [ ] **Step 3: Update the two template `ngClass` predicates**

In `ngx-aur-mat-table.component.html`, both line 2 and line 25 contain the identical
fragment (differing only in indentation). Replace **every** occurrence of:
```
'bottom-pagination': paginationProvider.isEnabled && !externalPaginator && paginationProvider.position === 'bottom'
```
with:
```
'sticky-pagination': paginationProvider.isEnabled && !externalPaginator && paginationProvider.position === 'sticky'
```
(Use a replace-all so both lines 2 and 25 are updated.)

- [ ] **Step 4: Rename the CSS class in the stylesheet**

In `ngx-aur-mat-table.component.scss`, both line 5 and line 17 contain `&.bottom-pagination {`.
Replace **every** occurrence of:
```scss
&.bottom-pagination {
```
with:
```scss
&.sticky-pagination {
```

- [ ] **Step 5: Verify build**

Run: `npm run build_lib`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss
git commit -m "refactor(api)!: PaginationConfig.position uses inline|sticky vocabulary"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 4: Add `PaginationProvider` position tests

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.spec.ts`

This spec already exists (from the `enable` work) and has a `cfg(pagination?: any)`
helper returning `{ columnsCfg: [], paginationCfg: pagination }`.

- [ ] **Step 1: Read the spec to confirm the `cfg` helper**

Open `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.spec.ts` and
confirm the existing `function cfg(pagination?: any): TableConfig<any>` helper and the
`PaginationProvider` import.

- [ ] **Step 2: Append a new describe block**

Add this block to the file (after the existing `describe('PaginationProvider enable opt-out', …)`):

```ts
describe('PaginationProvider position vocabulary', () => {
  it('defaults position to sticky when unset', () => {
    expect(PaginationProvider.create(cfg({ size: 10 })).position).toBe('sticky');
  });

  it('passes through the inline position', () => {
    expect(PaginationProvider.create(cfg({ size: 10, position: 'inline' })).position).toBe('inline');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — both new specs green (`create` returns an enabled `PaginationProvider`
because `paginationCfg` is present; its `position` defaults to `'sticky'` and passes
`'inline'` through). Total now 63 (61 prior + 2).

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.spec.ts
git commit -m "test: cover PaginationProvider inline|sticky position"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 5: Migrate the demo

**Files:**
- Modify: `projects/aur-demo/src/app/table-with-sticky-header/table-with-sticky-header.component.ts:33,57`

- [ ] **Step 1: Update the two pagination positions**

In `table-with-sticky-header.component.ts`, replace:
```ts
      position: 'under'
```
with:
```ts
      position: 'inline'
```
and replace:
```ts
      position: 'bottom'
```
with:
```ts
      position: 'sticky'
```

- [ ] **Step 2: Verify the demo compiles**

Run: `npx ng build aur-demo`
Expected: template/type compilation succeeds. The ONLY acceptable error is the
pre-existing bundle-size budget ERROR (~1.1MB > 1.0MB). No type errors about `position`.

- [ ] **Step 3: Commit**

```bash
git add projects/aur-demo/src/app/table-with-sticky-header/table-with-sticky-header.component.ts
git commit -m "refactor(demo): migrate pagination position to inline|sticky"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 6: Document in the changelog

**Files:**
- Modify: `changelog/19.2.0.md`

- [ ] **Step 1: Read the existing changelog to match style**

Open `changelog/19.2.0.md` — it has four `## Breaking: ...` sections, each with a table
and/or a before/after example. Append a fifth section to the END, keeping existing
content intact.

- [ ] **Step 2: Append the section**

```markdown
## Breaking: `position` vocabularies unified

`position` fields now use consistent vocabularies:

| Field | Old | New |
|---|---|---|
| `SortConfig.position` | `'right' \| 'left'` | `'start' \| 'end'` |
| `PaginationConfig.position` | `'under' \| 'bottom'` | `'inline' \| 'sticky'` |
| `IconView.position` | `'right' \| 'left'` | *removed* (was unused) |

- **Sort:** `'start'` puts the arrow before the header text (left in LTR), `'end'` after
  it (right in LTR). An unset `position` still defaults to the after/right side, as
  before.
- **Pagination:** `'inline'` renders the paginator directly under the table in normal
  flow; `'sticky'` (the default) pins it to the bottom of a fixed-height, scrolling
  table. Rename: `'under'` → `'inline'`, `'bottom'` → `'sticky'`.
- **IconView.position** was never rendered and has been removed.

`ActionConfig.position` and `SelectionConfig.position` already used `'start' | 'end'` and
are unchanged.

### Migration

```ts
// Sort
sort: { enable: true, position: 'left' }   // before
sort: { enable: true, position: 'start' }  // after

// Pagination
paginationCfg: { size: 10, position: 'under' }   // before
paginationCfg: { size: 10, position: 'inline' }  // after
```
```

- [ ] **Step 3: Verify fences**

Read `changelog/19.2.0.md` and confirm the four prior sections are intact and the new
section's nested ```ts block is balanced.

- [ ] **Step 4: Commit**

```bash
git add changelog/19.2.0.md
git commit -m "docs(changelog): document position vocabulary unification"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Final verification (run after all tasks)

- [ ] `npm run build_lib` → PASS
- [ ] `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` → PASS (63 tests)
- [ ] `npx ng build aur-demo` → only the pre-existing bundle-budget ERROR
- [ ] No old vocabulary survives:
```bash
git grep -nE "'under'|'bottom'|bottom-pagination" -- projects/ngx-aur-mat-table/src projects/aur-demo/src
git grep -n "IconView.position\|iconSource.position" -- projects/ngx-aur-mat-table/src
git grep -n "position?: 'right' | 'left'" -- projects/ngx-aur-mat-table/src
```
Expected: no matches (all three vocabularies migrated; `IconView.position` gone).
Note: `ActionConfig`/`SelectionConfig` `'start' | 'end'` remain and are correct.
