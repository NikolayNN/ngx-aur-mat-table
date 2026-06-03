# Per-row style hook (`rowStyleCfg`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-row decoration hook `rowStyleCfg` to `TableConfig` that applies a CSS class and/or inline style to each body `<tr mat-row>` from row data, and extend `DecorStyles` with `fontWeight`.

**Architecture:** A new internal `RowStyleFactory` resolves the hook **once per data refresh** into a per-row array indexed by `row.id` (mirroring `TableViewFactory` for `valueView`). The component stores it in a `rowStyles` field and exposes two O(1) template helpers (`rowNgClass`/`rowNgStyle`) that fold the precomputed base together with the existing `clickCfg.pointer` / `highlightClicked` logic. The `<tr mat-row>` swaps its inline object-literals for those helpers. Fully additive.

**Tech Stack:** Angular 19 (library + demo app), Angular Material 18, TypeScript 5.8, Karma + Jasmine.

---

## Pre-flight

- Work continues on branch **`feat/row-style-hook`** (already created; the design spec is already committed there: `docs/superpowers/specs/2026-06-03-row-style-hook-design.md`).
- **Spec reference:** read `docs/superpowers/specs/2026-06-03-row-style-hook-design.md` for the full design rationale.

## Commands & conventions

- **Run library unit tests (single shot):**
  `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
  - Karma compiles **all** `*.spec.ts` in the library into one bundle, so a TDD "fail" step typically appears as a **TypeScript compilation error** (referenced symbol/file does not exist yet), not a red assertion. That is the expected failure.
  - The repo's karma default browser is `Chrome`. If `ChromeHeadless` is unavailable in your environment, use `--browsers=Chrome` instead.
- **Build the library:** `npx ng build ngx-aur-mat-table`
- **Build the demo app (compile check):** `npx ng build aur-demo --configuration development`
- **Visual demo check (optional):** `npx ng serve` → open the "Row style" tab.
- **Commit trailer:** every commit message ends with the Co-Authored-By line shown in each Commit step.

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` | Modify | Add `DecorStyles.fontWeight`, `RowStyleConfig<T>`, `TableConfig.rowStyleCfg` |
| `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts` | Create | Resolve `rowStyleCfg` into `ResolvedRowStyle[]` indexed by `row.id` |
| `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts` | Create | Unit tests for the factory (pure, no TestBed) |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` | Modify | `rowStyles` field, populate in `initTable()`, `decorToCss`/`rowNgStyle`/`rowNgClass` helpers |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` | Modify | `<tr mat-row>` → `[ngClass]="rowNgClass(row)"` / `[ngStyle]="rowNgStyle(row)"` |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts` | Create | Component merge/precedence + render tests (TestBed host) |
| `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.ts` | Create | Demo: bold "subtotal" rows |
| `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.html` | Create | Demo template |
| `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.scss` | Create | Demo styles (shows `::ng-deep` for the class hook) |
| `projects/aur-demo/src/app/app.module.ts` | Modify | Declare the demo component |
| `projects/aur-demo/src/app/app.component.html` | Modify | Add a "Row style" tab |
| `changelog/19.0.19.md` | Create | Changelog entry (Russian, matching house style) |
| `projects/ngx-aur-mat-table/package.json` | Modify | Version bump |
| `README.md` | Modify | New "Per-row styling" section |

---

### Task 1: Types + `RowStyleFactory`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts`
- Test: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts`:

```ts
import {RowStyleFactory} from './RowStyleFactory';
import {TableRow} from './TableRow';
import {TableConfig} from './ColumnConfig';

interface Row { name: string; bold?: boolean; }

function rows(...data: Row[]): TableRow<Row>[] {
  return data.map((d, i) => new TableRow<Row>(i, d));
}

