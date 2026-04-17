# Special Column Size Configuration

## Summary

Extend the v19.0.13 column-size feature to the 5 special column types (action, selection, index, drag-drop, timeline) by adding an optional `size?: ColumnSize` field to each config. Reuses the existing `ColumnSize` interface and the same inline-style-binding pattern already applied to user-defined columns.

Target release: **v19.0.15**.

## Interfaces

Add `size?: ColumnSize` as an optional field to each of these interfaces in `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`:

```typescript
export interface ActionConfig<T> {
  enable?: boolean;
  actions: Action<(value: T) => string>[];
  position?: 'start' | 'end';
  size?: ColumnSize;
}

export interface SelectionConfig<T> {
  position?: 'start' | 'end';
  multiple?: boolean;
  showSelectedCount?: boolean;
  compareWith?: (o1: T, o2: T) => boolean;
  showTotalCount?: boolean;
  enable: boolean;
  actions?: Action<string>[];
  size?: ColumnSize;
}

export interface IndexConfig {
  enable: boolean;
  offset?: number;
  headerColumn?: ColumnView<string>;
  name?: string;
  size?: ColumnSize;
}

export interface DragDropConfig {
  enable: boolean;
  manager: AurDragDropManager;
  multiple?: boolean;
  dragIcon?: IconView<string>;
  size?: ColumnSize;
}

export interface TimelineConfig<T = any> {
  enable: boolean;
  markerColor?: string;
  line?: TimelineLineConfig;
  segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;
  size?: ColumnSize;
}
```

`ColumnSize` already exists (v19.0.13) and is already exported via the `ColumnConfig.ts` barrel in `public-api.ts` — no new types, no new exports.

All fields are optional. Omitting `size` preserves current behavior (Material auto-width).

## Providers

Each special column is configured through a provider. The template reads provider fields (e.g. `timelineProvider.markerColor`, `indexProvider.offset`) rather than raw config. Follow that pattern by adding a `size` getter to each provider plus its `Dummy` variant.

Affected files:

- `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts`
- `projects/ngx-aur-mat-table/src/lib/providers/TimelineProvider.ts`

In each real provider:

```typescript
public get size(): ColumnSize | undefined {
  return this.config.size;
}
```

In each `Dummy` variant:

```typescript
public override get size(): ColumnSize | undefined {
  return undefined;
}
```

`ColumnSize` is imported from `../model/ColumnConfig`.

## Template Changes

File: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`.

For each special column, add three inline style bindings to the header cell, body cell, and footer cell:

```html
[style.width]="<provider>.size?.width"
[style.min-width]="<provider>.size?.minWidth"
[style.max-width]="<provider>.size?.maxWidth"
```

Target elements by provider:

| Column | Provider | Header `<th>` | Body `<td>` | Footer `<td>` |
|---|---|---|---|---|
| Timeline | `timelineProvider` | L47 | L48 | L76 |
| Drag-drop | `dragDropProvider` | L82 | L85 | L95 |
| Index | `indexProvider` | L102 | L108 | L112 |
| Selection | `selectionProvider` | L119 | L147 | L155 |
| Action | `rowActionsProvider` | L161 | L162 | L175–176 (template outlet — see below) |

### Action column footer — inline the cell

The action column currently renders its footer via a shared `<ng-template #footerCellTemplate>`:

```html
<ng-container *ngTemplateOutlet="footerCellTemplate; context: {$implicit: rowActionsProvider.COLUMN_NAME}">
</ng-container>
```

That template (lines 343–347) cannot receive inline style bindings at the call site. Replace the `ng-container` with an inline footer cell that matches the pattern used by the other 4 special columns:

```html
<td mat-footer-cell *matFooterCellDef
    [style.width]="rowActionsProvider.size?.width"
    [style.min-width]="rowActionsProvider.size?.minWidth"
    [style.max-width]="rowActionsProvider.size?.maxWidth">
  {{ totalRowProvider.totals.get(rowActionsProvider.COLUMN_NAME) ?? '' }}
</td>
```

`footerCellTemplate` is only referenced by this one call site, so after inlining it becomes dead code and is removed from the template.

## Public API

No changes. `ColumnSize` is already exported via `export * from './lib/model/ColumnConfig'` in `public-api.ts`. All 5 config interfaces are likewise already exported from the same barrel.

## Usage Examples

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

Any CSS unit is accepted (`px`, `%`, `em`, `rem`, `vw`, etc.), matching the v19.0.13 behavior for regular columns.

## Release

- Version: bump `projects/ngx-aur-mat-table/package.json` from `19.0.14` to `19.0.15` (patch, consistent with how v19.0.13 shipped the original column-size feature).
- Changelog: new `changelog/19.0.15.md` in Russian, mirroring `changelog/19.0.13.md` style, covering all 5 special columns with a short example.

## Verification

Manual only — repo has no unit tests for template styling, consistent with v19.0.13.

1. `cd projects/ngx-aur-mat-table && npx ng build ngx-aur-mat-table` — must succeed.
2. `npx ng serve aur-demo` — temporarily add `size` to action/selection/index configs in the demo, confirm in DevTools that the `<th>`, `<td>`, and footer cells carry the expected inline styles. Revert before commit.
3. Confirm a column without `size` still renders with no width-related inline styles (regression check).

## Scope Summary

Five change areas:

1. **Model** — `size?: ColumnSize` added to 5 interfaces in `ColumnConfig.ts`.
2. **Providers** — `size` getter added to 5 providers plus their `Dummy` variants.
3. **Template** — inline style bindings on 3 cells × 5 columns (15 elements); inline the action-column footer cell; remove orphaned `footerCellTemplate`.
4. **Version** — bump to 19.0.15.
5. **Changelog** — new `19.0.15.md`.

Out of scope: SCSS changes, factory changes, regular-column `ColumnConfig.size` (already shipped in v19.0.13), any new public types.
