# Unify Row Config & Styling on StyleBuilder.Row — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split `DecorStyles`/`StyleBuilder.Row` styling models and scattered row config with one `StyleBuilder.Row` primitive and a uniform `headerRowCfg` / `bodyRowCfg` / `totalRowCfg` trio (each with a `styleCfg`), folding `clickCfg` + a new `hoverCfg` under `bodyRowCfg`, and adding value-driven total styling.

**Architecture:** `StyleBuilder.Row` gains `overrideWith()` (per-field merge) + a `color` getter (introspection). `model/ColumnConfig.ts` is restructured into the row-kind trio. The component resolves every style hook once per refresh into CSS strings, applies body styles via `[style]`, layers hover and highlight overlays through one `mergeStyle` helper, and tracks `hovered` via `(mouseenter)/(mouseleave)`. This is a coordinated **BREAKING** change: the library source (types, factory, provider, component, template, scss, lib specs) changes atomically, then demos and docs follow.

**Tech Stack:** Angular 19, Angular Material 18, TypeScript 5.8, Karma + Jasmine. Library project: `ngx-aur-mat-table`. Demo app: `aur-demo`.

**Spec:** `docs/superpowers/specs/2026-06-04-unify-row-styling-on-builder-design.md`

**Commands:**
- Lib unit tests: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
- Lib build: `ng build ngx-aur-mat-table`
- Demo build: `ng build aur-demo`
- To focus a single suite in Karma, temporarily change `describe(` → `fdescribe(` / `it(` → `fit(` and revert before committing.

**Note on atomicity:** Tasks 2–8 form one breaking change to the library and do **not** compile individually until Task 8 (build + tests + single commit). Implement them in order, then verify and commit once at Task 8. Task 1 (StyleBuilder) and Tasks 9–11 (demos/docs) each compile and commit on their own.

---

## Task 1: `StyleBuilder.Row` — `color` getter + `overrideWith()`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/style-builder/style-builder.ts`
- Test (create): `projects/ngx-aur-mat-table/src/lib/style-builder/style-builder.spec.ts`

**Naming note:** the introspection accessor must be `colorValue`, NOT `color` — `Row` already has a `color(c: string): Row` **setter method**, and a class cannot have both a method and a getter named `color`.

- [ ] **Step 1: Write the failing test**

Create `projects/ngx-aur-mat-table/src/lib/style-builder/style-builder.spec.ts`:

```ts
import { StyleBuilder } from './style-builder';
import Row = StyleBuilder.Row;
import FontWeight = StyleBuilder.FontWeight;

describe('StyleBuilder.Row', () => {
  it('exposes the configured color via colorValue, empty string when unset', () => {
    expect(Row.builder().color('red').colorValue).toBe('red');
    expect(Row.builder().background('blue').colorValue).toBe('');
  });

  it('overrideWith lets the overlay win per field and preserves base-only fields', () => {
    const base = Row.builder().color('red').fontWeight(FontWeight.BOLD);
    const overlay = Row.builder().background('yellow').color('green');
    const css = base.overrideWith(overlay).build();
    // color overridden by overlay, font-weight kept from base, background added by overlay
    expect(css).toContain('color: green;');
    expect(css).toContain('font-weight: bold;');
    expect(css).toContain('background: yellow;');
    expect(css).not.toContain('color: red;');
  });

  it('overrideWith does not mutate the operands', () => {
    const base = Row.builder().color('red');
    const overlay = Row.builder().color('green');
    base.overrideWith(overlay);
    expect(base.colorValue).toBe('red');
    expect(overlay.colorValue).toBe('green');
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Property 'colorValue' does not exist` / `overrideWith is not a function` (compile or runtime failure).

- [ ] **Step 3: Add the getter and method**

In `style-builder.ts`, inside `export class Row { ... }`, after the existing `fontWeight(...)` method and before `build()`, add:

```ts
    /** configured text color ('' if unset) — used to toggle `.new-color` */
    get colorValue(): string {
      return this._color;
    }

    overrideWith(o: Row): Row {
      const r = new Row();
      r._background = o._background || this._background;
      r._color      = o._color      || this._color;
      r._border     = o._border     || this._border;
      r._fontWeight = o._fontWeight || this._fontWeight;
      return r;
    }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS for the three `StyleBuilder.Row` specs (existing suites still pass).

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/style-builder/style-builder.ts projects/ngx-aur-mat-table/src/lib/style-builder/style-builder.spec.ts
git commit -m "feat(style-builder): add Row.colorValue getter and overrideWith()"
```

