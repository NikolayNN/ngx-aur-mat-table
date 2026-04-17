# Special Column Size Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the v19.0.13 `ColumnSize` feature to the 5 special column types (action, selection, index, drag-drop, timeline) by adding `size?: ColumnSize` on each config and applying inline style bindings in the template.

**Architecture:** Reuses the existing `ColumnSize` interface. Each special column config gets an optional `size` field; each corresponding provider exposes a `size` property; each column's `<th>`, body `<td>`, and footer `<td>` in the template get `[style.width]`/`[style.min-width]`/`[style.max-width]` bindings. The action column's footer — currently rendered via a shared `<ng-template #footerCellTemplate>` — is inlined so it can receive style bindings at the call site, and the now-orphaned template is removed. No unit tests (repo has none for template styling, matching v19.0.13 release); verification is build + manual browser check in the demo app.

**Tech Stack:** Angular 19, Angular Material mat-table, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-17-special-column-size-design.md`

---

### Task 1: Add `size?: ColumnSize` to the 5 special column interfaces

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`

All five edits happen in one file. `ColumnSize` is already defined in this file (lines 212-216) so no import needed.

- [ ] **Step 1: Add `size` to `ActionConfig<T>` (lines 169-173)**

Replace:

```typescript
export interface ActionConfig<T> {
  enable?: boolean;
  actions: Action<(value: T) => string>[];
  position?: 'start' | 'end';
}
```

With:

```typescript
export interface ActionConfig<T> {
  enable?: boolean;
  actions: Action<(value: T) => string>[];
  position?: 'start' | 'end';
  size?: ColumnSize;
}
```

- [ ] **Step 2: Add `size` to `SelectionConfig<T>` (lines 181-190)**

Replace:

```typescript
export interface SelectionConfig<T> {
  position?: 'start' | 'end';
  multiple?: boolean;
  showSelectedCount?: boolean;
  compareWith?: (o1: T, o2: T) => boolean
  // default: true, показывать
  showTotalCount?: boolean;
  enable: boolean;
  actions?: Action<string>[];
}
```

With:

```typescript
export interface SelectionConfig<T> {
  position?: 'start' | 'end';
  multiple?: boolean;
  showSelectedCount?: boolean;
  compareWith?: (o1: T, o2: T) => boolean
  // default: true, показывать
  showTotalCount?: boolean;
  enable: boolean;
  actions?: Action<string>[];
  size?: ColumnSize;
}
```

- [ ] **Step 3: Add `size` to `IndexConfig` (lines 151-161)**

Replace:

```typescript
export interface IndexConfig {
  enable: boolean,

  /** смещение для первого индекса например 1 чтобы нумерация началась с 1 по умолчанию от нуля */
  offset?: number,

  headerColumn?: ColumnView<string>

  /** название для колонки, по умолчанию ''*/
  name?: string;
}
```

With:

```typescript
export interface IndexConfig {
  enable: boolean,

  /** смещение для первого индекса например 1 чтобы нумерация началась с 1 по умолчанию от нуля */
  offset?: number,

  headerColumn?: ColumnView<string>

  /** название для колонки, по умолчанию ''*/
  name?: string;
  size?: ColumnSize;
}
```

- [ ] **Step 4: Add `size` to `DragDropConfig` (lines 225-230)**

Replace:

```typescript
export interface DragDropConfig {
  enable: boolean;
  manager: AurDragDropManager;
  multiple?: boolean;
  dragIcon?: IconView<string>;
}
```

With:

```typescript
export interface DragDropConfig {
  enable: boolean;
  manager: AurDragDropManager;
  multiple?: boolean;
  dragIcon?: IconView<string>;
  size?: ColumnSize;
}
```

- [ ] **Step 5: Add `size` to `TimelineConfig<T>` (lines 244-249)**

Replace:

```typescript
export interface TimelineConfig<T = any> {
  enable: boolean;
  markerColor?: string;
  line?: TimelineLineConfig;
  segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;
}
```

With:

```typescript
export interface TimelineConfig<T = any> {
  enable: boolean;
  markerColor?: string;
  line?: TimelineLineConfig;
  segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;
  size?: ColumnSize;
}
```

- [ ] **Step 6: Verify build compiles**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds. `size` is optional everywhere so no existing consumer breaks.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "feat: add size field to action/selection/index/drag/timeline configs"
```

---

### Task 2: Expose `size` on all 5 providers

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/TimelineProvider.ts`

