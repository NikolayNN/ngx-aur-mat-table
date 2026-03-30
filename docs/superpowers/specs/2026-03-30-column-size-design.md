# Column Size Configuration

## Summary

Add manual column width configuration (`width`, `minWidth`, `maxWidth`) to `ColumnConfig` via a new `ColumnSize` interface. Applies only to user-defined columns from `columnsCfg`, not special columns (selection, index, action, drag, timeline).

## Interface

New interface in `ColumnConfig.ts`:

```typescript
export interface ColumnSize {
  width?: string;      // e.g. '200px', '25%'
  minWidth?: string;   // e.g. '100px'
  maxWidth?: string;   // e.g. '400px'
}
```

Added as optional field to `ColumnConfig<T>`:

```typescript
export interface ColumnConfig<T> {
  // ... existing fields ...
  size?: ColumnSize;
}
```

All fields are optional. If `size` is not provided, the column behaves as before (auto-width from Material table).

Values are strings with CSS units — `px`, `%`, `em`, etc.

## Template Changes

Inline style bindings on all 4 cell types in the `columnsCfg` loop (`ngx-aur-mat-table.component.html`):

### Header (sortable)

```html
<th mat-header-cell *matHeaderCellDef [mat-sort-header]="columnConfig.key"
    [arrowPosition]="..."
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

### Header (not sortable)

```html
<th mat-header-cell *matHeaderCellDef
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

### Body cell

```html
<td mat-cell *matCellDef="let element;"
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

### Footer cell

```html
<td mat-footer-cell *matFooterCellDef
    [style.width]="columnConfig.size?.width"
    [style.min-width]="columnConfig.size?.minWidth"
    [style.max-width]="columnConfig.size?.maxWidth">
```

## Public API

Export `ColumnSize` from `public-api.ts` so library consumers can import the type.

## Usage Example

```typescript
const tableConfig: TableConfig<Customer> = {
  columnsCfg: [
    {
      name: 'Name',
      key: 'name',
      valueConverter: v => v.name,
      size: { minWidth: '150px', maxWidth: '300px' }
    },
    {
      name: 'Age',
      key: 'age',
      valueConverter: v => v.age,
      size: { width: '80px' }  // fixed width
    },
    {
      name: 'Email',
      key: 'email',
      valueConverter: v => v.email
      // no size — auto-width as before
    }
  ]
};
```

## Scope

Three changes total:

1. **Model** — new `ColumnSize` interface + `size?` field in `ColumnConfig`
2. **Template** — inline style bindings on 4 elements in the `columnsCfg` loop
3. **Public API** — export `ColumnSize`

No changes to SCSS, components, factories, or special columns.