---

## Task 2: Restructure `model/ColumnConfig.ts` (types)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`

Part of the atomic library change — does not compile until Task 8. No commit here.

- [ ] **Step 1: Add the StyleBuilder import**

At the top of `ColumnConfig.ts`, below the existing imports (`TableRow`, `AurDragDropManager`), add:

```ts
import {StyleBuilder} from "../style-builder/style-builder";
```

- [ ] **Step 2: Update `TableConfig<T>` fields**

In `interface TableConfig<T>`:
- **Delete** the line `clickCfg?: ClickConfig,`
- **Change** `totalRowCfg?: TotalRowConfig,` → `totalRowCfg?: TotalRowConfig<T>,`
- **Replace** the line `rowStyleCfg?: RowStyleConfig<T>` with:

```ts
  headerRowCfg?: HeaderRowConfig,
  bodyRowCfg?: BodyRowConfig<T>,
```

- [ ] **Step 3: Replace `ClickConfig` (remove `pointer`) and add hover interfaces**

Replace the whole existing `export interface ClickConfig { ... }` block with:

```ts
export interface ClickConfig {
  /** highlight style applied to the clicked/highlighted row; pointer moved to HoverConfig */
  highlightClicked?: StyleBuilder.Row | string;

  /**
   * default false
   * false: first and second click both emit this row; selection is not cleared.
   * true: first click emits this row, second click emits undefined; first selects, second deselects.
   */
  cancelable?: boolean;
}

export interface HoverConfig {
  /** master switch for the hover overlay; treated as true when hoverCfg is present and this is not false */
  enable?: boolean;
  /** show cursor: pointer on the body row */
  pointer?: boolean;
  /** style/class applied while the row is hovered (overlay, like highlight) */
  styleCfg?: HoverStyleConfig;
}

export interface HoverStyleConfig {
  class?: string;
  style?: StyleBuilder.Row | string;
}
```

- [ ] **Step 4: Delete `DecorStyles`, replace `RowStyleConfig` with the row-kind trio**

**Delete** the entire `export interface DecorStyles { ... }` block.

**Replace** the existing `export interface RowStyleConfig<T> { ... }` block with:

```ts
export interface HeaderRowConfig {
  styleCfg?: HeaderStyleConfig;
}

export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig;
  hoverCfg?: HoverConfig;
  styleCfg?: BodyStyleConfig<T>;
}

export interface HeaderStyleConfig {
  /** CSS class(es) on the main header <tr>. */
  class?: string;
  /** Inline style; a StyleBuilder.Row (built/un-built) or a raw CSS string. */
  style?: StyleBuilder.Row | string;
}

export interface BodyStyleConfig<T> {
  /** CSS class(es) on the body <tr mat-row>; space-separated allowed, e.g. 'total not-hover'. */
  class?: (row: TableRow<T>) => string | null;
  /** Inline style for the body <tr>; a StyleBuilder.Row or a raw CSS string. */
  style?: (row: TableRow<T>) => StyleBuilder.Row | string;
}

/** static value OR a function of the computed totals + source rows */
export type TotalHook<T, R> = R | ((totals: Map<string, any>, data: TableRow<T>[]) => R);

export interface TotalStyleConfig<T> {
  class?: TotalHook<T, string | null>;
  style?: TotalHook<T, StyleBuilder.Row | string>;
}
```

- [ ] **Step 5: Delete `TotalRowView`, make `TotalRowConfig` generic with `styleCfg`**

**Delete** the `export interface TotalRowView { ... }` block.

**Replace** the existing `export interface TotalRowConfig { ... }` block with:

```ts
export interface TotalRowConfig<T> {
  enable: boolean;
  styleCfg?: TotalStyleConfig<T>;
}
```

---

## Task 3: `model/RowStyleFactory.ts` + spec

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts`

Part of the atomic library change — verified at Task 8. No standalone commit.

- [ ] **Step 1: Rewrite `RowStyleFactory.ts`**

Replace the entire file contents with:

```ts
import {TableRow} from "./TableRow";
import {TableConfig} from "./ColumnConfig";
import {StyleBuilder} from "../style-builder/style-builder";

export interface ResolvedRowStyle {
  class: string | null;
  style: StyleBuilder.Row | string | null;
}

export class RowStyleFactory {