Approach: add `public readonly size: ColumnSize | undefined;` as a field on each real provider and assign it in the constructor from the config. The `Dummy` subclasses need **no override** because they call their parent constructor with `EmptyValue.*_CONFIG` (or `undefined` for drag) — those configs have no `size`, so the inherited field is naturally `undefined`.

A field is used (not a getter) because `IndexProvider`, `DragDropProvider`, and `TimelineProvider` don't store the whole config object, only individual fields from it. A field unifies the pattern across all 5 providers.

- [ ] **Step 1: `RowActionProvider` — add import, field, and constructor assignment**

In `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts`:

Update the import on line 1:

```typescript
import {Action, ActionConfig, ColumnSize, TableConfig} from "../model/ColumnConfig";
```

In the `RowActionProvider<T>` class body, add the field above `actionView` (line 19):

```typescript
public readonly size: ColumnSize | undefined;
```

Then in the constructor (lines 21-27), after `this.config = tableConfig.actionCfg;`, add:

```typescript
this.size = this.config.size;
```

Full post-edit class header excerpt:

```typescript
export class RowActionProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = 'tbl_actions';
  public readonly isEnabled: boolean = true;

  private readonly config: ActionConfig<T>;
  public readonly size: ColumnSize | undefined;

  // key is rowId
  public actionView: Map<number, Action<string>[]> = new Map();

  constructor(tableConfig: TableConfig<T>) {
    super();
    if (!tableConfig.actionCfg) {
      throw new Error("Actions is undefined")
    }
    this.config = tableConfig.actionCfg;
    this.size = this.config.size;
  }
```

- [ ] **Step 2: `SelectionProvider` — add import, field, and constructor assignment**

In `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts`:

Update the import on line 5:

```typescript
import {ColumnSize, SelectionConfig, TableConfig} from "../model/ColumnConfig";
```

In the class (line 9-24 area), add a field above the constructor:

```typescript
public readonly size: ColumnSize | undefined;
```

In the constructor, after `this.tableDataSource = tableDataSource;`, add:

```typescript
this.size = this.config.size;
```

Full post-edit constructor area:

```typescript
export class SelectionProvider<T> extends AbstractProvider {
  public readonly isEnabled: boolean = true;
  public static readonly COLUMN_NAME = 'tbl_selects';
  selection: SelectionModel<T>;
  config: SelectionConfig<T>;
  tableDataSource: MatTableDataSource<TableRow<T>>;
  public readonly size: ColumnSize | undefined;

  constructor(tableConfig: TableConfig<T>, tableDataSource: MatTableDataSource<TableRow<T>>, initSelection: T[]) {
    super();
    this.config = tableConfig?.selectionCfg || EmptyValue.SELECTION_CONFIG;
    this.selection = new SelectionModel<T>(this.config.multiple, initSelection);
    if (this.config.compareWith) {
      this.selection.compareWith = this.config.compareWith;
    }
    this.tableDataSource = tableDataSource;
    this.size = this.config.size;
  }
```

- [ ] **Step 3: `IndexProvider` — add import, field, and constructor assignment**

In `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts`:

Update the import on line 1:

```typescript
import {ColumnSize, ColumnView, IndexConfig, TableConfig} from "../model/ColumnConfig";
```

In the class, add a new public field next to the others (after `offset: number;` at line 13). Note: other fields in `IndexProvider` are not marked `readonly`, so `size` matches that file's convention:

```typescript
public size: ColumnSize | undefined;
```

In the constructor (lines 15-20), after `this.offset = indexConfig?.offset || 0;`, add:

```typescript
this.size = indexConfig?.size;
```

Full post-edit class header and constructor:

```typescript
export class IndexProvider extends AbstractProvider {
  public readonly isEnabled: boolean = true;
  public static readonly COLUMN_NAME = 'tbl_index';
  public headerView: ColumnView<string> | undefined;
  public name: string;
  public offset: number;
  public size: ColumnSize | undefined;

  constructor(private indexConfig?: IndexConfig) {
    super();
    this.headerView = indexConfig?.headerColumn;
    this.name = indexConfig?.name || '';
    this.offset = indexConfig?.offset || 0;
    this.size = indexConfig?.size;
  }
```