function baseCfg(): TableConfig<Row> {
  return { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
}

describe('RowStyleFactory', () => {

  it('returns [] when rowStyleCfg is absent', () => {
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), baseCfg())).toEqual([]);
  });

  it('returns [] when rowStyleCfg has neither class nor style', () => {
    const cfg: TableConfig<Row> = { ...baseCfg(), rowStyleCfg: {} };
    expect(RowStyleFactory.toRowStyles(rows({ name: 'a' }), cfg)).toEqual([]);
  });

  it('resolves the class hook per row, with empty style', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      rowStyleCfg: { class: r => r.rowSrc.bold ? 'total not-hover' : null },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ class: 'total not-hover', style: {} });
    expect(result[1]).toEqual({ class: null, style: {} });
  });

  it('resolves the style hook per row (incl. fontWeight), with null class', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      rowStyleCfg: { style: r => r.rowSrc.bold ? { fontWeight: 'bold' } : {} },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a', bold: true }, { name: 'b' }), cfg);
    expect(result[0]).toEqual({ class: null, style: { fontWeight: 'bold' } });
    expect(result[1]).toEqual({ class: null, style: {} });
  });

  it('aligns result order/length with row.id', () => {
    const cfg: TableConfig<Row> = {
      ...baseCfg(),
      rowStyleCfg: { style: r => ({ color: 'c' + r.id }) },
    };
    const result = RowStyleFactory.toRowStyles(rows({ name: 'a' }, { name: 'b' }, { name: 'c' }), cfg);
    expect(result.length).toBe(3);
    expect(result[0].style.color).toBe('c0');
    expect(result[2].style.color).toBe('c2');
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: **compilation error** — cannot find module `./RowStyleFactory`, and `'rowStyleCfg' does not exist in type 'TableConfig<Row>'` / `'fontWeight' does not exist in type 'DecorStyles'`.

- [ ] **Step 3: Add the types to `ColumnConfig.ts`**

In `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`, extend `DecorStyles` (currently `color`/`background`/`border`):

```ts
export interface DecorStyles {
  color?: string;
  background?: string;
  border?: string;
  /** font-weight, e.g. 'bold' | 'bolder' | '600'. StyleBuilder.FontWeight values are valid strings. */
  fontWeight?: string;
}
```

Add a new `RowStyleConfig<T>` interface immediately after `DecorStyles`:

```ts
export interface RowStyleConfig<T> {
  /** CSS class(es) added to the body <tr mat-row>; may return several space-separated classes, e.g. 'total not-hover'. */
  class?: (row: TableRow<T>) => string | null;
  /** Inline style for the body <tr mat-row>. */
  style?: (row: TableRow<T>) => DecorStyles;
}
```

Add the field to `TableConfig<T>`. Change the end of the interface from:

```ts
  totalRowCfg?: TotalRowConfig,
  timelineCfg?: TimelineConfig<T>

}
```

to:

```ts
  totalRowCfg?: TotalRowConfig,
  timelineCfg?: TimelineConfig<T>,
  rowStyleCfg?: RowStyleConfig<T>

}
```

(`TableRow` is already imported at the top of `ColumnConfig.ts`.)

- [ ] **Step 4: Create `RowStyleFactory.ts`**

Create `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts`:

```ts
import {TableRow} from "./TableRow";
import {DecorStyles, TableConfig} from "./ColumnConfig";

export interface ResolvedRowStyle {
  class: string | null;
  style: DecorStyles;
}

export class RowStyleFactory {

  /**
   * Resolves rowStyleCfg into a per-row array indexed by row.id.
   * Returns an empty array when the hook is not configured.
   */
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

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: all specs pass (`Executed N of N SUCCESS`), including the 5 new `RowStyleFactory` specs.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts \
        projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts
git commit -m "feat(row-style): add rowStyleCfg types and RowStyleFactory" \
           -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Component wiring + merge helpers + template

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; bold?: boolean; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    clickCfg: { pointer: true, highlightClicked: { background: 'yellow' } },
    rowStyleCfg: {
      style: r => r.rowSrc.bold ? { fontWeight: 'bold', color: 'black' } : {},
      class: r => r.rowSrc.bold ? 'total not-hover' : null,
    },
  };
  data: Row[] = [{ name: 'a', bold: true }, { name: 'b' }];
}

describe('NgxAurMatTable rowStyleCfg', () => {
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

  it('applies the style hook to the bold row only', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgStyle(boldRow)['font-weight']).toBe('bold');
    expect(host.table.rowNgStyle(boldRow)['color']).toBe('black');
    expect(host.table.rowNgStyle(plainRow)['font-weight']).toBeUndefined();
  });

  it('applies the class hook to the bold row, alongside pointer', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgClass(boldRow)['total not-hover']).toBeTrue();
    expect(host.table.rowNgClass(boldRow)['pointer']).toBeTrue();
    expect(host.table.rowNgClass(plainRow)['total not-hover']).toBeUndefined();
    expect(host.table.rowNgClass(plainRow)['pointer']).toBeTrue();
  });

  it('lets highlightClicked override the base style per-property on the highlighted row', () => {
    const [boldRow] = host.table.tableDataSource.data;
    host.table.highlighted = boldRow.rowSrc;
    const style = host.table.rowNgStyle(boldRow);
    expect(style['background-color']).toBe('yellow'); // from highlightClicked
    expect(style['font-weight']).toBe('bold');         // base preserved (highlight didn't set it)
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
class PlainHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: Row[] = [{ name: 'a' }];
}

describe('NgxAurMatTable rowStyleCfg absent (back-compat)', () => {
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

  it('produces empty inline style and only the default classes', () => {
    const [row] = host.table.tableDataSource.data;
    expect(host.table.rowNgStyle(row)).toEqual({});
    expect(host.table.rowNgClass(row)).toEqual({ 'pointer': false, 'new-color': false });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: **compilation error** — `Property 'rowNgStyle' does not exist on type 'NgxAurMatTableComponent<Row>'` (and `rowNgClass`).

- [ ] **Step 3: Edit the component TypeScript**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`:

(a) Add `DecorStyles` to the existing `ColumnConfig` import. Change:

```ts
import {ColumnView, TableConfig} from './model/ColumnConfig';
```

to:

```ts
import {ColumnView, DecorStyles, TableConfig} from './model/ColumnConfig';
```

(b) Add the factory import directly below the existing `TableViewFactory` import:

```ts
import {TableViewFactory} from "./model/TableViewFactory";
import {ResolvedRowStyle, RowStyleFactory} from "./model/RowStyleFactory";
```

(c) Add the `rowStyles` field directly below the existing `tableView` field declaration:

```ts
  tableView: Map<string, ColumnView<string>>[] = [];

  rowStyles: ResolvedRowStyle[] = [];
```

(d) In `initTable()`, populate it right after `this.tableView = ...`. Change:

```ts
    this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
```

to:

```ts
    this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
    this.rowStyles = RowStyleFactory.toRowStyles(this.tableDataSource.data, this.tableConfig)
```

(e) Add the three helper methods. Insert them immediately after the `castSrc(row)` method:

```ts
  castSrc(row: any): TableRow<T> {
    return row;
  }

  private decorToCss(d?: DecorStyles): { [klass: string]: string } {
    const css: { [klass: string]: string } = {};
    if (!d) {
      return css;
    }
    if (d.color) css['color'] = d.color;
    if (d.background) css['background-color'] = d.background;
    if (d.border) css['border'] = d.border;
    if (d.fontWeight) css['font-weight'] = d.fontWeight;
    return css;
  }

  rowNgStyle(row: TableRow<T>): { [klass: string]: string } {
    const base = this.decorToCss(this.rowStyles[row.id]?.style);
    if (this.highlighted === row.rowSrc) {
      // highlightClicked overrides only the properties it sets (per-property merge; highlight wins)
      return { ...base, ...this.decorToCss(this.tableConfig.clickCfg?.highlightClicked) };
    }
    return base;
  }

  rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
    const cls: { [klass: string]: boolean } = {
      'pointer': this.tableConfig.clickCfg?.pointer || false,
      'new-color': this.highlighted === row.rowSrc && !!this.tableConfig.clickCfg?.highlightClicked?.color,
    };
    const custom = this.rowStyles[row.id]?.class;
    if (custom) {
      cls[custom] = true; // NgClass accepts a multi-class key, e.g. 'total not-hover'
    }
    return cls;
  }
```

- [ ] **Step 4: Edit the template**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`, replace the body-row block. Change:

```html
        <tr mat-row #rowLink
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event, row)"
            *matRowDef="let row; columns: _displayColumns;"
            (click)="rowClick(row)"
            [ngClass]="{'pointer': tableConfig.clickCfg?.pointer || false, 'new-color': highlighted===row.rowSrc && tableConfig?.clickCfg?.highlightClicked?.color}"
            [ngStyle]="{
          'color': highlighted===row.rowSrc? tableConfig?.clickCfg?.highlightClicked?.color : undefined,
          'background-color': highlighted === row.rowSrc? tableConfig?.clickCfg?.highlightClicked?.background : undefined,
          'border': highlighted === row.rowSrc? tableConfig?.clickCfg?.highlightClicked?.border : undefined
          }">
        </tr>