  /**
   * Resolves bodyRowCfg.styleCfg into a per-row array indexed by row.id.
   * Returns an empty array when the hook is not configured. Styles are kept raw
   * (un-built StyleBuilder.Row | string) so the component can overrideWith()/build() at render time.
   */
  public static toRowStyles<T>(rows: TableRow<T>[], tableConfig: TableConfig<T>): ResolvedRowStyle[] {
    const cfg = tableConfig.bodyRowCfg?.styleCfg;
    if (!cfg || (!cfg.class && !cfg.style)) {
      return [];
    }
    return rows.map(row => ({
      class: cfg.class ? cfg.class(row) : null,
      style: cfg.style ? cfg.style(row) : null,
    }));
  }
}
```

- [ ] **Step 2: Rewrite `RowStyleFactory.spec.ts`**

Replace the entire file contents with:

```ts
import {RowStyleFactory} from './RowStyleFactory';
import {TableRow} from './TableRow';
import {TableConfig} from './ColumnConfig';
import {StyleBuilder} from '../style-builder/style-builder';

interface Row { name: string; bold?: boolean; }

function rows(...data: Row[]): TableRow<Row>[] {
  return data.map((d, i) => new TableRow<Row>(i, d));
}

function baseCfg(): TableConfig<Row> {
  return { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
}

describe('RowStyleFactory', () => {

  it('returns [] when bodyRowCfg.styleCfg is absent', () => {
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), baseCfg())).toEqual([]);
  });

  it('returns [] when styleCfg has neither class nor style', () => {
    const cfg: TableConfig<Row> = { ...baseCfg(), bodyRowCfg: { styleCfg: {} } };
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), cfg)).toEqual([]);
  });

  it('resolves the class hook per row, with null style', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      bodyRowCfg: { styleCfg: { class: r => r.rowSrc.bold ? 'total not-hover' : null } },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ class: 'total not-hover', style: null });
    expect(result[1]).toEqual({ class: null, style: null });
  });

  it('keeps the style hook result raw (un-built builder), with null class', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      bodyRowCfg: { styleCfg: { style: r => r.rowSrc.bold ? StyleBuilder.Row.builder().fontWeight(StyleBuilder.FontWeight.BOLD) : '' } },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result[0].class).toBeNull();
    expect(result[0].style instanceof StyleBuilder.Row).toBeTrue();
    expect((result[0].style as StyleBuilder.Row).build()).toContain('font-weight: bold;');
    expect(result[1].style).toBe('');
  });

  it('aligns result order/length with row.id', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      bodyRowCfg: { styleCfg: { style: r => `color: c${r.id}` } },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a' }, { name: 'b' }, { name: 'c' }), cfg);
    expect(result.length).toBe(3);
    expect(result[0].style).toBe('color: c0');
    expect(result[2].style).toBe('color: c2');
  });
});
```

---

## Task 4: `providers/TotalRowProvider.ts` — drop legacy style

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/TotalRowProvider.ts`

Part of the atomic library change — verified at Task 8.

- [ ] **Step 1: Remove the `style` field and `setStyle()` method**

In `class TotalRowProvider<T>`:
- Delete the field line `style: string | undefined;`
- Delete the whole `setStyle(): TotalRowProvider<T> { ... }` method.

The `setTotalRow()`, `create()`, and `canEnable()` members stay unchanged. `create()` keeps reading `tableConfig.totalRowCfg?.enable ?? true`.

(No reference to `TotalRowView` exists here, so nothing else changes. `TotalRowProviderDummy` had no `setStyle` override — leave it.)

---

## Task 5: `ngx-aur-mat-table.component.ts` — helpers, hover, resolution

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

Part of the atomic library change — verified at Task 8.

- [ ] **Step 1: Fix the import**

Change line 21 from:

```ts
import {ColumnView, DecorStyles, TableConfig} from './model/ColumnConfig';
```

to:

```ts
import {ColumnView, TableConfig} from './model/ColumnConfig';
import {StyleBuilder} from './style-builder/style-builder';
```

- [ ] **Step 2: Add the `hovered` field**

Next to the existing `highlighted` field declaration (search for `highlighted`), add:

```ts
  hovered: TableRow<T> | null = null;
```

- [ ] **Step 3: Replace `decorToCss` / `rowNgStyle` / `rowNgClass` with the new helpers**

Replace the existing block (the `private decorToCss(...)`, `rowNgStyle(...)`, and `rowNgClass(...)` methods — currently around lines 572–603) with:

```ts
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
    if (base == null) return this.toCss(overlay);
    if (overlay == null) return this.toCss(base);
    if (base instanceof StyleBuilder.Row && overlay instanceof StyleBuilder.Row) {
      return base.overrideWith(overlay).build();
    }
    return `${this.toCss(base) ?? ''} ${this.toCss(overlay) ?? ''}`.trim();
  }

  /** total hook: static value or (totals, data) => value. */
  private resolveTotal<R>(
    v: R | ((t: Map<string, any>, d: TableRow<T>[]) => R) | undefined,
    totals: Map<string, any>, data: TableRow<T>[],
  ): R | undefined {
    return typeof v === 'function' ? (v as any)(totals, data) : v;
  }

  private hoverActive(row: TableRow<T>): boolean {
    const h = this.tableConfig.bodyRowCfg?.hoverCfg;
    return this.hovered === row && h?.enable !== false;
  }

  onRowEnter(row: TableRow<T>) { this.hovered = row; }
  onRowLeave(row: TableRow<T>) { if (this.hovered === row) this.hovered = null; }

  /** [style] for the body <tr>: base -> hover overlay -> highlight overlay (highlight wins). */
  rowStyle(row: TableRow<T>): string | null {
    let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
    if (this.hoverActive(row)) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style ?? null);
    }
    if (this.highlighted === row.rowSrc) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.clickCfg?.highlightClicked ?? null);
    }
    return this.toCss(acc);
  }

  rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
    const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
    const hl = this.tableConfig.bodyRowCfg?.clickCfg?.highlightClicked;
    const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.colorValue : !!hl;
    const cls: { [klass: string]: boolean } = {
      'pointer': hover?.pointer || false,
      'new-color': this.highlighted === row.rowSrc && hlHasColor,
    };
    const custom = this.rowStyles[row.id]?.class;
    if (custom) cls[custom] = true;
    const hcls = this.hoverActive(row) ? hover?.styleCfg?.class : null;
    if (hcls) cls[hcls] = true;
    return cls;
  }
```

- [ ] **Step 4: Update `rowClick` to read the relocated `cancelable`**

In `rowClick(row)` (around line 605–609), change every `this.tableConfig.clickCfg?.cancelable` to `this.tableConfig.bodyRowCfg?.clickCfg?.cancelable`.

- [ ] **Step 5: Drop `.setStyle()` from the total provider chain**

Change the chain (around lines 377–379):

```ts
    this.totalRowProvider = TotalRowProvider.create(this.tableConfig, this.tableDataSource)
      .setStyle()
      .setTotalRow();
```

to:

```ts
    this.totalRowProvider = TotalRowProvider.create(this.tableConfig, this.tableDataSource)
      .setTotalRow();
```

- [ ] **Step 6: Resolve header & total style fields**

Add four fields next to `rowStyles` (the `private rowStyles: ResolvedRowStyle[] = [];` line, ~106):

```ts
  _headerStyle: string | null = null;
  _headerClass: string | null = null;
  _totalStyle: string | null = null;
  _totalClass: string | null = null;
```

In `initTable()` (the method starting ~407), after the existing `this.rowStyles = RowStyleFactory.toRowStyles(...)` line, add the header resolution:

```ts
    this._headerStyle = this.toCss(this.tableConfig.headerRowCfg?.styleCfg?.style);
    this._headerClass = this.tableConfig.headerRowCfg?.styleCfg?.class ?? null;
```

In the method that builds `this.totalRowProvider` (the one containing the chain edited in Step 5), immediately **after** the `.setTotalRow();` assignment, add:

```ts
    const _totals = this.totalRowProvider.totals;
    const _data = this.tableDataSource.data;
    const _sc = this.tableConfig.totalRowCfg?.styleCfg;
    this._totalStyle = this.toCss(this.resolveTotal(_sc?.style, _totals, _data) ?? null);
    this._totalClass = this.resolveTotal(_sc?.class, _totals, _data) ?? null;
```

---

## Task 6: Template + SCSS

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss`

Part of the atomic library change — verified at Task 8.

- [ ] **Step 1: Header row binding**

Find the main header row (`<tr mat-header-row *matHeaderRowDef="_displayColumns;  sticky: this.tableConfig.stickyCfg?.header">`, ~L333) and add bindings:

```html
        <tr mat-header-row *matHeaderRowDef="_displayColumns;  sticky: this.tableConfig.stickyCfg?.header"
            [style]="_headerStyle" [ngClass]="_headerClass">
        </tr>