- [ ] **Step 4: `DragDropProvider` — add import, field, and constructor assignment**

In `projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts`:

Update the import on line 2:

```typescript
import {ColumnSize, DragDropConfig, IconView, TableConfig} from "../model/ColumnConfig";
```

In the class body, add a field next to `dragIconView` (line 16):

```typescript
public readonly size: ColumnSize | undefined;
```

In the constructor (lines 19-28), after `this.dragIconView = dragCfg?.dragIcon ?? DragDropProvider.DEFAULT_ICON_VIEW;`, add:

```typescript
this.size = dragCfg?.size;
```

Full post-edit class header and constructor:

```typescript
export class DragDropProvider<T> extends AbstractProvider {

  protected static readonly DEFAULT_ICON_VIEW: IconView<string> = {
    name: 'drag_handle'
  }

  public readonly isEnabled: boolean = true;
  public readonly COLUMN_NAME = 'tbl_drag_col';
  public readonly manager: AurDragDropManager;
  public readonly draggable: boolean = false;
  public readonly dragIconView: IconView<string> = DragDropProvider.DEFAULT_ICON_VIEW;
  public readonly multiple: boolean = false;
  public readonly size: ColumnSize | undefined;

  constructor(private readonly viewContainerRef: ViewContainerRef,
              private tableName: string,
              dragCfg?: DragDropConfig) {
    super();
    this.manager = dragCfg?.manager ?? AurDragDropManager.empty();
    this.multiple = dragCfg?.multiple ?? false;
    this.draggable = (new Set(this.manager.draggableSourceNames)).has(tableName);
    this.dragIconView = dragCfg?.dragIcon ?? DragDropProvider.DEFAULT_ICON_VIEW;
    this.size = dragCfg?.size;
  }
```

- [ ] **Step 5: `TimelineProvider` — add import, field, and constructor assignment**

In `projects/ngx-aur-mat-table/src/lib/providers/TimelineProvider.ts`:

Update the import on line 1:

```typescript
import {ColumnSize, TableConfig, TimelineConfig, TimelineLineConfig} from "../model/ColumnConfig";
```

In the class body, add a field next to `segmentColor` (line 11):

```typescript
public readonly size: ColumnSize | undefined;
```

In the constructor (lines 20-25), after `this.segmentColor = config.segmentColor;`, add:

```typescript
this.size = config.size;
```

Full post-edit class header and constructor:

```typescript
export class TimelineProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = 'tbl_timeline';
  public readonly isEnabled: boolean = true;
  public readonly markerColor: string;
  public readonly line: Required<TimelineLineConfig>;
  public readonly segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;
  public readonly size: ColumnSize | undefined;

  private static readonly LINE_DEFAULTS: Required<TimelineLineConfig> = {
    color: '#ccc',
    width: 2,
    style: 'solid',
    gapStyle: 'dashed'
  };

  constructor(config: TimelineConfig<T>) {
    super();
    this.line = {...TimelineProvider.LINE_DEFAULTS, ...config.line};
    this.markerColor = config.markerColor ?? '#ccc';
    this.segmentColor = config.segmentColor;
    this.size = config.size;
  }
```

