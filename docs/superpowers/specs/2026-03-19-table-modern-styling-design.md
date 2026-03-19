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

Add `border`, `border-radius`, and `overflow: clip` to `.table-container`. Using `overflow: clip` instead of `overflow: hidden` is essential — it clips the inner `<table>` corners to match the container radius without breaking `position: sticky` headers/footers or interfering with the existing `overflow: auto` in bottom-pagination mode.

The border-radius works because we round the **container** and clip its content. The inner `<table>` keeps `border-collapse: collapse` — border-radius has no effect on collapsed tables themselves, but the container clip handles the visual rounding.

```scss
.aur-mat-table .table-container {
  border: var(--aur-table-border-width, 1px) solid var(--aur-table-border-color, #bdbdbd);
  border-radius: var(--aur-table-border-radius, 10px);
  overflow: clip;
}
```

Note: The existing `.table-container.bottom-pagination` rule sets `overflow: auto` for scroll behavior. Since the `.bottom-pagination` variant has higher specificity (two classes vs one), it will naturally override `overflow: clip`, preserving scroll functionality. However, this means bottom-pagination mode will not get corner clipping — this is acceptable since scrollable containers need `overflow: auto`.

### 2. `th, td` — increased cell padding

Replace the current `4px` padding with `12px` via CSS custom property. Also fix the existing selector bug: the bare `td` selector was unscoped (CSS parses `.aur-mat-table th, td` as two independent selectors). Angular's emulated encapsulation attributes mask this in practice, but the selector should be correct.

```scss
.aur-mat-table th,
.aur-mat-table td {
  padding-right: var(--aur-table-cell-padding, 12px) !important;
  padding-left: var(--aur-table-cell-padding, 12px) !important;
}
```

Note: `!important` is retained to override Angular Material's default cell padding. Consumers who need to override this value should use the CSS custom property rather than competing with specificity.

### 3. Header row — background and bold text

Style all `mat-mdc-header-row` elements with a light background and bolder font. This applies to all header rows (main header, extra-header-top, extra-header-bottom) — intentional, as a consistent header band looks cohesive.

```scss
.aur-mat-table .mat-mdc-header-row {
  background-color: var(--aur-table-header-bg, #fafafa);
}

.aur-mat-table .mat-mdc-header-cell {
  font-weight: var(--aur-table-header-font-weight, 700);
}
```

### 4. Pagination visual note

The `<mat-paginator>` sits outside `.table-container` in the template, so it is not enclosed by the rounded border. This is intentional — the paginator is a separate control below the table data. The border frames the data area only.

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