```

- [ ] **Step 2: Body row binding + hover tracking**

Replace the body row (`<tr mat-row #rowLink ...>`, ~L343–350) with:

```html
        <tr mat-row #rowLink
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event, row)"
            *matRowDef="let row; columns: _displayColumns;"
            (click)="rowClick(row)"
            (mouseenter)="onRowEnter(row)"
            (mouseleave)="onRowLeave(row)"
            [ngClass]="rowNgClass(row)"
            [style]="rowStyle(row)">
        </tr>
```

- [ ] **Step 3: Total/footer row binding**

Replace the total footer row (`<tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total" [style]="totalRowProvider.style"></tr>`, ~L379–380) with:

```html
          <tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
              [style]="_totalStyle" [ngClass]="_totalClass"></tr>
```

- [ ] **Step 4: SCSS — drop the hardcoded hover background**

In `ngx-aur-mat-table.component.scss`, replace:

```scss
.aur-mat-table .pointer:hover {
  background-color: #f2f2f2;
  cursor: pointer;
}
```

with:

```scss
.aur-mat-table .pointer {
  cursor: pointer;
}
```

---

## Task 7: Rewrite the component row-styling spec

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts`

Part of the atomic library change — verified at Task 8.

- [ ] **Step 1: Replace the entire spec file**

The old spec calls `rowNgStyle` (removed) and uses root `clickCfg`/`rowStyleCfg` with `DecorStyles` objects. Replace the whole file with:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { StyleBuilder } from './style-builder/style-builder';
import Row = StyleBuilder.Row;
import FontWeight = StyleBuilder.FontWeight;

interface R { name: string; bold?: boolean; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: {
      clickCfg: { highlightClicked: Row.builder().background('yellow') },
      hoverCfg: { pointer: true, styleCfg: { style: Row.builder().background('#eee'), class: 'hovering' } },
      styleCfg: {
        style: r => r.rowSrc.bold ? Row.builder().fontWeight(FontWeight.BOLD).color('black') : '',
        class: r => r.rowSrc.bold ? 'total not-hover' : null,
      },
    },
  };
  data: R[] = [{ name: 'a', bold: true }, { name: 'b' }];
}

describe('NgxAurMatTable bodyRowCfg', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('applies the style hook to the bold row only (as a CSS string)', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowStyle(boldRow)).toContain('font-weight: bold;');
    expect(host.table.rowStyle(boldRow)).toContain('color: black;');
    expect(host.table.rowStyle(plainRow)).toBe('');
  });

  it('applies the class hook to the bold row, alongside pointer (from hoverCfg)', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgClass(boldRow)['total not-hover']).toBeTrue();
    expect(host.table.rowNgClass(boldRow)['pointer']).toBeTrue();
    expect(host.table.rowNgClass(plainRow)['total not-hover']).toBeUndefined();
    expect(host.table.rowNgClass(plainRow)['pointer']).toBeTrue();
  });

  it('layers the highlight overlay over the base per-property on the highlighted row', () => {
    const [boldRow] = host.table.tableDataSource.data;
    host.table.highlighted = boldRow.rowSrc;
    const style = host.table.rowStyle(boldRow)!;
    expect(style).toContain('background: yellow;'); // from highlightClicked
    expect(style).toContain('font-weight: bold;');  // base preserved
  });

  it('applies the hover overlay (style + class) only while the row is hovered', () => {
    const [, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowStyle(plainRow)).toBe('');
    expect(host.table.rowNgClass(plainRow)['hovering']).toBeUndefined();

    host.table.onRowEnter(plainRow);
    expect(host.table.rowStyle(plainRow)).toContain('background: #eee;');
    expect(host.table.rowNgClass(plainRow)['hovering']).toBeTrue();

    host.table.onRowLeave(plainRow);
    expect(host.table.rowStyle(plainRow)).toBe('');
    expect(host.table.rowNgClass(plainRow)['hovering']).toBeUndefined();
  });

  it('renders the inline font-weight on the bold row <tr>', () => {
    const rowEls = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLElement>;
    expect(rowEls.length).toBe(2);
    expect(rowEls[0].style.fontWeight).toBe('bold');
    expect(rowEls[1].style.fontWeight).toBe('');
  });
});

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HeaderTotalHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
    headerRowCfg: { styleCfg: { style: Row.builder().background('#ddd'), class: 'hdr' } },
    totalRowCfg: {
      enable: true,
      styleCfg: {
        style: totals => totals.get('name') >= 2 ? Row.builder().color('green') : Row.builder().color('red'),
        class: totals => totals.get('name') >= 2 ? 'many' : 'few',
      },
    },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable headerRowCfg / totalRowCfg', () => {
  let fixture: ComponentFixture<HeaderTotalHostComponent>;
  let host: HeaderTotalHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HeaderTotalHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderTotalHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('resolves the static header style/class', () => {
    expect(host.table._headerStyle).toContain('background: #ddd;');
    expect(host.table._headerClass).toBe('hdr');
  });

  it('resolves the value-driven total style/class from the totals map', () => {
    expect(host.table._totalStyle).toContain('color: green;'); // 2 rows -> 'many'
    expect(host.table._totalClass).toBe('many');
  });
});

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PlainHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable no row cfg (back-compat)', () => {
  let fixture: ComponentFixture<PlainHostComponent>;
  let host: PlainHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PlainHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PlainHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('produces null inline style and only the default classes', () => {
    const [row] = host.table.tableDataSource.data;
    expect(host.table.rowStyle(row)).toBeNull();
    expect(host.table.rowNgClass(row)).toEqual({ 'pointer': false, 'new-color': false });
    expect(host.table._headerStyle).toBeNull();
    expect(host.table._totalStyle).toBeNull();
  });
});
```