- [ ] **Step 6: Verify build compiles**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds. No type errors, no runtime changes yet (template doesn't read `size` until Task 3).

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/
git commit -m "feat: expose size on action/selection/index/drag/timeline providers"
```

---

### Task 3: Apply template style bindings to the 4 "simple" special columns

This task handles timeline, drag-drop, index, and selection — the four special columns whose footer is already an inline `<td mat-footer-cell>`. The action column has a special case (shared footer template) and is handled in Task 4.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`

For each column, the same three bindings are added to the header `<th>`, body `<td>`, and footer `<td>`:

```html
[style.width]="<provider>.size?.width"
[style.min-width]="<provider>.size?.minWidth"
[style.max-width]="<provider>.size?.maxWidth"
```

- [ ] **Step 1: Timeline column bindings (lines 46-77)**

Replace lines 47-48 header and body cells:

```html
          <th mat-header-cell *matHeaderCellDef class="aur-timeline-cell"></th>
          <td mat-cell *matCellDef="let element" class="aur-timeline-cell">
```

With:

```html
          <th mat-header-cell *matHeaderCellDef class="aur-timeline-cell"
              [style.width]="timelineProvider.size?.width"
              [style.min-width]="timelineProvider.size?.minWidth"
              [style.max-width]="timelineProvider.size?.maxWidth"></th>
          <td mat-cell *matCellDef="let element" class="aur-timeline-cell"
              [style.width]="timelineProvider.size?.width"
              [style.min-width]="timelineProvider.size?.minWidth"
              [style.max-width]="timelineProvider.size?.maxWidth">
```

Replace line 76 footer cell:

```html
          <td mat-footer-cell *matFooterCellDef class="aur-timeline-cell"></td>
```

With:

```html
          <td mat-footer-cell *matFooterCellDef class="aur-timeline-cell"
              [style.width]="timelineProvider.size?.width"
              [style.min-width]="timelineProvider.size?.minWidth"
              [style.max-width]="timelineProvider.size?.maxWidth"></td>
```

- [ ] **Step 2: Drag-drop column bindings (lines 80-97)**

Replace the `<th mat-header-cell>` on lines 82-83:

```html
          <th mat-header-cell *matHeaderCellDef>
          </th>
```

With:

```html
          <th mat-header-cell *matHeaderCellDef
              [style.width]="dragDropProvider.size?.width"
              [style.min-width]="dragDropProvider.size?.minWidth"
              [style.max-width]="dragDropProvider.size?.maxWidth">
          </th>
```

Replace the `<td mat-cell>` on line 85:

```html
          <td mat-cell *matCellDef="let element;" class="drag-column">
```

With:

```html
          <td mat-cell *matCellDef="let element;" class="drag-column"
              [style.width]="dragDropProvider.size?.width"
              [style.min-width]="dragDropProvider.size?.minWidth"
              [style.max-width]="dragDropProvider.size?.maxWidth">
```

Replace the `<td mat-footer-cell>` on lines 95-96:

```html
          <td mat-footer-cell *matFooterCellDef>
          </td>
```

With:

```html
          <td mat-footer-cell *matFooterCellDef
              [style.width]="dragDropProvider.size?.width"
              [style.min-width]="dragDropProvider.size?.minWidth"
              [style.max-width]="dragDropProvider.size?.maxWidth">
          </td>
```

- [ ] **Step 3: Index column bindings (lines 100-115)**

Replace the `<th mat-header-cell>` on line 102:

```html
          <th mat-header-cell *matHeaderCellDef>
```

With:

```html
          <th mat-header-cell *matHeaderCellDef
              [style.width]="indexProvider.size?.width"
              [style.min-width]="indexProvider.size?.minWidth"
              [style.max-width]="indexProvider.size?.maxWidth">
```

Replace the `<td mat-cell>` on line 108:

```html
          <td mat-cell *matCellDef="let element;">
```

With:

```html
          <td mat-cell *matCellDef="let element;"
              [style.width]="indexProvider.size?.width"
              [style.min-width]="indexProvider.size?.minWidth"
              [style.max-width]="indexProvider.size?.maxWidth">
```

Replace the `<td mat-footer-cell>` on line 112:

```html
          <td mat-footer-cell *matFooterCellDef>
```

With:

```html
          <td mat-footer-cell *matFooterCellDef
              [style.width]="indexProvider.size?.width"
              [style.min-width]="indexProvider.size?.minWidth"
              [style.max-width]="indexProvider.size?.maxWidth">
```

- [ ] **Step 4: Selection column bindings (lines 118-157)**

Replace the `<th mat-header-cell>` on line 119:

```html
          <th mat-header-cell *matHeaderCellDef>
```

With:

```html
          <th mat-header-cell *matHeaderCellDef
              [style.width]="selectionProvider.size?.width"
              [style.min-width]="selectionProvider.size?.minWidth"
              [style.max-width]="selectionProvider.size?.maxWidth">
```

Replace the `<td mat-cell>` on lines 147-148:

```html
          <td mat-cell *matCellDef="let row"
              (click)="$event.stopPropagation(); selectionProvider.selection.toggle(castSrc(row).rowSrc)">
```

With:

```html
          <td mat-cell *matCellDef="let row"
              (click)="$event.stopPropagation(); selectionProvider.selection.toggle(castSrc(row).rowSrc)"
              [style.width]="selectionProvider.size?.width"
              [style.min-width]="selectionProvider.size?.minWidth"
              [style.max-width]="selectionProvider.size?.maxWidth">
```

Replace the `<td mat-footer-cell>` on lines 155-156:

```html
          <td mat-footer-cell *matFooterCellDef>
          </td>
```

With:

```html
          <td mat-footer-cell *matFooterCellDef
              [style.width]="selectionProvider.size?.width"
              [style.min-width]="selectionProvider.size?.minWidth"
              [style.max-width]="selectionProvider.size?.maxWidth">
          </td>
```

- [ ] **Step 5: Verify build compiles**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds. Template compiles with new bindings.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "feat: apply size bindings to timeline/drag/index/selection columns"
```

---

### Task 4: Apply style bindings to the action column (inline footer + remove orphan template)

The action column currently renders its footer via a shared `<ng-template #footerCellTemplate>` (lines 343-347). That indirection prevents binding inline styles at the call site. This task inlines the footer cell into the action column block (matching the pattern used by the other 4 special columns) and removes the now-orphaned template.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`

- [ ] **Step 1: Add bindings to action column header (line 161)**

Replace:

```html
          <th mat-header-cell *matHeaderCellDef></th>
```

With:

```html
          <th mat-header-cell *matHeaderCellDef
              [style.width]="rowActionsProvider.size?.width"
              [style.min-width]="rowActionsProvider.size?.minWidth"
              [style.max-width]="rowActionsProvider.size?.maxWidth"></th>
```

- [ ] **Step 2: Add bindings to action column body cell (line 162)**

Replace:

```html
          <td mat-cell *matCellDef="let element" (click)="$event.stopPropagation()" style="cursor: default">
```

With:

```html
          <td mat-cell *matCellDef="let element" (click)="$event.stopPropagation()" style="cursor: default"
              [style.width]="rowActionsProvider.size?.width"
              [style.min-width]="rowActionsProvider.size?.minWidth"
              [style.max-width]="rowActionsProvider.size?.maxWidth">
```

- [ ] **Step 3: Inline the action column footer cell**

Replace lines 175-176:

```html
          <ng-container *ngTemplateOutlet="footerCellTemplate; context: {$implicit: rowActionsProvider.COLUMN_NAME}">
          </ng-container>
```

With:

```html
          <td mat-footer-cell *matFooterCellDef
              [style.width]="rowActionsProvider.size?.width"
              [style.min-width]="rowActionsProvider.size?.minWidth"
              [style.max-width]="rowActionsProvider.size?.maxWidth">
            {{ totalRowProvider.totals.get(rowActionsProvider.COLUMN_NAME) ?? '' }}
          </td>
```

The inlined `<td>` preserves the exact rendering behavior of `footerCellTemplate` (reading `totalRowProvider.totals` by column name) and adds the three style bindings.

- [ ] **Step 4: Remove the orphan `footerCellTemplate`**

Delete lines 343-347 (the entire `<ng-template #footerCellTemplate>` block):

```html
<ng-template #footerCellTemplate let-columnName>
  <td mat-footer-cell *matFooterCellDef>
    {{ totalRowProvider.totals.get(columnName) ?? '' }}
  </td>
</ng-template>
```

After Task 3 and Task 4, this template has zero references. Leaving it would be dead code.

- [ ] **Step 5: Verify `footerCellTemplate` has no remaining references**

Use Grep to confirm no code references `footerCellTemplate` anywhere in the repo:

Search pattern: `footerCellTemplate`
Expected: zero matches.

If any match is found, investigate before proceeding — it should only have been used at the one call site replaced in Step 3.

- [ ] **Step 6: Verify build compiles**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "feat: apply size bindings to action column and inline its footer"
```

---

### Task 5: Manual verification in the demo app

The repo has no unit tests for template styling (matching v19.0.13 release). Verification is done via the demo app.

**Files:**
- Temporarily modify: a config in `projects/aur-demo/src/app/` (any existing table demo that shows action/selection/index — do not commit the demo change)

- [ ] **Step 1: Pick a demo component that has at least one special column**

Look for a demo that uses `actionCfg`, `selectionCfg`, or `indexCfg`. A good candidate is any component under `projects/aur-demo/src/app/` that already exercises these features.

Run: use Grep to find them — pattern: `actionCfg\s*:` in `projects/aur-demo`.

- [ ] **Step 2: Temporarily add `size` to at least two of the five column types**

Pick whatever columns the chosen demo uses and add `size` values. Example — if the demo has `actionCfg`, `selectionCfg`, and `indexCfg`:

```typescript
actionCfg: {
  actions: [/* existing */],
  size: { width: '120px' }
},
selectionCfg: {
  enable: true,
  // existing fields
  size: { width: '56px' }
},
indexCfg: {
  enable: true,
  // existing fields
  size: { width: '48px' }
}
```

- [ ] **Step 3: Run the demo**

Run: `npx ng serve aur-demo`
Expected: Demo serves without errors.

- [ ] **Step 4: Visually verify in the browser**

Open the demo in a browser. For each column you added `size` to:

1. Inspect the header `<th>` → should have the configured inline `width`/`min-width`/`max-width`.
2. Inspect any body `<td>` in that column → same styles.
3. Inspect the footer `<td>` (if the table shows a total row / footer row) → same styles.

Also pick one column **without** `size` (e.g. a regular column where the demo doesn't set `size`) and confirm it has no width-related inline styles — regression check that `undefined` values don't emit empty `style.width=""`.

- [ ] **Step 5: Revert the demo change**

The demo edit was for verification only; do not commit it.

```bash
git checkout -- projects/aur-demo
```

Expected: `git status` shows no modifications under `projects/aur-demo`.

---

### Task 6: Version bump and changelog

**Files:**
- Modify: `projects/ngx-aur-mat-table/package.json`
- Create: `changelog/19.0.15.md`

- [ ] **Step 1: Bump version from 19.0.14 to 19.0.15**

In `projects/ngx-aur-mat-table/package.json`, change `"version": "19.0.14"` to `"version": "19.0.15"`.

Post-edit excerpt:

```json
{
  "name": "ngx-aur-mat-table",
  "version": "19.0.15",
```

- [ ] **Step 2: Create `changelog/19.0.15.md`**

Create the file with this content (Russian, mirroring `changelog/19.0.13.md` style):

```markdown
## ngx-aur-mat-table v19.0.15

**Новое: настройка ширины для специальных колонок**

Свойство `size` (тип `ColumnSize` из v19.0.13) теперь поддерживается в конфигурациях всех специальных колонок — action, selection, index, drag-drop и timeline.

```typescript
const tableConfig: TableConfig<Customer> = {
  columnsCfg: [/* ... */],
  actionCfg: {
    actions: [/* ... */],
    size: { width: '96px' }
  },
  selectionCfg: {
    enable: true,
    size: { width: '48px' }
  },
  indexCfg: {
    enable: true,
    size: { width: '56px' }
  },
  dragCfg: {
    enable: true,
    manager: dragManager,
    size: { width: '40px' }
  },
  timelineCfg: {
    enable: true,
    size: { width: '24px' }
  }
};
```

Поддерживаются любые CSS-единицы (`px`, `%`, `em` и т.д.). Свойство опциональное — без `size` колонки работают как раньше.
```

Note: the outer fence above uses triple backticks — write the file so the inner TypeScript example is correctly fenced with triple backticks in the actual file.

- [ ] **Step 3: Verify build one last time**

Run: `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table`
Expected: Build succeeds with version 19.0.15.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/package.json changelog/19.0.15.md
git commit -m "chore: bump version to 19.0.15, add changelog for special-column size"
```

---

## Completion Checklist

After all tasks are done:

- `ColumnConfig.ts` has `size?: ColumnSize` on `ActionConfig`, `SelectionConfig`, `IndexConfig`, `DragDropConfig`, `TimelineConfig`.
- All 5 providers (`RowActionProvider`, `SelectionProvider`, `IndexProvider`, `DragDropProvider`, `TimelineProvider`) expose `size: ColumnSize | undefined`.
- Template has `[style.width]`/`[style.min-width]`/`[style.max-width]` bindings on the `<th>`, body `<td>`, and footer `<td>` for all 5 special columns.
- Action column's footer is inlined; `footerCellTemplate` is removed.
- `npx ng build ngx-aur-mat-table` succeeds.
- Manual browser verification in the demo app passed.
- `package.json` is at `19.0.15`.
- `changelog/19.0.15.md` exists.
- All changes are committed across 4 feature commits + 1 version/changelog commit (5 commits total).