```

to:

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

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: all specs pass, including the 5 new `rowStyleCfg` specs and the back-compat spec. The previously-passing pagination specs still pass (the `<tr>` `pointer`/`highlight` behavior is preserved by the helpers).

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts
git commit -m "feat(row-style): apply rowStyleCfg to body rows with highlight merge" \
           -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Demo — bold subtotal rows

**Files:**
- Create: `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.ts`
- Create: `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.html`
- Create: `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.scss`
- Modify: `projects/aur-demo/src/app/app.module.ts`
- Modify: `projects/aur-demo/src/app/app.component.html`

- [ ] **Step 1: Create the demo component TypeScript**

Create `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.ts`:

```ts
import { Component } from '@angular/core';
import { TableConfig, TableRow } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';

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
    clickCfg: { pointer: true },
    rowStyleCfg: {
      // inline + typed: bold needs no stylesheet (DecorStyles.fontWeight)
      style: row => this.isSubtotal(row) ? { fontWeight: 'bold', background: '#fafafa' } : {},
      // class hook: CSS the consumer owns (see scss) — here it suppresses hover on subtotal rows
      class: row => this.isSubtotal(row) ? 'subtotal not-hover' : null,
    },
  };

  tableData: Customer[] = CustomerGenerator.generate(23);
}
```

- [ ] **Step 2: Create the demo template**

Create `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.html`:

```html
<div>
  Каждая 5-я строка — «подытог»: жирный шрифт задаётся инлайново через
  <code>rowStyleCfg.style</code> (<code>DecorStyles.fontWeight</code>), а класс
  <code>not-hover</code> (через <code>rowStyleCfg.class</code>) отключает ховер.
