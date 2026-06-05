# @Output Naming Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all `on`-prefixed `@Output()` events to a consistent prefix-free convention and rename the selection trio to make the full-set-vs-delta distinction explicit, as a hard break in version 19.2.0.

**Architecture:** Pure rename refactor across the library component, one provider, the library template, one unit test, nine demo templates, and release metadata. No behavior changes. Verification is compile + existing tests + grep, not new tests (a rename has no new behavior to test).

**Tech Stack:** Angular 19, Angular Material 18, TypeScript, Karma/Jasmine.

**Rename table (authoritative):**

| Old | New |
|---|---|
| `selected` | `selectChange` |
| `onSelect` | `selectAdded` |
| `onDeselect` | `selectRemoved` |
| `onRowClick` | `rowClick` |
| `onRowAction` | `rowAction` |
| `onSelectedRowsAction` | `selectedRowsAction` |
| `onFilter` | `filterChange` |
| `onHeaderButton` | `headerButton` |

> Naming decided during Task 1 review: `select*` stem (avoids Material's `selectionChange`
> collision and keeps the trio symmetric); `filterChange` (not bare `filter`).
> An internal method `rowClick(row)` collided with the new `@Output() rowClick` and was
> renamed `handleRowClick` (template binding updated to match) — already done in Task 1.

**Do NOT touch (false positives):**
- `ngx-aur-mat-table.component.ts:279,281` — `const selected = ...` is a local variable.
- `ngx-aur-mat-table.component.ts:739` — `selection.selected.length` is a `SelectionModel` property.
- Demo consumer handler method names (e.g. `onFilter()`, `onRowActions()`, `onClick()`) — only the binding's left-hand side (output name) changes.
- Historical files: `changelog/19.0.17.md`, `changelog/19.0.18.md`, `docs/superpowers/plans/2026-06-02-action-icon-menu.md`, `docs/superpowers/specs/2026-06-02-action-icon-menu-design.md`.

---

## Task 1: Rename `@Output()` declarations and emit sites in the library component

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

- [ ] **Step 1: Rename the eight `@Output()` declarations**

Apply these exact line replacements:

Line 163:
```ts
  @Output() rowAction: EventEmitter<ActionEvent<T>> = new EventEmitter<ActionEvent<T>>();
```
Lines 167–169:
```ts
  @Output() selectChange = new EventEmitter<T[]>();
  @Output() selectAdded = new EventEmitter<T[]>();
  @Output() selectRemoved = new EventEmitter<T[]>();
```
Line 171:
```ts
  @Output() selectedRowsAction = new EventEmitter<ActionEvent<T[]>>();
```
Line 176:
```ts
  @Output() rowClick = new EventEmitter<T>();
```
Line 184:
```ts
  @Output() filterChange = new EventEmitter<T[]>();
```
Line 191:
```ts
  @Output() headerButton = new EventEmitter<MouseEvent>();
```

- [ ] **Step 2: Update internal emit sites and the `bindEventEmitters` call**

- Line ~383: change
  ```ts
      .bindEventEmitters(this.selected, this.onSelect, this.onDeselect, this.selectionModel);
  ```
  to
  ```ts
      .bindEventEmitters(this.selectChange, this.selectAdded, this.selectRemoved, this.selectionModel);
  ```
- Line ~479: `this.onFilter.emit(...)` → `this.filterChange.emit(...)`
- Line ~556: `this.onSelectedRowsAction.emit(...)` → `this.selectedRowsAction.emit(...)`
- Line ~561: `this.onRowAction.emit(...)` → `this.rowAction.emit(...)`
- Line ~574: `this.onRowAction.emit(...)` → `this.rowAction.emit(...)`
- Line ~653: `this.onRowClick.emit(row.rowSrc);` → `this.rowClick.emit(row.rowSrc);`
- Line ~656: `this.onRowClick.emit(undefined);` → `this.rowClick.emit(undefined);`

**Leave unchanged:** line 279 `const selected = ...`, line 281 `this.prepareTableData(selected)`, line 739 `selection.selected.length`. These are not the outputs.

- [ ] **Step 3: Verify no old output identifiers remain in the component**

