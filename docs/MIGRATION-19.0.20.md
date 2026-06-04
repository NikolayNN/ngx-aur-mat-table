# Migration Guide — 19.0.20 (Row config & styling)

**This is a BREAKING release.** Row configuration and styling were unified onto a single primitive (`StyleBuilder.Row`) and a uniform per‑row‑kind config trio. This guide maps every old option to its replacement with before/after examples.

If you only used `columnsCfg` (no row styling, no `clickCfg`), **nothing changes** — you can upgrade without edits.

---

## At a glance

| Removed / old (≤ 19.0.19) | New (19.0.20) |
| --- | --- |
| `clickCfg` (table root) | `bodyRowCfg.clickCfg` |
| `clickCfg.pointer` | `bodyRowCfg.hoverCfg.pointer` |
| `clickCfg.highlightClicked: DecorStyles` | `bodyRowCfg.clickCfg.highlightClicked: StyleBuilder.Row \| string` |
| `clickCfg.cancelable` | `bodyRowCfg.clickCfg.cancelable` (unchanged shape) |
| `rowStyleCfg` (table root) | `bodyRowCfg.styleCfg` |
| `rowStyleCfg.style: (row) => DecorStyles` | `bodyRowCfg.styleCfg.style: (row) => StyleBuilder.Row \| string` |
| `totalRowCfg.totalRowView.style: string` | `totalRowCfg.styleCfg.style: StyleBuilder.Row \| string \| ((totals, data) => …)` |
| `DecorStyles` (interface, object styling) | `StyleBuilder.Row` (or a raw CSS string) |
| *(no header row styling existed)* | `headerRowCfg.styleCfg` |
| *(no configurable hover; hardcoded `#f2f2f2`)* | `bodyRowCfg.hoverCfg.styleCfg` |

**Removed exports:** `DecorStyles`, `TotalRowView`. If you imported either, delete the import and use `StyleBuilder.Row` instead.

---

## The new shape

All three row kinds share the same `styleCfg` member. Body additionally owns interaction (`clickCfg`, `hoverCfg`).

```ts
interface TableConfig<T> {
  // ...
  headerRowCfg?: { styleCfg?: { class?: string; style?: StyleBuilder.Row | string } };

  bodyRowCfg?: {
    clickCfg?: { highlightClicked?: StyleBuilder.Row | string; cancelable?: boolean };
    hoverCfg?: { enable?: boolean; pointer?: boolean;
                 styleCfg?: { class?: string; style?: StyleBuilder.Row | string } };
    styleCfg?: { class?: (row: TableRow<T>) => string | null;
                 style?: (row: TableRow<T>) => StyleBuilder.Row | string };
  };

  totalRowCfg?: {
    enable: boolean;
    styleCfg?: {
      // each may be a static value OR a function of the computed totals + rows
      class?: string | null | ((totals: Map<string, any>, data: TableRow<T>[]) => string | null);
      style?: (StyleBuilder.Row | string) | ((totals: Map<string, any>, data: TableRow<T>[]) => StyleBuilder.Row | string);
    };
  };
}
```

> `style` accepts an **un‑built** `StyleBuilder.Row` (the table calls `.build()` for you) **or** a raw CSS string. You no longer call `.build()` yourself (calling it still works — it just yields a string).

---

## `DecorStyles` → `StyleBuilder.Row`

`DecorStyles` is gone. Map each property to a builder method (or just write a raw CSS string).

| `DecorStyles` field | `StyleBuilder.Row` |
| --- | --- |
| `color: 'red'` | `.color('red')` |
| `background: 'yellow'` | `.background('yellow')` |
| `fontWeight: 'bold'` | `.fontWeight(StyleBuilder.FontWeight.BOLD)` |
| `border: '2px solid green'` (all sides) | `.border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green'))` |
| *(top border only)* | `.border(b => b.top('3px', StyleBuilder.BorderStyle.SOLID, 'red'))` |

```ts
// before
{ color: 'red', background: 'yellow', fontWeight: 'bold', border: '2px solid green' }

// after (builder)
StyleBuilder.Row.builder()
  .color('red').background('yellow')
  .fontWeight(StyleBuilder.FontWeight.BOLD)
  .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green'))

// after (raw-string escape hatch — also valid)
'color: red; background: yellow; font-weight: bold; border: 2px solid green;'
```

Import the enums where convenient:

```ts
import { StyleBuilder } from 'ngx-aur-mat-table';
import FontWeight = StyleBuilder.FontWeight;
import BorderStyle = StyleBuilder.BorderStyle;
```

---

## 1. Click + pointer → `bodyRowCfg`

`clickCfg` moves under `bodyRowCfg`. **`pointer` moves out of `clickCfg` into `hoverCfg`** (it is a hover concern).