</div>

<aur-mat-table
  class="limit-size"
  [tableData]="tableData"
  [tableConfig]="tableConfig"
></aur-mat-table>
```

- [ ] **Step 3: Create the demo styles**

Create `projects/aur-demo/src/app/table-with-row-style/table-with-row-style.component.scss`:

```scss
:host {
  display: block;
  padding: 8px;
}

/*
 * Classes from rowStyleCfg.class land on the LIBRARY's <tr>, which lives in the
 * aur-mat-table component's encapsulated view. To style it from here we must
 * pierce encapsulation with ::ng-deep — or define the class in global styles.
 */
:host ::ng-deep tr.not-hover:hover {
  background-color: inherit !important;
  cursor: default;
}
```

- [ ] **Step 4: Declare the demo component in `app.module.ts`**

In `projects/aur-demo/src/app/app.module.ts`, add the import next to the other demo imports (e.g. directly after the `TablePaginationMatrixComponent` import block):

```ts
import {
  TablePaginationMatrixComponent
} from "./table-pagination-matrix/table-pagination-matrix.component";
import {
  TableWithRowStyleComponent
} from "./table-with-row-style/table-with-row-style.component";
```

Then add it to the `declarations` array. Change the tail of the array from:

```ts
    TableWithExternalPaginatorComponent,
    TablePaginationMatrixComponent
  ],
```

to:

```ts
    TableWithExternalPaginatorComponent,
    TablePaginationMatrixComponent,
    TableWithRowStyleComponent
  ],
```

- [ ] **Step 5: Add a tab in `app.component.html`**

In `projects/aur-demo/src/app/app.component.html`, add a new tab after the existing "Highlight" tab. Change:

```html
  <mat-tab label="Highlight">
    <ng-template matTabContent>
      <app-table-highlight-clicked-row></app-table-highlight-clicked-row>
    </ng-template>
  </mat-tab>