---

## Task 8: Build the library, run all lib tests, commit the atomic change

**Files:** none new — verification + commit for Tasks 2–8.

- [ ] **Step 1: Build the library**

Run: `ng build ngx-aur-mat-table`
Expected: build SUCCESS (no TS errors). If errors mention `DecorStyles`, `rowStyleCfg`, `clickCfg`, `TotalRowView`, or `setStyle`, fix the offending reference in the file named — every such reference is covered by Tasks 2–7.

- [ ] **Step 2: Run the library unit tests**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — `StyleBuilder.Row`, `RowStyleFactory`, `NgxAurMatTable bodyRowCfg`, `headerRowCfg / totalRowCfg`, and back-compat suites all green.

- [ ] **Step 3: Commit the library change**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
  projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts \
  projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts \
  projects/ngx-aur-mat-table/src/lib/providers/TotalRowProvider.ts \
  projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
  projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
  projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss \
  projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts
git commit -m "feat!: unify row config & styling on StyleBuilder.Row

BREAKING CHANGE: remove DecorStyles and totalRowView; introduce
headerRowCfg/bodyRowCfg/totalRowCfg trio with styleCfg; move clickCfg
and pointer (as hoverCfg) and rowStyleCfg under bodyRowCfg; value-driven
total styling; configurable hover overlay."
```

---

## Task 9: Migrate the click/highlight demos

**Files:**
- Modify: `projects/aur-demo/src/app/table-highlight-clicked-row/table-highlight-clicked-row.component.ts`
- Modify: `projects/aur-demo/src/app/table-with-sub-footer/table-with-sub-footer.component.ts`
- Modify: `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.ts`

- [ ] **Step 1: `table-highlight-clicked-row.component.ts`**

Add the import and replace the root `clickCfg` block. Update the imports line to:

```ts
import {HighlightContainer, StyleBuilder, TableConfig} from "ngx-aur-mat-table";
```

Replace the `clickCfg: { ... }` block inside `tableConfig` with:

```ts
    bodyRowCfg: {
      clickCfg: {
        highlightClicked: StyleBuilder.Row.builder()
          .background('blue').color('red')
          .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
        cancelable: true,
      },
      hoverCfg: { pointer: true },
    },
```

- [ ] **Step 2: `table-with-sub-footer.component.ts`**

Change the imports line to `import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";` and replace the `clickCfg: { ... }` block with:

```ts
    bodyRowCfg: {
      clickCfg: {
        highlightClicked: StyleBuilder.Row.builder()
          .background('blue').color('red')
          .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
        cancelable: true,
      },
      hoverCfg: { pointer: true },
    },
```

- [ ] **Step 3: `expanding-row.component.ts`**

Change the imports line to `import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";` and replace the `clickCfg: { ... }` block (keep the sibling `indexCfg` block) with the same `bodyRowCfg` block as Step 2.

- [ ] **Step 4: Commit**

```bash
git add projects/aur-demo/src/app/table-highlight-clicked-row/table-highlight-clicked-row.component.ts \
  projects/aur-demo/src/app/table-with-sub-footer/table-with-sub-footer.component.ts \
  projects/aur-demo/src/app/table-expanding-row/expanding-row.component.ts
git commit -m "refactor(demo): move clickCfg/pointer under bodyRowCfg with StyleBuilder.Row"
```