Run:
```bash
grep -nE 'this\.(onRowClick|onRowAction|onSelectedRowsAction|onFilter|onHeaderButton|onSelect|onDeselect)\b|@Output\(\) (onRowAction|onSelect|onDeselect|onSelectedRowsAction|onRowClick|onFilter|onHeaderButton|selected)\b' projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
```
Expected: no output (empty result).

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "refactor(api)!: rename component @Output events to prefix-free names"
```

---

## Task 2: Update the library template and SelectionProvider parameter names

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:30`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts:44`

- [ ] **Step 1: Rename the internal template binding**

`ngx-aur-mat-table.component.html:30`, change
```html
                (click)="onHeaderButton.emit($event)"></...>
```
so the handler reads `headerButton.emit($event)` (keep the rest of the line identical):
```html
                (click)="headerButton.emit($event)"></...>
```

- [ ] **Step 2: Rename `bindEventEmitters` parameters for readability**

`SelectionProvider.ts`, the base-class method at line ~44. Rename parameters and their uses (signature and body only — payload semantics unchanged):
```ts
  public bindEventEmitters(selectChange: EventEmitter<T[]>, selectAdded: EventEmitter<T[]>, selectRemoved: EventEmitter<T[]>, selectionModel: EventEmitter<SelectionModel<T>>): SelectionProvider<T> {
    this.selection.changed.subscribe(event => {
      if (event.added) {
        selectAdded.emit(event.added);
      }
      if (event.removed) {
        selectRemoved.emit(event.removed);
      }
      selectChange.emit(this.selection.selected);
    });
    selectionModel.emit(this.selection);
    return this;
  }
```

- [ ] **Step 3: Update the overriding signature**

`SelectionProvider.ts` line ~99 has a no-op override on the dummy provider (body is just `return this;`, so there are no parameter uses to update — only the signature changes):
```ts
  public override bindEventEmitters(selectChange: EventEmitter<T[]>, selectAdded: EventEmitter<T[]>, selectRemoved: EventEmitter<T[]>): SelectionProvider<T> {
    return this;
  }
```

- [ ] **Step 4: Build the library to verify it compiles**

Run:
```bash
npm run build_lib
```
Expected: `Build at: ...` success, no TS errors referencing renamed identifiers.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts
git commit -m "refactor(api)!: align template binding and SelectionProvider params with new names"
```

---

## Task 3: Update the menu-action unit test

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-menu-action.spec.ts:26`

- [ ] **Step 1: Rename the output subscription in the test**

Line 26, change
```ts
    component.onRowAction.subscribe((e) => (received = e));
```
to
```ts
    component.rowAction.subscribe((e) => (received = e));
```
(The `it(...)` description string on line 23 may keep the word "onRowAction" or be updated to "rowAction" for accuracy — update it to "rowAction" for consistency.)

- [ ] **Step 2: Run the test to verify it passes**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```
Expected: all specs pass, including the menu-action spec. If ChromeHeadless is unavailable, run `npm test -- --watch=false` and stop the watcher after the first run.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-menu-action.spec.ts
git commit -m "test: update menu-action spec to renamed rowAction output"
```

---

## Task 4: Update demo template bindings

**Files (each is a one-line binding change — only the output name on the left of `=`):**
- `projects/aur-demo/src/app/complex-object/complex-object.component.html:4` — `(onFilter)=` → `(filterChange)=`
- `projects/aur-demo/src/app/table-big/table-big.component.html:4` — `(onRowClick)=` → `(rowClick)=`
- `projects/aur-demo/src/app/table-big/table-big.component.html:5` — `(onRowAction)=` → `(rowAction)=`
- `projects/aur-demo/src/app/table-editable/table-editable.component.html:4` — `(onRowClick)=` → `(rowClick)=`
- `projects/aur-demo/src/app/table-editable/table-editable.component.html:5` — `(onRowAction)=` → `(rowAction)=`
- `projects/aur-demo/src/app/table-with-filter-actions/table-with-filter-actions.component.html:10` — `(onFilter)=` → `(filterChange)=`
- `projects/aur-demo/src/app/table-with-menu/table-with-menu.component.html:4` — `(onRowAction)=` → `(rowAction)=`
- `projects/aur-demo/src/app/table-with-pagination-and-checkboxes/table-with-pagination-and-checkboxes.component.html:4` — `(onSelectedRowsAction)=` → `(selectedRowsAction)=`
- `projects/aur-demo/src/app/table-with-selection/table-with-selection.component.html:7` — `(selected)=` → `(selectChange)=`
- `projects/aur-demo/src/app/with-actions/actions-before/actions-before.component.html:4` — `(onRowAction)=` → `(rowAction)=`
- `projects/aur-demo/src/app/with-actions/table-with-actions/table-with-actions.component.html:4` — `(onRowAction)=` → `(rowAction)=`

- [ ] **Step 1: Apply each binding rename**

For each file/line above, replace only the parenthesized output name on the left-hand side; keep the right-hand side (the consumer handler call) exactly as-is. Example for `table-big.component.html`:
```html
  (rowClick)="onClick($event)"
  (rowAction)="onAction($event)"
