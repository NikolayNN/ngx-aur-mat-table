# TableConfig Key & Type Naming Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename four inconsistent `TableConfig<T>` keys (and two type names) to a consistent `xxxCfg` / `XxxConfig` convention, as a hard break in the in-progress 19.2.0 release.

**Architecture:** Pure rename refactor. Each library task renames one key (plus its type, where applicable) together with every library consumer, so `npm run build_lib` stays green after each task. Demo usages and the changelog are updated at the end. No behavior changes; verification is compile + existing tests + grep.

**Tech Stack:** Angular 19, Angular Material 18, TypeScript, Karma/Jasmine.

**Branch:** `refactor/output-rename` (already checked out; same 19.2.0 release as the `@Output` rename).

**Authoritative rename map:**

| Old key | New key | Old type | New type |
|---|---|---|---|
| `pageableCfg` | `paginationCfg` | `PaginationConfig` | *(unchanged)* |
| `tableHeaderButtonCfg` | `headerButtonCfg` | `TableHeaderButtonConfig` | `HeaderButtonConfig` |
| `tableView` | `tableViewCfg` | `TableView` | `TableViewConfig` |
| `dragCfg` | `dragDropCfg` | `DragDropConfig` | *(unchanged)* |

**CRITICAL false-positive (Task 3):** the component has an internal property `tableView: Map<string, ColumnView<string>>[]` (`ngx-aur-mat-table.component.ts:105`), used as `tableView[element.id]` (`component.html:292`) and assigned at `component.ts:426`. This is NOT the config key. Only `tableConfig.tableView?.…` accesses are renamed.

---

## Task 1: Rename `pageableCfg` → `paginationCfg` (library)

