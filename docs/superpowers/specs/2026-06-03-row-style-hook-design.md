# Per-row style hook: `rowStyleCfg` on `<tr mat-row>`

**Date:** 2026-06-03
**Status:** Approved (design)
**Scope:** `ngx-aur-mat-table` library — per-row body-row decoration
**Compatibility:** Additive only. No breaking changes; `DecorStyles` gains one optional field.

## Problem

Report data contains subtotal rows flagged `row.bold === true` (`report.getIsBoldRow(index)`). The consuming app currently styles them with a `total not-hover` CSS class (bold font, hover suppressed). `TableConfig` offers no way to decorate an arbitrary body `<tr>` from row data:

- **`clickCfg.highlightClicked`** (`ClickConfig`) decorates only the *clicked/highlighted* row, and only with `DecorStyles` (`color` / `background` / `border`).
- **`valueView`** (`ColumnView<(row: TableRow<T>) => string>`) resolves per-row text color / tooltip / icon **per cell**, not `font-weight`, and never a class or style on the `<tr>`.
- **`totalRowCfg`** renders a single shared footer (`<tr mat-footer-row>`), not arbitrary rows inside the body.

There is no hook  to put a class or inline style on a body `<tr mat-row>` as a function of its row.

## Goals

- A per-row hook on the body `<tr mat-row>` driven by `TableRow<T>`: attach a CSS **class** and/or an inline **style**.
- Make the motivating case — **bold rows** — expressible inline through the typed vocabulary (not only via a stylesheet class).
- Reuse the library's existing "resolve once per data refresh" pattern (`TableViewFactory`) so the hook is OnPush-friendly and the user's functions are not called on every change-detection pass.
- Compose predictably with `clickCfg.highlightClicked` and `clickCfg.pointer`.
- Strictly additive; existing tables behave identically.

## Non-goals