```

to:

```html
  <mat-tab label="Highlight">
    <ng-template matTabContent>
      <app-table-highlight-clicked-row></app-table-highlight-clicked-row>
    </ng-template>
  </mat-tab>

  <mat-tab label="Row style">
    <ng-template matTabContent>
      <app-table-with-row-style></app-table-with-row-style>
    </ng-template>
  </mat-tab>
```

- [ ] **Step 6: Verify the demo app compiles**

Run: `npx ng build aur-demo --configuration development`
Expected: build succeeds (`Application bundle generation complete`). No demo unit tests exist in this repo by convention; optionally run `npx ng serve` and open the "Row style" tab to confirm every 5th row is bold with a light background and does not change on hover.

- [ ] **Step 7: Commit**

```bash
git add projects/aur-demo/src/app/table-with-row-style/ \
        projects/aur-demo/src/app/app.module.ts \
        projects/aur-demo/src/app/app.component.html
git commit -m "docs(demo): add table-with-row-style example" \
           -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Changelog, version bump, README

**Files:**
- Create: `changelog/19.0.19.md`
- Modify: `projects/ngx-aur-mat-table/package.json`
- Modify: `README.md`

> **Version note:** `package.json` is currently `19.0.17` while `changelog/19.0.18.md` (pagination) already exists — the `19.0.18` package.json bump appears outstanding. This plan targets `19.0.19`. If the maintainer wants to reconcile `19.0.18` first, adjust the number in this task accordingly before committing.

- [ ] **Step 1: Create the changelog entry**

Create `changelog/19.0.19.md`:

```markdown
## ngx-aur-mat-table v19.0.19

**Новое: построчная стилизация через `rowStyleCfg`**

Добавлен построчный хук стилизации тела таблицы — поле `rowStyleCfg` в `TableConfig`. Позволяет навесить CSS-класс и/или инлайновый стиль на `<tr mat-row>` в зависимости от данных строки.

### Новые возможности

- **`rowStyleCfg`** — новое поле `TableConfig`:
  - `class?: (row: TableRow<T>) => string | null` — CSS-класс(ы) для `<tr>` (можно вернуть несколько через пробел, напр. `'total not-hover'`).
  - `style?: (row: TableRow<T>) => DecorStyles` — инлайновый стиль для `<tr>`.
- **`DecorStyles.fontWeight`** — новое опциональное поле (`string`, напр. `'bold'`, `'600'`). Доступно и в `rowStyleCfg.style`, и в `clickCfg.highlightClicked`.

### Поведение

- Базовый стиль/класс задаётся `rowStyleCfg`; на выделенной (кликнутой) строке `clickCfg.highlightClicked` перекрывает только заданные в нём свойства.
- Функции `class`/`style` вычисляются один раз при обновлении данных (как `valueView`) — дружелюбно к `OnPush`.
- Классы из `rowStyleCfg.class` попадают на `<tr>` внутри компонента библиотеки — стили для них должны быть глобальными или объявлены через `::ng-deep`.

### Обратная совместимость

Изменения полностью аддитивны. Без `rowStyleCfg` рендеринг строк не меняется.

```typescript
const tableConfig: TableConfig<ReportRow> = {
  columnsCfg: [/* ... */],
  clickCfg: { pointer: true },
  rowStyleCfg: {
    style: row => row.rowSrc.bold ? { fontWeight: 'bold' } : {},
    class: row => row.rowSrc.bold ? 'not-hover' : null,
  },
};
```
```

- [ ] **Step 2: Bump the library version**

In `projects/ngx-aur-mat-table/package.json`, change:

```json
  "version": "19.0.17",
```

to:

```json
  "version": "19.0.19",
```

- [ ] **Step 3: Add the README section**

Append the following to the end of `README.md`:

```markdown

## Per-row styling (`rowStyleCfg`)

Decorate body rows (`<tr mat-row>`) as a function of their data — e.g. bold subtotal rows.

```ts
tableConfig: TableConfig<ReportRow> = {
  columnsCfg: [ /* ... */ ],
  clickCfg: { pointer: true },
  rowStyleCfg: {
    // inline + typed; bold needs no stylesheet (DecorStyles.fontWeight)
    style: row => row.rowSrc.bold ? { fontWeight: 'bold' } : {},
    // CSS class(es) you own; here, suppress hover on those rows
    class: row => row.rowSrc.bold ? 'not-hover' : null,
  },
};
```

- `style` returns `DecorStyles` (`color`, `background`, `border`, `fontWeight`).
- `class` returns one or more space-separated class names, or `null`.
- On the clicked/highlighted row, `clickCfg.highlightClicked` overrides only the properties it sets; everything else falls through to `rowStyleCfg`.
- The hooks run once per data refresh (OnPush-friendly).

> **CSS scope:** classes from `class` are applied to the table's own `<tr>`, which lives inside the library component's encapsulated view. Define their styles in **global** styles, or pierce encapsulation with `::ng-deep`:
>
> ```scss
> :host ::ng-deep tr.not-hover:hover { background-color: inherit !important; cursor: default; }
> ```
```

- [ ] **Step 4: Commit**

```bash
git add changelog/19.0.19.md projects/ngx-aur-mat-table/package.json README.md
git commit -m "docs(row-style): changelog, version bump, README section" \
           -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the full library test suite**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: `Executed N of N SUCCESS` — all specs green (RowStyleFactory, rowStyleCfg component, back-compat, plus the pre-existing pagination specs).

- [ ] **Step 2: Build the library**

Run: `npx ng build ngx-aur-mat-table`
Expected: `Built ngx-aur-mat-table` / build succeeds with no TypeScript errors.

- [ ] **Step 3: Build the demo app**

Run: `npx ng build aur-demo --configuration development`
Expected: `Application bundle generation complete` — demo compiles with the new component and tab.

- [ ] **Step 4: Final review**

Confirm the branch `feat/row-style-hook` contains four feature commits plus the spec commit, and that the diff matches this plan. The branch is ready for the finishing step (merge/PR) — handled separately via the `superpowers:finishing-a-development-branch` skill.

---

## Self-Review

**1. Spec coverage** (against `2026-06-03-row-style-hook-design.md`):

- API — `DecorStyles.fontWeight` → Task 1 Step 3; `RowStyleConfig<T>` + `TableConfig.rowStyleCfg` → Task 1 Step 3. ✅
- `RowStyleFactory` mirroring `TableViewFactory`, indexed by `row.id`, `[]` when unused → Task 1 Step 4 + tests Step 1. ✅
- Component field built in `initTable()` → Task 2 Step 3(c,d). ✅
- `decorToCss` / `rowNgStyle` / `rowNgClass` helpers (incl. `background`→`background-color`, `fontWeight`→`font-weight`) → Task 2 Step 3(e). ✅
- Template `<tr mat-row>` swap, behavior preserved → Task 2 Step 4. ✅
- Precedence (base + per-property highlight overlay; classes coexist) → Task 2 Step 3(e) + test "override per-property". ✅
- Hover is consumer-CSS via `class` → demo scss (Task 3 Step 3) + README caveat (Task 4 Step 3). ✅
- CD/perf (resolve once per refresh) → Task 1 Step 4 (factory) + populate in `initTable()`. ✅
- Back-compat (no `rowStyleCfg` → no change) → Task 2 back-compat spec. ✅
- Public API: types live in already-exported `ColumnConfig.ts`; factory internal → no `public-api.ts` change needed (Task 1 touches only `ColumnConfig.ts`). ✅
- Testing (factory + mapping + merge + render + back-compat) → Tasks 1–2 specs. ✅
- Demo + changelog + README → Tasks 3–4. ✅

**2. Placeholder scan:** No `TBD`/`TODO`/"add error handling"/"similar to" — every code block is complete. The only deferred decision (release version number) is explicitly flagged with a concrete default (`19.0.19`). ✅

**3. Type consistency:** `ResolvedRowStyle` (`{ class: string | null; style: DecorStyles }`) is defined in Task 1 Step 4 and consumed identically in Task 2 (`this.rowStyles[row.id]?.style` / `?.class`). `RowStyleFactory.toRowStyles(rows, tableConfig)` signature matches its call site in `initTable()`. `rowNgStyle`/`rowNgClass`/`decorToCss` names match between component (Task 2 Step 3), template (Task 2 Step 4), and tests (Task 2 Step 1). `rowStyleCfg` / `DecorStyles.fontWeight` names match across factory, tests, demo, changelog, and README. ✅
