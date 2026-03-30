# Column Size Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `size?: ColumnSize` to `ColumnConfig` so users can set `width`, `minWidth`, `maxWidth` on columns via inline styles.

**Architecture:** New `ColumnSize` interface added to the existing model file. Inline style bindings on `<th>`/`<td>` in the template. Export via public API.

**Tech Stack:** Angular 19, Angular Material mat-table, TypeScript

---

### Task 1: Add `ColumnSize` interface and `size` field to `ColumnConfig`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:73-86`

- [ ] **Step 1: Add `ColumnSize` interface**

Add the following interface after `TableView` (line 209) in `ColumnConfig.ts`:

```typescript
export interface ColumnSize {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
}
```

- [ ] **Step 2: Add `size` field to `ColumnConfig<T>`**

Add `size?: ColumnSize;` to the `ColumnConfig<T>` interface, after the `totalConverter` field (line 85):

```typescript
export interface ColumnConfig<T> {
  /** column title text */
  name: string;

  /** column key in data source */
  key: string;

  /** return value to save in MatTableDataSource */
  valueConverter: (value: T) => any;
  sort?: SortConfig<T>;
  headerView?: ColumnView<string>;
  valueView?: ColumnView<(value: TableRow<T>) => string>;
  totalConverter?: (value: TableRow<T>[]) => any;
  size?: ColumnSize;
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds with no errors. Existing code is unaffected since `size` is optional.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "feat: add ColumnSize interface and size field to ColumnConfig"
```

---

### Task 2: Add inline style bindings to template

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:180-217`

- [ ] **Step 1: Add style bindings to sortable header `<th>`**

In the sortable header (line 184), add size bindings:

```html
<th mat-header-cell *matHeaderCellDef [mat-sort-header]="columnConfig.key"
    [arrowPosition]="columnConfig.sort.position === 'right' ? 'before' : 'after'"
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

- [ ] **Step 2: Add style bindings to non-sortable header `<th>`**

In the `#notSortable` template (line 192), add size bindings:

```html
<th mat-header-cell *matHeaderCellDef
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

- [ ] **Step 3: Add style bindings to body `<td>`**

On the body cell (line 206), add size bindings:

```html
<td mat-cell *matCellDef="let element;"
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

- [ ] **Step 4: Add style bindings to footer `<td>`**

On the footer cell (line 213), add size bindings:

```html
<td mat-footer-cell *matFooterCellDef
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

- [ ] **Step 5: Verify build compiles**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "feat: apply column size styles via inline bindings in template"
```

---

### Task 3: Export `ColumnSize` in public API

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`

- [ ] **Step 1: Verify export**

`ColumnSize` is defined in `ColumnConfig.ts`, which is already exported via `export * from './lib/model/ColumnConfig'` on line 12 of `public-api.ts`. Since `ColumnSize` is an `export interface` in that file, it is already re-exported automatically. No changes needed.

- [ ] **Step 2: Verify the type is accessible**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds. `ColumnSize` will be available to consumers via `import { ColumnSize } from 'ngx-aur-mat-table'`.

- [ ] **Step 3: Commit (skip if no changes)**

No file changes needed — `ColumnSize` is already exported through the barrel export of `ColumnConfig.ts`.

---

### Task 4: Verify in demo app

**Files:**
- Modify: `projects/aur-demo/src/app/simple-table/simple-table.component.ts`

- [ ] **Step 1: Add `size` to a column in the demo**

In `simple-table.component.ts`, add `size` to one column to verify it works:

```typescript
{
  name: 'customers name',
  key: 'name',
  valueConverter: v => v.name,
  size: { minWidth: '200px', maxWidth: '400px' }
},
```

- [ ] **Step 2: Build and serve the demo**

Run: `npx ng serve aur-demo`
Expected: App builds and serves. Open in browser — the "customers name" column should respect the min/max width constraints.

- [ ] **Step 3: Visual verification**

In the browser, inspect the `<th>` and `<td>` elements for the "customers name" column. They should have:
- `min-width: 200px`
- `max-width: 400px`

Columns without `size` should have no width-related inline styles.

- [ ] **Step 4: Revert demo change and commit**

Revert the demo change — it was for verification only:

```bash
git checkout -- projects/aur-demo/src/app/simple-table/simple-table.component.ts
```

---

### Task 5: Bump version

- [ ] **Step 1: Bump patch version in `package.json`**

Update version from `19.0.12` to `19.0.13` in `projects/ngx-aur-mat-table/package.json`.

- [ ] **Step 2: Commit**

```bash
git add projects/ngx-aur-mat-table/package.json
git commit -m "chore: bump version to 19.0.13"
```
