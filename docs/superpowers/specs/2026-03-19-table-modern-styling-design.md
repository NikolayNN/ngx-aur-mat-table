# Table Modern Styling Design

## Goal

Make `aur-mat-table` look more elegant, minimalistic, and modern by adding rounded outer borders, comfortable column spacing, and a visually distinct header row. All style values are exposed as CSS custom properties for consumer customization.

## Approach

CSS-only changes in `ngx-aur-mat-table.component.scss` using CSS custom properties with sensible defaults. No TypeScript changes needed.

## CSS Custom Properties

| Variable | Default | Purpose |
|---|---|---|
| `--aur-table-border-radius` | `10px` | Outer border radius of the table container |
| `--aur-table-border-color` | `#bdbdbd` | Outer border color |
| `--aur-table-border-width` | `1px` | Outer border width |
| `--aur-table-cell-padding` | `12px` | Left/right padding on `th` and `td` |
| `--aur-table-header-bg` | `#fafafa` | Header row background color |
| `--aur-table-header-font-weight` | `700` | Header row font weight |

## Changes

### 1. `.table-container` — rounded outer border

Add `border`, `border-radius`, and `overflow: hidden` to `.table-container` so the table gets rounded outer borders. The `overflow: hidden` clips the inner `<table>` corners to match the container radius.

```scss
.aur-mat-table .table-container {
  border: var(--aur-table-border-width, 1px) solid var(--aur-table-border-color, #bdbdbd);
  border-radius: var(--aur-table-border-radius, 10px);
  overflow: hidden;
}
```

### 2. `th, td` — increased cell padding

Replace the current `4px` padding with `12px` via CSS custom property.

```scss
.aur-mat-table th, td {
  padding-right: var(--aur-table-cell-padding, 12px) !important;
  padding-left: var(--aur-table-cell-padding, 12px) !important;
}
```

### 3. Header row — background and bold text

Style `mat-mdc-header-row` with a light background and bolder font.

```scss
.aur-mat-table .mat-mdc-header-row {
  background-color: var(--aur-table-header-bg, #fafafa);
}

.aur-mat-table .mat-mdc-header-cell {
  font-weight: var(--aur-table-header-font-weight, 700);
}
```

## Files Modified

- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss` — all CSS changes

## Consumer Customization

Consumers can override any default by setting the CSS custom property on a parent element or `:host`:

```css
aur-mat-table {
  --aur-table-border-radius: 0;       /* disable rounding */
  --aur-table-cell-padding: 8px;      /* tighter spacing */
  --aur-table-header-bg: transparent;  /* no header background */
}
```

## Compatibility

- No breaking changes to the TypeScript API
- Default visual appearance changes (intentional improvement)
- Consumers who need the old look can reset via CSS variables: `--aur-table-border-radius: 0; --aur-table-border-color: transparent; --aur-table-cell-padding: 4px; --aur-table-header-bg: transparent; --aur-table-header-font-weight: 500;`