```
Example for `table-with-selection.component.html:7`:
```html
  (selectChange)="selected = $event"
```

- [ ] **Step 2: Verify no old output bindings remain in the demo**

Run:
```bash
grep -rnE '\((onRowClick|onRowAction|onSelectedRowsAction|onFilter|onHeaderButton|onSelect|onDeselect|selected)\)=' projects/aur-demo/src
```
Expected: no output (empty result).

- [ ] **Step 3: Build the demo app to catch any missed binding**

Run:
```bash
npx ng build
```
Expected: success. Under strict templates Angular errors on an unknown `@Output` binding, so a clean build confirms all bindings resolve.

- [ ] **Step 4: Commit**

```bash
git add projects/aur-demo/src
git commit -m "refactor(demo): migrate output bindings to renamed events"
```

---

## Task 5: Release metadata — version bump and changelog

**Files:**
- Modify: `projects/ngx-aur-mat-table/package.json:3`
- Create: `changelog/19.2.0.md`

- [ ] **Step 1: Bump the library version**

`projects/ngx-aur-mat-table/package.json` line 3:
```json
  "version": "19.2.0",
```

- [ ] **Step 2: Write the changelog with the migration table**

Create `changelog/19.2.0.md`:
```markdown
# 19.2.0

## Breaking: `@Output` events renamed to a prefix-free convention

All `on`-prefixed outputs lost their prefix, and the selection events were
renamed to make the full-set-vs-delta distinction explicit. Update your
template bindings:

| Old | New | Payload |
|---|---|---|
| `(selected)` | `(selectChange)` | full current selection `T[]` |
| `(onSelect)` | `(selectAdded)` | added items `T[]` |
| `(onDeselect)` | `(selectRemoved)` | removed items `T[]` |
| `(onRowClick)` | `(rowClick)` | clicked row `T` |
| `(onRowAction)` | `(rowAction)` | `ActionEvent<T>` |
| `(onSelectedRowsAction)` | `(selectedRowsAction)` | `ActionEvent<T[]>` |
| `(onFilter)` | `(filterChange)` | filtered rows `T[]` |
| `(onHeaderButton)` | `(headerButton)` | `MouseEvent` |

Unchanged: `sort`, `pageChange`, `loadingChange`, `pageError`,
`selectionModel`, `columnOffsets`.

### Migration

Rename the binding's left-hand side only; payloads and your handler methods
are unchanged. Example:

\`\`\`html
<!-- before -->
<aur-mat-table (onRowClick)="onClick($event)" (selected)="rows = $event">
<!-- after -->
<aur-mat-table (rowClick)="onClick($event)" (selectChange)="rows = $event">
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/package.json changelog/19.2.0.md
git commit -m "chore(release): bump to 19.2.0 with @Output rename changelog"
```

---

## Task 6: Final whole-repo verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm no stray references outside historical files**

Run:
```bash
grep -rnE '\b(onRowClick|onRowAction|onSelectedRowsAction|onFilter|onHeaderButton)\b' --include='*.ts' --include='*.html' projects README.md
```
Expected: any remaining hits are consumer handler **method names** (e.g. a method literally named `onFilter()`), not output declarations or bindings. Confirm each hit by eye; there must be no `@Output()` declaration or `(...)=` binding using an old name.

- [ ] **Step 2: Full build of library and demo**

Run:
```bash
npm run build_lib && npx ng build
```
Expected: both succeed.

- [ ] **Step 3: Full test run**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```
Expected: all specs pass.

- [ ] **Step 4: No commit**

This task only verifies; nothing to commit.
```