---

## Task 10: Migrate the row-style and total demos

**Files:**
- Modify: `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.ts`
- Modify: `projects/aur-demo/src/app/table-with-total/table-with-total.component.ts`

- [ ] **Step 1: `table-with-row-style.component.ts`**

Replace the whole file with:

```ts
import { Component } from '@angular/core';
import { StyleBuilder, TableConfig, TableRow } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';
import FontWeight = StyleBuilder.FontWeight;

@Component({
  selector: 'app-table-with-row-style',
  templateUrl: './table-with-row-style.component.html',
  styleUrls: ['./table-with-row-style.component.scss'],
  standalone: false,
})
export class TableWithRowStyleComponent {

  /** every 5th row is treated as a bold "subtotal" row */
  private isSubtotal = (row: TableRow<Customer>): boolean => row.id % 5 === 4;

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'name', key: 'name', valueConverter: v => v.name },
      { name: 'age', key: 'age', valueConverter: v => v.age },
    ],
    bodyRowCfg: {
      hoverCfg: {
        pointer: true,
        styleCfg: { style: StyleBuilder.Row.builder().background('#eef') }, // custom hover bg
      },
      styleCfg: {
        style: row => this.isSubtotal(row)
          ? StyleBuilder.Row.builder().fontWeight(FontWeight.BOLD).background('#fafafa')
          : '',
        class: row => this.isSubtotal(row) ? 'subtotal not-hover' : null,
      },
    },
  };

  tableData: Customer[] = CustomerGenerator.generate(23);
}
```

- [ ] **Step 2: `table-with-total.component.ts`**

Replace the whole file with:

```ts
import {Component} from '@angular/core';

import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";
import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";
import BorderStyle = StyleBuilder.BorderStyle;
import FontWeight = StyleBuilder.FontWeight;

@Component({
    selector: 'app-table-with-total',
    templateUrl: './table-with-total.component.html',
    styleUrls: ['./table-with-total.component.scss'],
    standalone: false
})
export class TableWithTotalComponent {
  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      {
        name: 'customers name',
        key: 'name',
        valueConverter: v => v.name,
        totalConverter: v => v.length
      },
      {
        name: 'customers age',
        key: 'age',
        valueConverter: v => v.age,
        totalConverter: v => v.map(v => v.rowSrc.age).reduce((sum, age) => sum + age, 0)
      }
    ],
    headerRowCfg: {
      styleCfg: {
        style: StyleBuilder.Row.builder().background('#eee').fontWeight(FontWeight.BOLDER)
      }
    },
    totalRowCfg: {
      enable: true,
      styleCfg: {
        // value-driven: red when the summed age is below the threshold, else the default look
        style: totals => StyleBuilder.Row.builder()
          .color(totals.get('age') < 100 ? 'red' : 'blue')
          .background('lightgray')
          .border(borderBuilder => borderBuilder.top('3px', BorderStyle.SOLID, 'RED'))
          .fontWeight(FontWeight.BOLDER)
      }
    }
  }
  tableData: Customer[] = CustomerGenerator.generate(10);
}
```

- [ ] **Step 3: Build the demo app**

Run: `ng build aur-demo`
Expected: build SUCCESS. If it fails on any other file still referencing root `clickCfg` / `rowStyleCfg` / `totalRowView` / `DecorStyles`, fix that file the same way (move click under `bodyRowCfg.clickCfg`, pointer under `hoverCfg`, style hooks to `StyleBuilder.Row`).

- [ ] **Step 4: Commit**

```bash
git add projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.ts \
  projects/aur-demo/src/app/table-with-total/table-with-total.component.ts
git commit -m "refactor(demo): migrate row-style and total demos to bodyRowCfg/totalRowCfg.styleCfg"
```

---

## Task 11: Docs — README, changelog, version bump

**Files:**
- Modify: `README.md`
- Create: `changelog/19.0.20.md`
- Modify: `projects/ngx-aur-mat-table/package.json`

- [ ] **Step 1: Confirm the next version**

Run: `git --no-pager log --oneline -5 -- changelog`
Inspect existing files: `changelog/19.0.19.md` is the latest. Use **`19.0.20`** as the next version (adjust if a newer changelog file already exists).

- [ ] **Step 2: Create `changelog/19.0.20.md`**