**Files:**
- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- `projects/ngx-aur-mat-table/src/lib/model/EmptyValue.ts`
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.ts`
- `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts`

- [ ] **Step 1: Apply the renames** (every occurrence of the key `pageableCfg` → `paginationCfg`; the type `PaginationConfig` is unchanged)

  - `ColumnConfig.ts:40`: `pageableCfg?: PaginationConfig,` → `paginationCfg?: PaginationConfig,`
  - `EmptyValue.ts:32`: `pageableCfg: EmptyValue.PAGINATION_CONFIG` → `paginationCfg: EmptyValue.PAGINATION_CONFIG`
  - `ngx-aur-mat-table.component.html:408`: `[style]="tableConfig?.pageableCfg?.style"` → `[style]="tableConfig?.paginationCfg?.style"`
  - `ngx-aur-mat-table.component.ts:670`: `... this.tableConfig?.pageableCfg?.mode === 'server';` → `... this.tableConfig?.paginationCfg?.mode === 'server';`
  - `ngx-aur-mat-table.component.ts:699`: `pageSize: this.tableConfig.pageableCfg?.size ?? 20,` → `pageSize: this.tableConfig.paginationCfg?.size ?? 20,`
  - `PaginationProvider.ts:20`: `return (tableConfig.pageableCfg && tableConfig.pageableCfg.enable) || false;` → `return (tableConfig.paginationCfg && tableConfig.paginationCfg.enable) || false;`
  - `PaginationProvider.ts:24`: `if (this.canEnable(tableConfig) && tableConfig.pageableCfg) {` → `if (this.canEnable(tableConfig) && tableConfig.paginationCfg) {`
  - `PaginationProvider.ts:25`: `return new PaginationProvider(tableConfig.pageableCfg)` → `return new PaginationProvider(tableConfig.paginationCfg)`
  - `ngx-aur-table-page-event.utils.ts:11`: `pageSize: tableConfig.pageableCfg!.size,` → `pageSize: tableConfig.paginationCfg!.size,`

- [ ] **Step 2: Verify no `pageableCfg` remains in the library**

Run:
```bash
grep -rn 'pageableCfg' projects/ngx-aur-mat-table/src
```
Expected: empty.

- [ ] **Step 3: Build the library**

Run:
```bash
npm run build_lib
```
Expected: `Built ngx-aur-mat-table`, no TS errors.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "refactor(api)!: rename TableConfig.pageableCfg to paginationCfg"
```

---

## Task 2: Rename `tableHeaderButtonCfg` → `headerButtonCfg` and type `TableHeaderButtonConfig` → `HeaderButtonConfig` (library)

**Files:**
- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/HeaderButtonProvider.ts`

- [ ] **Step 1: Apply the renames**

  - `ColumnConfig.ts:43`: `tableHeaderButtonCfg?: TableHeaderButtonConfig,` → `headerButtonCfg?: HeaderButtonConfig,`
  - `ColumnConfig.ts:270`: `export interface TableHeaderButtonConfig {` → `export interface HeaderButtonConfig {`
  - `ngx-aur-mat-table.component.ts:396`: `this.headerButtonProvider = new HeaderButtonProvider(this.tableConfig.tableHeaderButtonCfg)` → `this.headerButtonProvider = new HeaderButtonProvider(this.tableConfig.headerButtonCfg)`
  - `HeaderButtonProvider.ts:2`: `import {TableHeaderButtonConfig} from "../model/ColumnConfig";` → `import {HeaderButtonConfig} from "../model/ColumnConfig";`
  - `HeaderButtonProvider.ts:10`: `constructor(cfg?: TableHeaderButtonConfig) {` → `constructor(cfg?: HeaderButtonConfig) {`

- [ ] **Step 2: Verify**

Run:
```bash
grep -rnE 'tableHeaderButtonCfg|TableHeaderButtonConfig' projects/ngx-aur-mat-table/src
```
Expected: empty.

- [ ] **Step 3: Build the library**

Run:
```bash
npm run build_lib
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "refactor(api)!: rename tableHeaderButtonCfg/TableHeaderButtonConfig to headerButtonCfg/HeaderButtonConfig"
```

---

## Task 3: Rename `tableView` → `tableViewCfg` and type `TableView` → `TableViewConfig` (library)

**Files:**
- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`

**DO NOT TOUCH (internal property, NOT the config key):**
- `ngx-aur-mat-table.component.ts:105` `tableView: Map<string, ColumnView<string>>[] = [];`
- `ngx-aur-mat-table.component.ts:426` `this.tableView = TableViewFactory.toView(...)`
- `ngx-aur-mat-table.component.html:292` `[config]="tableView[element.id]?.get(columnConfig.key)"`

- [ ] **Step 1: Apply the renames** (config key + its type only)

  - `ColumnConfig.ts:42`: `tableView?: TableView,` → `tableViewCfg?: TableViewConfig,`
  - `ColumnConfig.ts:258`: `export interface TableView {` → `export interface TableViewConfig {`
  - `ngx-aur-mat-table.component.html:39`: `[style.height]="tableConfig.tableView?.height"` → `[style.height]="tableConfig.tableViewCfg?.height"`
  - `ngx-aur-mat-table.component.html:40`: `[style.max-height]="tableConfig.tableView?.maxHeight"` → `[style.max-height]="tableConfig.tableViewCfg?.maxHeight"`
  - `ngx-aur-mat-table.component.html:41`: `[style.min-height]="tableConfig.tableView?.minHeight"` → `[style.min-height]="tableConfig.tableViewCfg?.minHeight"`

- [ ] **Step 2: Verify the config key/type are gone but the internal property survives**

Run:
```bash
grep -rnE 'tableConfig\.tableView\b|\bTableView\b' projects/ngx-aur-mat-table/src | grep -v 'TableViewFactory'
```
Expected: empty (no `tableConfig.tableView` access and no bare `TableView` type left; `TableViewFactory`/`TableViewConfig` are fine).

Then confirm the internal property is intact:
```bash
grep -nE 'tableView: Map|this\.tableView =|tableView\[element\.id\]' projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
```
Expected: all three lines still present.

- [ ] **Step 3: Build the library**

Run:
```bash
npm run build_lib
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "refactor(api)!: rename tableView/TableView to tableViewCfg/TableViewConfig"
```

---

## Task 4: Rename `dragCfg` → `dragDropCfg` (library)

**Files:**
- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts`

Note: the type `DragDropConfig` is unchanged. The local constructor parameter `dragCfg` in `DragDropProvider` is also renamed to `dragDropCfg` for readability.

- [ ] **Step 1: Apply the renames**

  - `ColumnConfig.ts:44`: `dragCfg?: DragDropConfig,` → `dragDropCfg?: DragDropConfig,`
  - `DragDropProvider.ts:22` (constructor param): `dragCfg?: DragDropConfig) {` → `dragDropCfg?: DragDropConfig) {`
  - `DragDropProvider.ts:25`: `this.manager = dragCfg?.manager ?? AurDragDropManager.empty();` → `this.manager = dragDropCfg?.manager ?? AurDragDropManager.empty();`
  - `DragDropProvider.ts:26`: `this.multiple = dragCfg?.multiple ?? false;` → `this.multiple = dragDropCfg?.multiple ?? false;`
  - `DragDropProvider.ts:28`: `this.dragIconView = dragCfg?.dragIcon ?? DragDropProvider.DEFAULT_ICON_VIEW;` → `this.dragIconView = dragDropCfg?.dragIcon ?? DragDropProvider.DEFAULT_ICON_VIEW;`
  - `DragDropProvider.ts:29`: `this.size = dragCfg?.size;` → `this.size = dragDropCfg?.size;`
  - `DragDropProvider.ts:48`: `return new DragDropProvider(viewContainerRef, tableConfig.name ?? 'unknown-table', <DragDropConfig>tableConfig.dragCfg);` → `... <DragDropConfig>tableConfig.dragDropCfg);`
  - `DragDropProvider.ts:54`: `return tableConfig?.dragCfg?.enable ?? false;` → `return tableConfig?.dragDropCfg?.enable ?? false;`

- [ ] **Step 2: Verify** (the key/param identifier `dragCfg` is gone; type `DragDropConfig` stays)

Run:
```bash
grep -rnE '\bdragCfg\b' projects/ngx-aur-mat-table/src
```
Expected: empty.

- [ ] **Step 3: Build the library**

Run:
```bash
npm run build_lib
```
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "refactor(api)!: rename TableConfig.dragCfg to dragDropCfg"
```

---

## Task 5: Update demo app usages (all four keys)

**Files (config object-literal keys in `.ts`):**
- `pageableCfg` → `paginationCfg`:
  - `projects/aur-demo/src/app/table-hide-show-body/table-hide-show-body.component.ts`
  - `projects/aur-demo/src/app/table-pagination-matrix/table-pagination-matrix.component.ts` (2 occurrences)
  - `projects/aur-demo/src/app/table-with-external-paginator/table-with-external-paginator.component.ts`
  - `projects/aur-demo/src/app/table-with-pagination-and-checkboxes/table-with-pagination-and-checkboxes.component.ts`
  - `projects/aur-demo/src/app/table-with-pagination/table-with-pagination.component.ts`
  - `projects/aur-demo/src/app/table-with-server-filters/table-with-server-filters.component.ts`
  - `projects/aur-demo/src/app/table-with-server-pagination-component/table-with-server-pagination-and-select/table-with-server-pagination-and-select.component.ts`
  - `projects/aur-demo/src/app/table-with-server-pagination-component/table-with-server-pagination.component.ts`
  - `projects/aur-demo/src/app/table-with-sticky-header/table-with-sticky-header.component.ts` (2 occurrences)
- `tableHeaderButtonCfg` → `headerButtonCfg`:
  - `projects/aur-demo/src/app/table-with-filter-custom-buttons/table-with-filter-custom-buttons.component.ts`
  - `projects/aur-demo/src/app/table-with-settings-button/table-with-settings-button.component.ts`
- `dragCfg` → `dragDropCfg`:
  - `projects/aur-demo/src/app/table-drag/tables-drag-drop/table-drag-drop/table-drag.component.ts`

- [ ] **Step 1: Apply the key renames**

In each file above, rename the object-literal property key only (the value/object content is unchanged). For example, in `table-pagination-matrix.component.ts`:
```ts
clientCfg: TableConfig<Customer> = { columnsCfg: this.columns, paginationCfg: { enable: true, size: 5 } };
serverCfg: TableConfig<Customer> = { columnsCfg: this.columns, paginationCfg: { enable: true, size: 5, mode: 'server' } };
```
And in `table-drag.component.ts`, change the `dragCfg: {` key to `dragDropCfg: {`.

- [ ] **Step 2: Verify no old keys remain in the demo**

Run:
```bash
grep -rnE '\b(pageableCfg|tableHeaderButtonCfg|dragCfg|tableView)\b' projects/aur-demo/src
```
Expected: empty. (No demo uses the `tableView` config key, so it should not appear either.)

- [ ] **Step 3: Build the demo (template + type check)**

Run:
```bash
npx ng build aur-demo
```
Expected: AOT/type compilation succeeds. A pre-existing **bundle-size budget** ERROR (`~1.10 MB > 1.00 MB`) is unrelated and acceptable; there must be NO TypeScript errors about unknown properties (e.g. `'pageableCfg' does not exist in type 'TableConfig'`).

- [ ] **Step 4: Commit**

```bash
git add projects/aur-demo/src
git commit -m "refactor(demo): migrate TableConfig keys to renamed names"
```

---

## Task 6: Append the changelog

**Files:**
- `changelog/19.2.0.md`

- [ ] **Step 1: Append this section to the end of `changelog/19.2.0.md`**

```markdown

## Breaking: `TableConfig` keys & types renamed for consistency

Four config keys (and two type names) were renamed to follow the `xxxCfg` / `XxxConfig`
convention. Update your `TableConfig` objects:

| Old key | New key | Type change |
|---|---|---|
| `pageableCfg` | `paginationCfg` | — (`PaginationConfig` unchanged) |
| `tableHeaderButtonCfg` | `headerButtonCfg` | `TableHeaderButtonConfig` → `HeaderButtonConfig` |
| `tableView` | `tableViewCfg` | `TableView` → `TableViewConfig` |
| `dragCfg` | `dragDropCfg` | — (`DragDropConfig` unchanged) |

Only the key names (and the two type names) changed; the shape of each sub-config is the same.
```

- [ ] **Step 2: Verify the section is present**

Run:
```bash
grep -n 'TableConfig.*keys.*types renamed' changelog/19.2.0.md
```
Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add changelog/19.2.0.md
git commit -m "docs(changelog): document TableConfig key & type renames"
```

---

## Task 7: Final whole-repo verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm no stray references anywhere outside historical files**

Run:
```bash
grep -rnE '\b(pageableCfg|tableHeaderButtonCfg|dragCfg)\b|tableConfig\.tableView\b|\bTableHeaderButtonConfig\b' projects
```
Expected: empty.

Also confirm bare type `TableView` (excluding `TableViewFactory`/`TableViewConfig`) is gone:
```bash
grep -rnE '\bTableView\b' projects --include='*.ts' | grep -vE 'TableViewFactory|TableViewConfig'
```
Expected: empty.

- [ ] **Step 2: Build library and demo**

Run:
```bash
npm run build_lib && npx ng build aur-demo
```
Expected: library builds clean; demo type/AOT compiles (only the pre-existing bundle-size budget ERROR may appear).

- [ ] **Step 3: Run library tests**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```
Expected: all specs pass.

- [ ] **Step 4: No commit** (verification only).