```ts
// before
clickCfg: {
  pointer: true,
  highlightClicked: { background: 'blue', color: 'red', border: '2px solid green' },
  cancelable: true,
},

// after
bodyRowCfg: {
  clickCfg: {
    highlightClicked: StyleBuilder.Row.builder()
      .background('blue').color('red')
      .border(b => b.allBorders('2px', BorderStyle.SOLID, 'green')),
    cancelable: true,
  },
  hoverCfg: { pointer: true },
},
```

### ⚠️ Hover behavior change

Previously `clickCfg.pointer: true` gave **both** a pointer cursor **and** a hardcoded grey `#f2f2f2` background on hover. Now `hoverCfg.pointer` only sets the cursor. To keep the grey hover background, set it explicitly:

```ts
bodyRowCfg: {
  hoverCfg: {
    pointer: true,
    styleCfg: { style: StyleBuilder.Row.builder().background('#f2f2f2') },
  },
},
```

---

## 2. Per‑row styling → `bodyRowCfg.styleCfg`

`rowStyleCfg` becomes `bodyRowCfg.styleCfg`; the `style` hook returns a `StyleBuilder.Row | string` instead of a `DecorStyles` object. Return `''` (empty string) for "no style" instead of `{}`.

```ts
// before
rowStyleCfg: {
  style: row => row.rowSrc.bold ? { fontWeight: 'bold', background: '#fafafa' } : {},
  class: row => row.rowSrc.bold ? 'subtotal not-hover' : null,
},

// after
bodyRowCfg: {
  styleCfg: {
    style: row => row.rowSrc.bold
      ? StyleBuilder.Row.builder().fontWeight(FontWeight.BOLD).background('#fafafa')
      : '',
    class: row => row.rowSrc.bold ? 'subtotal not-hover' : null,
  },
},
```

---

## 3. Total row → `totalRowCfg.styleCfg` (+ value‑driven)

`totalRowView` is removed; total styling lives in `styleCfg`. You no longer call `.build()`. New: `class`/`style` may be **functions of the computed totals + source rows** for value‑driven styling.

```ts
// before
totalRowCfg: {
  enable: true,
  totalRowView: {
    style: StyleBuilder.Row.builder().color('blue').background('lightgray').build(),
  },
},

// after — static
totalRowCfg: {
  enable: true,
  styleCfg: { style: StyleBuilder.Row.builder().color('blue').background('lightgray') },
},

// after — value-driven (e.g. red when a summed column is negative)
totalRowCfg: {
  enable: true,
  styleCfg: {
    style: (totals, data) => totals.get('age') < 0
      ? StyleBuilder.Row.builder().color('red').fontWeight(FontWeight.BOLDER)
      : StyleBuilder.Row.builder().color('green'),
    class: totals => totals.get('age') < 0 ? 'negative-total' : null,
  },
},
```

`totals` is the `Map<columnKey, value>` produced by your columns' `totalConverter`; `data` is the source `TableRow<T>[]`.

---

## 4. Header row styling (new)

There is now a first‑class way to style the main header row.

```ts
headerRowCfg: {
  styleCfg: {
    style: StyleBuilder.Row.builder().background('#eee').fontWeight(FontWeight.BOLDER),
    class: 'my-header',
  },
},
```

(Static only — the header has no per‑row data. Use a raw string if you prefer: `style: 'background:#eee; font-weight:bolder;'`.)

---

## Style precedence (body rows)

For a body row the inline style is composed as: **base (`styleCfg.style`) → hover overlay (`hoverCfg.styleCfg`) → highlight overlay (`clickCfg.highlightClicked`)**. Later layers win per CSS property, so a clicked‑and‑hovered row shows the highlight on top of the hover on top of the base.

---

## Migration checklist

- [ ] Move `clickCfg: {…}` from the table root to `bodyRowCfg.clickCfg`.
- [ ] Move `clickCfg.pointer` to `bodyRowCfg.hoverCfg.pointer`.
- [ ] If you relied on the default grey hover background, add `hoverCfg.styleCfg.style` with your background.
- [ ] Convert every `DecorStyles` object (`highlightClicked`, `rowStyleCfg.style` returns) to `StyleBuilder.Row` (or a raw CSS string).
- [ ] Rename `rowStyleCfg` → `bodyRowCfg.styleCfg`; have its `style` hook return `''` instead of `{}` for "no style".
- [ ] Replace `totalRowCfg.totalRowView.style` with `totalRowCfg.styleCfg.style`; drop the trailing `.build()`.
- [ ] Remove any `import { DecorStyles }` / `import { TotalRowView }`.
- [ ] (Optional) Add `headerRowCfg.styleCfg` to style the header.
- [ ] (Optional) Use a `(totals, data) => …` function in `totalRowCfg.styleCfg` for value‑driven total styling.

See `changelog/19.0.20.md` for the release summary, and the demo apps under `projects/aur-demo/src/app/` (`table-highlight-clicked-row`, `table-with-row-style`, `table-with-total`, `table-expanding-row`) for working examples.