```markdown
# 19.0.20

## BREAKING — unified row config & styling on StyleBuilder.Row

- Removed `DecorStyles` and `totalRowCfg.totalRowView` (and `TotalRowProvider.style` / `setStyle`).
- New uniform row-kind trio, each with a `styleCfg`:
  - `headerRowCfg: { styleCfg: { class?, style? } }`
  - `bodyRowCfg: { clickCfg?, hoverCfg?, styleCfg? }`
  - `totalRowCfg: { enable, styleCfg? }`
- `clickCfg` moved from the table root into `bodyRowCfg.clickCfg`; `pointer` moved out of `clickCfg` into the new `bodyRowCfg.hoverCfg`; `rowStyleCfg` renamed/moved to `bodyRowCfg.styleCfg`.
- All `style` hooks now take `StyleBuilder.Row | string` (typed builder or raw CSS string). `highlightClicked` likewise.
- `totalRowCfg.styleCfg.style`/`class` can be static **or** a function of `(totals, data)` (value-driven total styling).
- New `hoverCfg` with `enable` / `pointer` / `styleCfg` — configurable hover overlay applied via mouse-enter/leave; the hardcoded `#f2f2f2` hover background is removed.
- `StyleBuilder.Row` gains `overrideWith(other)` and a `colorValue` getter.

### Migration

```ts
// before
clickCfg: { pointer: true, highlightClicked: { background: 'blue', color: 'red' }, cancelable: true },
rowStyleCfg: { style: r => r.rowSrc.bold ? { fontWeight: 'bold' } : {} },
totalRowCfg: { enable: true, totalRowView: { style: StyleBuilder.Row.builder().color('blue').build() } },

// after
bodyRowCfg: {
  clickCfg: { highlightClicked: StyleBuilder.Row.builder().background('blue').color('red'), cancelable: true },
  hoverCfg: { pointer: true },
  styleCfg: { style: r => r.rowSrc.bold ? StyleBuilder.Row.builder().fontWeight(StyleBuilder.FontWeight.BOLD) : '' },
},
totalRowCfg: { enable: true, styleCfg: { style: StyleBuilder.Row.builder().color('blue') } },
```
```

- [ ] **Step 3: Bump the library version**

In `projects/ngx-aur-mat-table/package.json`, set `"version"` to `"19.0.20"`.

- [ ] **Step 4: Update README**

Open `README.md`, find the existing per-row styling / `DecorStyles` / `clickCfg` documentation, and replace it with a single section titled **"Row config & styling"** documenting: the `headerRowCfg` / `bodyRowCfg` / `totalRowCfg` trio; the uniform `styleCfg`; `bodyRowCfg.clickCfg` (`highlightClicked`, `cancelable`) and `bodyRowCfg.hoverCfg` (`enable`, `pointer`, `styleCfg`); value-driven total via `(totals, data) =>`; and that `style` accepts a `StyleBuilder.Row` or a raw CSS string. Use the migration example from Step 2 as the code sample. (Grep the README for `DecorStyles`, `rowStyleCfg`, `clickCfg`, `totalRowView` to find every spot to update.)

- [ ] **Step 5: Commit**

```bash
git add README.md changelog/19.0.20.md projects/ngx-aur-mat-table/package.json
git commit -m "docs: document unified row config & styling; bump to 19.0.20"
```

---

## Self-Review checklist (run before handing off)

- [ ] Spec coverage: StyleBuilder upgrades (T1), ColumnConfig trio + clickCfg/hoverCfg/styleCfg (T2), factory (T3), provider (T4), component helpers + hover + total resolution (T5), template + scss (T6), lib specs incl. hover & value-driven total (T7), build/test (T8), all five demos (T9–T10), README + changelog + version (T11). No spec section left without a task.
- [ ] Type consistency: `colorValue` getter (not `color`) used in T5 `rowNgClass` and T1/T7 tests; `overrideWith` in T1/T5; `BodyStyleConfig`/`HeaderStyleConfig`/`TotalStyleConfig`/`TotalHook`/`HoverConfig`/`HoverStyleConfig` names match between T2 and their consumers; `_headerStyle`/`_headerClass`/`_totalStyle`/`_totalClass` fields (T5) match template bindings (T6) and tests (T7); `hovered`/`onRowEnter`/`onRowLeave`/`hoverActive`/`rowStyle`/`mergeStyle`/`toCss`/`resolveTotal` names consistent across T5/T6/T7.
- [ ] No placeholders: every code step shows full code; demo migrations show concrete builder calls.
```
