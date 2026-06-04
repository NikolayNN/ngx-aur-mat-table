# Unify row config & styling on `StyleBuilder.Row` (header / body / total)

**Date:** 2026-06-04
**Status:** Approved (design)
**Scope:** `ngx-aur-mat-table` library — per-row-kind config & decoration (header, body, total/footer, click-highlight)
**Compatibility:** **BREAKING.** `DecorStyles` removed; a uniform `headerRowCfg` / `bodyRowCfg` / `totalRowCfg` trio (each with a `styleCfg`); `clickCfg` and `rowStyleCfg` move under `bodyRowCfg`; `pointer` moves to a new `bodyRowCfg.hoverCfg` (with configurable hover style, replacing the hardcoded `#f2f2f2`); `totalRowView` removed; `highlightClicked` / style hooks change shape. Single-pass migration of demos + tests + README.

## Problem

Row styling and per-row config are scattered and use two incompatible models:

- **`DecorStyles`** (`{ color?, background?, border?, fontWeight? }`) — structured object bound via `[ngStyle]`. Used by `clickCfg.highlightClicked` and the freshly-shipped `rowStyleCfg` (body rows). Only 4 properties; `border` is a single shorthand (no per-side control).
- **`StyleBuilder.Row`** — fluent builder that `.build()`s a raw CSS **string**, bound via `[style]`. Used by the total row (`totalRowCfg.totalRowView.style`). Richer: per-side borders (`BorderStyleBuilder.top/bottom/left/right/allBorders`), trivially extensible.

Plus structural scatter:
- The header row has **no** row-level styling at all.
- The total row has only a static string and **no `class` hook**, and cannot react to its computed values.
- Body-row concerns live in two unrelated places — `clickCfg` (interaction) and `rowStyleCfg` (appearance) — both at `TableConfig` root.

Goal: one styling primitive — `StyleBuilder.Row` — everywhere, and a uniform per-row-kind config taxonomy.

## Why `StyleBuilder.Row` over `DecorStyles`

`StyleBuilder.Row` wins on expressiveness (per-side borders, extensible vocabulary), DX (fluent), and uniformity. `DecorStyles`'s only real advantages were tied to it being a *structured object*; both move into the builder so it becomes a strict superset:

1. **Per-property overlay** — the highlighted row merges `highlightClicked` over the base via `{ ...base, ...highlight }`. Replaced by a new `Row.overrideWith(other)` with identical per-field semantics.
2. **Introspection** — `.new-color` is toggled by `!!highlightClicked?.color`. Replaced by a new `Row.color` getter. (`.new-color` forces cells to `color: inherit` so a row-level highlight color is inherited by `<td>`s instead of being overridden by Material's cell color.)

## Config taxonomy

The library's dominant convention is one `<feature>Cfg` object per feature (`selectionCfg`, `actionCfg`, `dragCfg`, `timelineCfg`, `paginationCfg`). The three **row kinds** get a uniform trio, each exposing a `styleCfg`; **body** additionally owns `clickCfg` and `hoverCfg` (body-`<tr>` interactions that, unlike selection/action/drag/index/timeline, own no column):

```
headerRowCfg { styleCfg }                       // static look
bodyRowCfg   { clickCfg, hoverCfg, styleCfg }   // interaction + per-row look
totalRowCfg  { enable, styleCfg }               // existence + value-driven look
```

`styleCfg` is the single, uniform home for `class`/`style` on every row kind; its inner type differs by row nature (static vs per-row function vs totals-driven). `pointer` moves out of `clickCfg` into `hoverCfg` (it is a hover concern, not a click one). Column-owning features (`selectionCfg`, `actionCfg`, `dragCfg`, `indexCfg`, `timelineCfg`) are a separate "special columns" category and are **not** folded in.

## API (`model/ColumnConfig.ts`)

### Removed

```ts
export interface DecorStyles { ... }              // DELETED
export interface TotalRowView { style?: string }  // DELETED (only field was `style`)
// TableConfig.clickCfg field removed (moves to bodyRowCfg.clickCfg)
```

### Added / changed

```ts
import { StyleBuilder } from '../style-builder/style-builder';

export interface TableConfig<T> {
  // ... existing, MINUS clickCfg ...
  headerRowCfg?: HeaderRowConfig;   // NEW
  bodyRowCfg?: BodyRowConfig<T>;    // NEW (absorbs clickCfg + hoverCfg + the old rowStyleCfg)
  totalRowCfg?: TotalRowConfig<T>;  // EXISTS — now generic; totalRowView -> styleCfg
}

// ---- row-kind containers ----
export interface HeaderRowConfig {
  styleCfg?: HeaderStyleConfig;
}
export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig;            // highlightClicked / cancelable (moved from TableConfig root)
  hoverCfg?: HoverConfig;            // pointer / hover style (pointer moved out of clickCfg)
  styleCfg?: BodyStyleConfig<T>;     // per-row class/style (was rowStyleCfg)
}
export interface TotalRowConfig<T> {
  enable: boolean;                   // unchanged; totalRowView removed
  styleCfg?: TotalStyleConfig<T>;
}

// ---- per-kind style configs (uniform `styleCfg` field, type differs by nature) ----
export interface HeaderStyleConfig {                       // static
  class?: string;
  style?: StyleBuilder.Row | string;
}
export interface BodyStyleConfig<T> {                      // per-row functions
  class?: (row: TableRow<T>) => string | null;
  style?: (row: TableRow<T>) => StyleBuilder.Row | string;
}
/** static value OR a function of the computed totals + source rows */
type TotalHook<T, R> = R | ((totals: Map<string, any>, data: TableRow<T>[]) => R);
export interface TotalStyleConfig<T> {                     // static or value-driven
  class?: TotalHook<T, string | null>;
  style?: TotalHook<T, StyleBuilder.Row | string>;
}

// ---- interaction ----
export interface ClickConfig {
  highlightClicked?: StyleBuilder.Row | string;            // was DecorStyles; pointer moved to HoverConfig
  cancelable?: boolean;
}
export interface HoverConfig {
  enable?: boolean;                  // master switch for the hover overlay; default true when hoverCfg present
  pointer?: boolean;                 // cursor: pointer on the body row
  styleCfg?: HoverStyleConfig;       // applied while the row is hovered (overlay, like highlight)
}
export interface HoverStyleConfig {                         // static (hover look is uniform across rows)
  class?: string;
  style?: StyleBuilder.Row | string;
}
```

Note: `style-builder.ts` has no imports, so importing `StyleBuilder` into `ColumnConfig.ts` introduces no cycle.

### Usage

```ts
import { StyleBuilder } from 'ngx-aur-mat-table';
import FontWeight = StyleBuilder.FontWeight;
import BorderStyle = StyleBuilder.BorderStyle;

tableConfig: TableConfig<Customer> = {
  columnsCfg: [/* ... */],

  headerRowCfg: {
    styleCfg: {
      style: StyleBuilder.Row.builder().background('#eee').fontWeight(FontWeight.BOLDER),
      class: 'my-header',
    },
  },

  bodyRowCfg: {
    clickCfg: {
      highlightClicked: StyleBuilder.Row.builder().background('blue').color('red'),
      cancelable: true,
    },
    hoverCfg: {
      pointer: true,
      styleCfg: { style: StyleBuilder.Row.builder().background('#f2f2f2') },  // custom hover bg
    },
    styleCfg: {
      style: row => row.id % 5 === 4
        ? StyleBuilder.Row.builder().fontWeight(FontWeight.BOLD).background('#fafafa')
        : '',                                    // raw-string escape hatch
      class: row => row.id % 5 === 4 ? 'subtotal not-hover' : null,
    },
  },

  totalRowCfg: {
    enable: true,
    styleCfg: {
      // static or value-driven:
      style: (totals, data) => totals.get('age') < 0
        ? StyleBuilder.Row.builder().color('red').fontWeight(FontWeight.BOLDER)
        : StyleBuilder.Row.builder().color('green'),
      class: totals => totals.get('age') < 0 ? 'negative-total' : null,
    },
  },
};
```

`.build()` is optional in config values — an un-built `StyleBuilder.Row` is accepted (the library calls `.build()`); a raw string also works; a string already returned by `.build()` is unchanged.

## `StyleBuilder.Row` upgrades (`style-builder/style-builder.ts`)

Two additions; existing methods untouched.

```ts
export class Row {
  // existing private fields: _background, _color, _border, _fontWeight

  /** Configured text color ('' if unset) — used to toggle `.new-color`. */
  get color(): string { return this._color; }

  /** New Row = this overridden field-by-field by `o`'s non-empty fields (o wins). Mirrors {...base, ...overlay}. */
  overrideWith(o: Row): Row {
    const r = new Row();
    r._background = o._background || this._background;
    r._color      = o._color      || this._color;
    r._border     = o._border     || this._border;
    r._fontWeight = o._fontWeight || this._fontWeight;
    return r;
  }
}
```

`overrideWith` works on typed fields (not the built string), so `base.overrideWith(highlight).build()` reproduces the current per-property merge exactly (`border` overridden as a unit, same granularity as the old `DecorStyles.border`).

## Architecture / component wiring (`ngx-aur-mat-table.component.ts`)

### Removed
- `import { DecorStyles }`; the `private decorToCss(...)` method; `rowNgStyle(...)` (→ `rowStyle(...)`).
- `.setStyle()` from the total-provider chain (`L377–379`).

### Helpers

```ts
import { StyleBuilder } from './style-builder/style-builder';

/** StyleBuilder.Row | string | null -> CSS string | null. */
private toCss(s?: StyleBuilder.Row | string | null): string | null {
  if (s == null) return null;
  return typeof s === 'string' ? s : s.build();
}

/** base with `overlay` on top. Builders -> field override; any string -> concat (CSS last-wins). */
private mergeStyle(
  base?: StyleBuilder.Row | string | null,
  overlay?: StyleBuilder.Row | string | null,
): string | null {
  if (base == null)    return this.toCss(overlay);
  if (overlay == null) return this.toCss(base);
  if (base instanceof StyleBuilder.Row && overlay instanceof StyleBuilder.Row)
    return base.overrideWith(overlay).build();
  return `${this.toCss(base) ?? ''} ${this.toCss(overlay) ?? ''}`.trim();
}

/** total hook: static value or (totals, data) => value. */
private resolveTotal<R>(
  v: R | ((t: Map<string, any>, d: TableRow<T>[]) => R) | undefined,
  totals: Map<string, any>, data: TableRow<T>[],
): R | undefined {
  return typeof v === 'function' ? (v as any)(totals, data) : v;
}
```

`typeof === 'function'` cleanly distinguishes a callback from a value (`StyleBuilder.Row` is an object, not a function).

### Body row

```ts
hovered: TableRow<T> | null = null;  // tracked via (mouseenter)/(mouseleave)

private hoverActive(row: TableRow<T>): boolean {
  const h = this.tableConfig.bodyRowCfg?.hoverCfg;
  return this.hovered === row && h?.enable !== false;
}
onRowEnter(row: TableRow<T>) { this.hovered = row; }
onRowLeave(row: TableRow<T>) { if (this.hovered === row) this.hovered = null; }

/** [style] for the body <tr>: base, then hover overlay, then highlight overlay (highlight wins). */
rowStyle(row: TableRow<T>): string | null {
  let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
  if (this.hoverActive(row))
    acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style ?? null);
  if (this.highlighted === row.rowSrc)
    acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.clickCfg?.highlightClicked ?? null);
  return this.toCss(acc);
}

rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
  const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
  const hl = this.tableConfig.bodyRowCfg?.clickCfg?.highlightClicked;
  const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.color : !!hl; // raw string -> conservative true
  const cls: { [klass: string]: boolean } = {
    'pointer':   hover?.pointer || false,                       // moved from clickCfg
    'new-color': this.highlighted === row.rowSrc && hlHasColor,
  };
  const custom = this.rowStyles[row.id]?.class;
  if (custom) cls[custom] = true;
  const hcls = this.hoverActive(row) ? hover?.styleCfg?.class : null;  // hover class overlay
  if (hcls) cls[hcls] = true;
  return cls;
}

// rowClick(): read this.tableConfig.bodyRowCfg?.clickCfg?.cancelable (was tableConfig.clickCfg?.cancelable)
```

Hover is just another overlay layered before highlight, reusing `mergeStyle`. A row can be both hovered and highlighted; highlight is applied last so it wins. Chained `mergeStyle` degrades to string-concat after the first builder merge, which still resolves correctly (CSS last-wins).

`ResolvedRowStyle.style` keeps the **un-built** `StyleBuilder.Row | string | null` so `instanceof` / `overrideWith` stay available at render time (do not pre-`build()` in the factory).

### Header & total (resolved once)

**Header** is static → resolved in `initTable()`. **Total** may be value-driven → resolved **after** `.setTotalRow()` (where `totals` and source `data` are available):

```ts
// initTable() — header (static):
this._headerStyle = this.toCss(this.tableConfig.headerRowCfg?.styleCfg?.style);
this._headerClass = this.tableConfig.headerRowCfg?.styleCfg?.class ?? null;

// after `this.totalRowProvider = TotalRowProvider.create(...).setTotalRow()`:
const totals = this.totalRowProvider.totals;
const data   = this.tableDataSource.data;
const sc     = this.tableConfig.totalRowCfg?.styleCfg;
this._totalStyle = this.toCss(this.resolveTotal(sc?.style, totals, data) ?? null);
this._totalClass = this.resolveTotal(sc?.class, totals, data) ?? null;
```

### `RowStyleFactory` (`model/RowStyleFactory.ts`)

```ts
import { StyleBuilder } from '../style-builder/style-builder';

export interface ResolvedRowStyle {
  class: string | null;
  style: StyleBuilder.Row | string | null;   // was DecorStyles
}

// reads tableConfig.bodyRowCfg?.styleCfg (was tableConfig.rowStyleCfg)
// toRowStyles: class/style: cfg.class/style ? cfg.x(row) : null   (no decorToCss; keep raw)
```

### `TotalRowProvider` (`providers/TotalRowProvider.ts`)
- Remove the `style` field and the `setStyle()` method (and the `TotalRowProviderDummy` override if present). `create()` keeps reading `tableConfig.totalRowCfg?.enable`.

## Template changes (`ngx-aur-mat-table.component.html`)

```html
<!-- main header row (L333) -->
<tr mat-header-row *matHeaderRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.header"
    [style]="_headerStyle" [ngClass]="_headerClass"></tr>

<!-- body row (L343–350): [ngStyle] -> [style]; + hover tracking -->
<tr mat-row #rowLink
    (dragover)="onDragOver($event)" (drop)="onDrop($event, row)"
    *matRowDef="let row; columns: _displayColumns;"
    (click)="rowClick(row)"
    (mouseenter)="onRowEnter(row)" (mouseleave)="onRowLeave(row)"
    [ngClass]="rowNgClass(row)"
    [style]="rowStyle(row)"></tr>

<!-- total/footer row (L378–381): drop totalRowProvider.style -->
<tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
    [style]="_totalStyle" [ngClass]="_totalClass"></tr>
```

## Precedence & merge rules

1. **Body base:** `bodyRowCfg.styleCfg.style(row)` → `[style]`; `.class(row)` → `[ngClass]`.
2. **Hover overlay (body only):** while hovered (and `hoverCfg.enable !== false`), `bodyRowCfg.hoverCfg.styleCfg` is layered over the base; `hoverCfg.pointer` toggles the `.pointer` class (cursor only — the old hardcoded `#f2f2f2` is gone).
3. **Highlight overlay (body only):** on the highlighted row, `bodyRowCfg.clickCfg.highlightClicked` is applied over base+hover — builder⊕builder via `overrideWith` (per-field, overlay wins); if either side is a raw string, via concatenation with the overlay last (CSS last-wins → same result). Highlight is applied last, so it wins over hover.
4. **`.new-color`:** applied when highlighted and the highlight sets a color (`hl.color` for a builder; any non-empty raw string treated conservatively as "has color").
5. **`pointer` / custom / hover class** coexist with `new-color`.
6. **Header:** static `styleCfg`. **Total:** `styleCfg` static or `(totals, data) =>`, resolved once after totals are computed. Neither is highlightable / hoverable → no overlay.

## Change detection / performance

- User hooks (`bodyRowCfg.styleCfg`, `headerRowCfg.styleCfg`, `totalRowCfg.styleCfg`) run **once per data refresh** (in `RowStyleFactory` / `initTable` / right after `setTotalRow()`), not per CD — matching `TableViewFactory`. The total `(totals, data) =>` callback runs once per refresh.
- `rowStyle` / `rowNgClass` run per CD (as the old inline literals did): an O(1) lookup plus a small `build()` / concat. `_headerStyle` / `_totalStyle` are precomputed field reads.
- **Hover:** `(mouseenter)`/`(mouseleave)` set a single `hovered` field and trigger CD (like `rowClick` does for `highlighted`). Listeners fire only on actual hover; negligible for typical tables. Hover overlay is computed in `rowStyle`/`rowNgClass` only for the one hovered row.

## Breaking changes & migration (single pass)

Library:
- `model/ColumnConfig.ts` — delete `DecorStyles`, `TotalRowView`; remove `TableConfig.clickCfg`; add `headerRowCfg`/`bodyRowCfg`; reshape `totalRowCfg` (generic, `styleCfg`, drop `totalRowView`); add containers `HeaderRowConfig`/`BodyRowConfig<T>`/`TotalRowConfig<T>`, style configs `HeaderStyleConfig`/`BodyStyleConfig<T>`/`TotalStyleConfig<T>` (+ `TotalHook`), and `HoverConfig`/`HoverStyleConfig`; remove `pointer` from `ClickConfig` (→ `HoverConfig`); `ClickConfig.highlightClicked` retyped; import `StyleBuilder`.
- `ngx-aur-mat-table.component.scss` — drop the hardcoded `.pointer:hover { background-color:#f2f2f2 }`; keep only `cursor: pointer` for `.pointer` (hover background is now driven by `hoverCfg.styleCfg`).
- `model/RowStyleFactory.ts` — read `bodyRowCfg.styleCfg`; `ResolvedRowStyle.style` retyped; drop `decorToCss` dependency.
- `providers/TotalRowProvider.ts` — remove `style` / `setStyle()`.
- `ngx-aur-mat-table.component.ts` — remove `decorToCss` / `rowNgStyle`; add `toCss` / `mergeStyle` / `resolveTotal` / `rowStyle`; add `hovered` field + `onRowEnter`/`onRowLeave`/`hoverActive` and the hover overlay in `rowStyle`/`rowNgClass`; update `rowNgClass` (pointer from `hoverCfg`) and `rowClick` to read `bodyRowCfg.clickCfg`; resolve `_headerStyle/_headerClass` (initTable) and `_totalStyle/_totalClass` (after `setTotalRow`); drop `.setStyle()`.
- `ngx-aur-mat-table.component.html` — header/body/total bindings above; body row gains `(mouseenter)`/`(mouseleave)`.
- `public-api.ts` — `DecorStyles`/`TotalRowView` no longer exported; new interfaces auto-exported via `export *`; `StyleBuilder` already exported.

Consumers to migrate (demos + tests):
- `clickCfg: {...}` (root) → `bodyRowCfg: { clickCfg: {...} }`, and `highlightClicked` objects → builder/string:
  - `table-highlight-clicked-row.component.ts:30–38` (`{ background:'blue', color:'red', border:'2px solid green' }`)
  - `table-with-sub-footer.component.ts:29`
  - `table-expanding-row.component.ts:29`
- `rowStyleCfg: {...}` → `bodyRowCfg: { styleCfg: {...} }`, object → builder/string: `table-with-row-style.component.ts` (its `clickCfg: { pointer: true }` → `bodyRowCfg: { hoverCfg: { pointer: true } }`).
- `clickCfg.pointer` → `hoverCfg.pointer` everywhere it appears (the demos above + the spec).
- `totalRowCfg.totalRowView.style` → `totalRowCfg.styleCfg.style`: `table-with-total.component.ts`.
- `ngx-aur-mat-table-row-style.spec.ts` — uses `clickCfg: { pointer, highlightClicked: { background:'yellow' } }` at root and asserts `style['background-color']` (object output); move click under `bodyRowCfg.clickCfg`, `pointer` under `bodyRowCfg.hoverCfg`, rewrite asserts to the `[style]` **string** from `rowStyle(...)`.
- `RowStyleFactory.spec.ts` — update for `bodyRowCfg.styleCfg` + `style: StyleBuilder.Row | string | null`.
- Any external import of `DecorStyles` / use of root `clickCfg` / `rowStyleCfg` breaks (intended).

## Testing

- **`StyleBuilder.Row`:** `color` getter (set / unset → `''`); `overrideWith` (overlay non-empty fields win; base-only survive; `border` as a unit); `overrideWith(...).build()` equals the old `{...base,...overlay}` resolved styling.
- **`toCss`:** builder → string; string passthrough; nullish → `null`.
- **`mergeStyle`:** builder⊕builder (field override); builder⊕string and string⊕string (concat, overlay last); one side null.
- **`resolveTotal` / value-driven total:** static passes through; `(totals, data) =>` invoked with totals map + source rows, result applied (e.g. `totals.get('age') < 0 → red`); runs once per refresh after `setTotalRow()`.
- **`rowStyle` / `rowNgClass`:** read click from `bodyRowCfg.clickCfg`, pointer/hover from `bodyRowCfg.hoverCfg`; non-highlighted/non-hovered → base only; highlighted → overlay applied; `new-color` set iff highlight has color (builder) or any raw-string highlight; `pointer` / custom class coexist.
- **Hover overlay:** `onRowEnter`/`onRowLeave` set `hovered`; hovered row gets `hoverCfg.styleCfg` layered over base and the hover `class` added; `enable: false` suppresses it; highlight applied over hover wins; leaving clears the overlay.
- **Header / total:** `styleCfg` rendered on the right `<tr>`; resolved once per refresh; absent cfg → `null` (no attribute), table renders as before.
- **Back-compat baseline:** a table with no header/body/total cfg produces unchanged class/style output.

## Demo, changelog, docs

- **Demos:** migrate the components above; extend `table-with-total` to also show `headerRowCfg.styleCfg` and a value-driven `totalRowCfg.styleCfg.style` (red when a sum is negative); `table-with-row-style` to use the builder under `bodyRowCfg.styleCfg` and a `hoverCfg.styleCfg` example.
- **Changelog:** new `changelog/<next>.md` flagged **BREAKING** — remove `DecorStyles` / `totalRowView`; introduce `headerRowCfg` / `bodyRowCfg` / `totalRowCfg.styleCfg` trio; move root `clickCfg` → `bodyRowCfg.clickCfg`, `pointer` → `bodyRowCfg.hoverCfg.pointer`, `rowStyleCfg` → `bodyRowCfg.styleCfg`; new `hoverCfg` (enable/pointer/styleCfg, drops the hardcoded `#f2f2f2` hover); value-driven total (`(totals, data) =>`); `StyleBuilder.Row.overrideWith` + `color`. Confirm the version at release (`package.json` is `19.0.17`; changelogs exist through `19.0.19`).
- **README:** replace the `DecorStyles` / per-row styling / `clickCfg` sections with one "Row config & styling (`headerRowCfg` / `bodyRowCfg` / `totalRowCfg`, `StyleBuilder.Row`)" section, covering the uniform `styleCfg`, body `clickCfg` / `hoverCfg`, value-driven total, and the raw-string escape hatch.