- Styling header or footer/total rows — `totalRowCfg` stays the mechanism for the total row; headers are untouched.
- Per-cell styling beyond what `valueView` already provides.
- A declarative rules engine (`{ when, class, style }[]`). Plain functions are enough (YAGNI).
- A library-level hover on/off switch. Hover suppression is achieved via the `class` hook + consumer CSS (the lib's only hover rule is `.aur-mat-table .pointer:hover`).

## API

### 1. Extend `DecorStyles` with `fontWeight` (`model/ColumnConfig.ts`)

```ts
export interface DecorStyles {
  color?: string;
  background?: string;
  border?: string;
  fontWeight?: string;   // NEW — 'bold' | 'bolder' | '600' | ... (StyleBuilder.FontWeight values are valid strings)
}
```

This single field also upgrades `clickCfg.highlightClicked` (same type) to support font-weight — a free, additive bonus.

`fontWeight` is typed as `string` to match the other `DecorStyles` fields. The existing `StyleBuilder.FontWeight` enum (already exported) produces valid values for callers who want autocomplete.

### 2. Add `rowStyleCfg` to `TableConfig<T>` (`model/ColumnConfig.ts`)

```ts
export interface TableConfig<T> {
  // ... existing fields ...
  rowStyleCfg?: RowStyleConfig<T>;
}

export interface RowStyleConfig<T> {
  /** CSS class(es) to add to <tr mat-row>; may return space-separated classes, e.g. 'total not-hover'. */
  class?: (row: TableRow<T>) => string | null;
  /** Inline style for <tr mat-row>. */
  style?: (row: TableRow<T>) => DecorStyles;
}
```

### Usage — bold subtotal rows

```ts
tableConfig: TableConfig<ReportRow> = {
  columnsCfg: [ /* ... */ ],
  clickCfg: { pointer: true },
  rowStyleCfg: {
    // inline, typed — no stylesheet needed for bold:
    style: row => row.rowSrc.bold ? { fontWeight: 'bold' } : {},
    // hover suppression for those rows stays a CSS concern:
    class: row => row.rowSrc.bold ? 'not-hover' : null,
  },
};
```

```scss
/* consumer stylesheet — only needed for the hover-suppression part */
.not-hover:hover { background-color: inherit !important; cursor: default; }
```

A consumer who prefers their existing class-only approach can ignore `style` and return `'total not-hover'` from `class` — both hooks are independent and optional.

## Architecture

### `RowStyleFactory` (new) — mirrors `TableViewFactory`

`model/TableViewFactory.ts` already resolves per-row, per-column view functions once into concrete values, returned as an array indexed by `row.id`. `RowStyleFactory` does the same for the row hook.

`model/RowStyleFactory.ts`:

```ts
import { TableRow } from "./TableRow";
import { DecorStyles, TableConfig } from "./ColumnConfig";

export interface ResolvedRowStyle {
  class: string | null;
  style: DecorStyles;
}

export class RowStyleFactory {
  /** Resolve rowStyleCfg into a per-row array indexed by row.id. Empty array when the hook is unused. */
  public static toRowStyles<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): ResolvedRowStyle[] {
    const cfg = tableConfig.rowStyleCfg;
    if (!cfg || (!cfg.class && !cfg.style)) {
      return [];
    }
    return rows.map(row => ({
      class: cfg.class ? cfg.class(row) : null,
      style: cfg.style ? cfg.style(row) : {},
    }));
  }
}
```

**Index invariant.** `TableRowsFactory.convert` assigns `row.id = arrayIndex` (`data.map((obj, index) => ...)`), and `rows` is `tableDataSource.data` in original order, so `rowStyles[row.id]` addresses the correct entry — exactly as the template already does for `tableView[element.id]`. Filtering/sorting reorder only the *display*; ids and this array stay stable, so lookups remain valid without rebuilding.

Like `TableViewFactory`, this factory is **internal** — not added to `public-api.ts`.

### Component wiring (`ngx-aur-mat-table.component.ts`)

A field built in `initTable()`, right after `this.tableView = TableViewFactory.toView(...)`:

```ts
rowStyles: ResolvedRowStyle[] = [];
// in initTable():
this.rowStyles = RowStyleFactory.toRowStyles(this.tableDataSource.data, this.tableConfig);
```

Two thin, O(1) template helpers fold the precomputed base together with the existing click/highlight logic (so the `<tr>` keeps a single `[ngClass]` and single `[ngStyle]`):

```ts
private decorToCss(d?: DecorStyles): { [k: string]: string } {
  const css: { [k: string]: string } = {};
  if (!d) return css;
  if (d.color)      css['color']            = d.color;
  if (d.background) css['background-color']  = d.background;   // DecorStyles.background → CSS background-color (matches existing highlight binding)
  if (d.border)     css['border']           = d.border;
  if (d.fontWeight) css['font-weight']      = d.fontWeight;
  return css;
}

rowNgStyle(row: TableRow<T>): { [k: string]: string } {
  const base = this.decorToCss(this.rowStyles[row.id]?.style);
  if (this.highlighted === row.rowSrc) {
    // highlightClicked overrides only the properties it sets (per-property merge, highlight wins)
    return { ...base, ...this.decorToCss(this.tableConfig.clickCfg?.highlightClicked) };
  }
  return base;
}

rowNgClass(row: TableRow<T>): { [k: string]: boolean } {
  const cls: { [k: string]: boolean } = {
    'pointer':   this.tableConfig.clickCfg?.pointer || false,
    'new-color': this.highlighted === row.rowSrc && !!this.tableConfig.clickCfg?.highlightClicked?.color,
  };
  const custom = this.rowStyles[row.id]?.class;
  if (custom) {
    cls[custom] = true;   // NgClass accepts a multi-class key, e.g. 'total not-hover'
  }
  return cls;
}
```

### Template change (`ngx-aur-mat-table.component.html`, the `<tr mat-row>` at ~L343–354)

Replace the inline object literals with the helpers:

```html
<tr mat-row #rowLink
    (dragover)="onDragOver($event)"
    (drop)="onDrop($event, row)"
    *matRowDef="let row; columns: _displayColumns;"
    (click)="rowClick(row)"
    [ngClass]="rowNgClass(row)"
    [ngStyle]="rowNgStyle(row)">
</tr>
```

This preserves the current `pointer` / `new-color` / highlight behavior exactly (those move into `rowNgClass`/`rowNgStyle` unchanged) and adds the `rowStyleCfg` layer underneath.

## Precedence & merge rules

1. **Base layer:** `rowStyleCfg.style(row)` → inline style; `rowStyleCfg.class(row)` → class(es).
2. **Highlight overlay:** when `highlighted === row.rowSrc`, `clickCfg.highlightClicked` is merged over the base **per property** — only the properties it declares win; others fall through to the base.
3. **Classes coexist:** `pointer`, `new-color`, and the custom class are all applied together.
4. **Hover:** the lib's sole hover rule is `.aur-mat-table .pointer:hover` (grey background). An inline `background` from the `style` hook already beats it by specificity; for rows with no inline background, the `class` hook (+ consumer CSS) is the lever to suppress hover.

## Change detection / performance

- User functions (`class`/`style`) run **once per data refresh** inside `RowStyleFactory`, called from `initTable()` (i.e. in `prepareTableData()` / `refreshTable()` / server-page load) — never per change-detection cycle. This matches `TableViewFactory` and keeps the hook OnPush-safe even for expensive predicates.
- `rowNgClass`/`rowNgStyle` are evaluated per CD (as the previous inline literals were) but do only an O(1) array lookup plus a tiny object build/merge.

## Backward compatibility

- `rowStyleCfg` is optional; absent → `RowStyleFactory` returns `[]`, helpers reproduce today's exact class/style output. No visual change for existing tables.
- `DecorStyles.fontWeight` is optional and additive; existing `highlightClicked` configs are unaffected (and may now optionally set `fontWeight`).
- No public-API surface removed or changed in shape.

## Public API (`public-api.ts`)

- `DecorStyles`, `TableConfig`, the new `RowStyleConfig<T>` — all live in `model/ColumnConfig.ts`, already re-exported via `export * from './lib/model/ColumnConfig'`. No new export line required.
- `RowStyleFactory` / `ResolvedRowStyle` stay internal (consistent with `TableViewFactory`, which is not exported).

## Testing

- **`RowStyleFactory`** unit tests:
  - hook absent (no `rowStyleCfg`, or neither `class` nor `style`) → returns `[]`.
  - `class` only → each entry has resolved class, `style: {}`.
  - `style` only → each entry has resolved `DecorStyles`, `class: null`.
  - predicate branches: bold rows get `{ fontWeight: 'bold' }`, others `{}`.
  - result length and order align with `row.id`.
- **`decorToCss` mapping:** `background` → `background-color`; `fontWeight` → `font-weight`; `color`/`border` pass through; `undefined`/empty → `{}`.
- **Merge/precedence (component):**
  - non-highlighted row renders the base `rowStyleCfg` style/class only.
  - highlighted row: `highlightClicked` properties override the base per-property; base properties it doesn't set remain.
  - `pointer` / `new-color` classes still applied alongside the custom class.
- **Rendering:** a bold row's `<tr>` has `font-weight: bold`; a `class`-hook row's `<tr>` carries the returned class(es).
- **Back-compat:** with no `rowStyleCfg`, a row's class/style output is unchanged from the pre-feature baseline.

## Demo, changelog, docs

- **Demo:** new `table-with-row-style` demo (bold subtotal rows, `pointer` enabled, `not-hover` on bold rows), registered in the demo app's routes/nav per existing convention (mirrors `table-highlight-clicked-row`).
- **Changelog:** add `changelog/<next>.md` describing `rowStyleCfg` and `DecorStyles.fontWeight`.
  - *Release-version note:* `package.json` is at `19.0.17` while `changelog/19.0.18.md` (pagination) already exists — the `19.0.18` bump appears outstanding. Confirm the target version at release time (likely `19.0.19`) and bump `projects/ngx-aur-mat-table/package.json` accordingly. Not a code dependency of this feature.
- **README:** short "Per-row styling (`rowStyleCfg`)" section with the bold-rows example and the `DecorStyles.fontWeight` note.
