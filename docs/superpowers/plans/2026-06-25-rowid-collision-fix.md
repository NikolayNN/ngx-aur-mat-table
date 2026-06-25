# TableRow.id → rowId Collision Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the internal positional row index off the public `TableRow.id` field (renamed to `rowId`) so a user column with `key:'id'` no longer clobbers it, and add a fail-fast guard against future reserved-key collisions.

**Architecture:** `TableRow` carries a synthetic page-local index assigned in `TableRowsFactory.convert`. Today it lives on `id`, which the column overlay `row[c.key] = …` overwrites when a column is keyed `'id'`, breaking every positional lookup (`tableView[id]`, `rowStyles[id]`, index column, timeline). We rename the field to `rowId`, migrate every `TableRow`-typed `.id` read to `.rowId`, keep the public `index` template context (sourced from `rowId`), and throw on init if a column key collides with a reserved `TableRow` field.

**Tech Stack:** Angular 19.2 library, Angular Material 18.2, TypeScript 5.8, Karma + Jasmine (`ng test`).

## Global Constraints

- **Breaking change → target major 20.0.0.** Public `TableRow.id` (as index) is removed; no deprecation shim is possible (a getter cannot coexist with a column writing `row['id']`).
- **Branch:** `fix/rowid-internal-index-collision` (already created, off `master`; spec committed there).
- **Reserved row-field set:** exactly `['rowId', 'rowSrc']`.
- **Migration rule:** rename `.id` → `.rowId` **only where the receiver is a `TableRow`**. Leave business `rowSrc.id` untouched — specifically `tableConfig.trackBy` callbacks (receive `rowSrc`, see `component.ts:836`), `valueConverter`, and `dataPropertyGetter`.
- **Public `index` context preserved:** `AurRowContext.index` / `AurCellContext.index` keep their key; only their source changes to `rowId`.
- **Guard is throw-always** (not dev-gated), matching the mandatory `[tableConfig]` check at `component.ts:397`.
- **Test command:** `ng test ngx-aur-mat-table --watch=false` (Karma single-run). Narrow during dev with Jasmine `fit`/`fdescribe` if desired.
- **Commit convention:** conventional commits; the rename commit is a breaking `fix(table)!:`.
- **Out of scope this plan (per spec):** changelog entry (added at the version bump) and optional README note.

---

### Task 1: Fix the collision — rename `TableRow.id` → `rowId` and migrate all reads

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableRow.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (lines 457, 463, 770, 772, 774, 780, 781, 918, 939, 1145)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (lines 70, 72, 73, 86, 88, 89, 165, 257, 398, 487, 488)
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts:14`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts:53`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts` (lines 40, 59, 72)

**Interfaces:**
- Produces: `TableRow<T>.rowId: number` (was `id`); constructor `new TableRow<T>(rowId: number, rowSrc: T)` (positional — call sites unaffected).
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing repro test**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts`:

```ts
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row { id: number; status: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IdColumnHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [
      {key: 'id', name: 'ID', valueConverter: v => v.id, valueView: {icon: {name: () => 'flag'}}},
      {key: 'status', name: 'Status', valueConverter: v => v.status},
    ],
  };
  // business ids: 23 out of the row-index range [0..3]; 3/2/1 fall inside it (reproduces the screenshot)
  data: Row[] = [{id: 23, status: 'RUN'}, {id: 3, status: 'RUN'}, {id: 2, status: 'RUN'}, {id: 1, status: 'RUN'}];
}

describe('NgxAurMatTable rowId collision — valueView with column key "id"', () => {
  let fixture: ComponentFixture<IdColumnHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IdColumnHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IdColumnHostComponent);
  });

  function idCells(): HTMLElement[] {
    // id column is the first column → first cell of each body row
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td.mat-mdc-cell:first-child'));
  }

  it('renders the valueView icon for EVERY row, including business ids outside the index range', () => {
    fixture.detectChanges();
    const cells = idCells();
    expect(cells.length).toBe(4);
    const ids = [23, 3, 2, 1];
    cells.forEach((cell, i) =>
      expect(cell.querySelector('lib-column-view mat-icon'))
        .withContext(`строка ${i} (бизнес-id ${ids[i]}) должна показывать иконку, а не голый текст`)
        .not.toBeNull());
  });
});
```

- [ ] **Step 2: Run the test and verify it FAILS**

Run: `ng test ngx-aur-mat-table --watch=false`
Expected: FAIL — the first row (business id 23) has no `mat-icon` because `tableView[element.id]` = `tableView[23]` = `undefined`. The `withContext` message for row 0 prints.

- [ ] **Step 3: Rename the field in `TableRow.ts`**

Replace the whole file `projects/ngx-aur-mat-table/src/lib/model/TableRow.ts`:

```ts
export class TableRow<T> {
  /** Page-local позиционный индекс строки 0..N-1 (служебный; наружу — только через контекст `index`). */
  rowId: number;
  rowSrc: T;

  [key: string]: any;

  constructor(rowId: number, rowSrc: T) {
    this.rowSrc = rowSrc;
    this.rowId = rowId;
  }
}
```

- [ ] **Step 4: Migrate the `TableRow` index reads in `component.ts`**

Apply these exact replacements (all receivers are `TableRow`):

```ts
// line 457 (rowCtx)
index: element.rowId
// line 463 (cellCtx)
index: element.rowId

// lines 770-774 (timeline gaps)
this._timelineGaps.set(visibleData[i].rowId, {
  topGap: detectGaps && i > 0
    && visibleData[i].rowId !== visibleData[i - 1].rowId + 1,
  bottomGap: detectGaps && i < visibleData.length - 1
    && visibleData[i].rowId !== visibleData[i + 1].rowId - 1,

// lines 780-781 (timeline first/last)
this._timelineFirstId = visibleData.length > 0 ? visibleData[0].rowId : -1;
this._timelineLastId = visibleData.length > 0 ? visibleData[visibleData.length - 1].rowId : -1;

// line 918 (rowStyle)
let acc: StyleBuilder.Row | string | null = this.rowStyles[row.rowId]?.style ?? null;
// line 939 (rowNgClass)
const custom = this.rowStyles[row.rowId]?.class;

// line 1145 (onDragStart — selectedRows is TableRow<T>[], confirmed SelectionProvider.ts:71)
if (selectedRows.find(r => r.rowId === row.rowId)) {
```

- [ ] **Step 5: Migrate the `TableRow` index reads in `component.html`**

Every `element.id` in this template is the positional index (verified: lines 70, 72, 73, 86, 88, 89, 165, 257, 398, 487, 488 — no business `element.id` exists in the template). Global-replace `element.id` → `element.rowId` in `ngx-aur-mat-table.component.html`. After replacing, these are the resulting lines:

```html
<!-- 70 -->  *ngIf="element.rowId !== _timelineFirstId"
<!-- 72 -->  [style.border-left-color]="_timelineGaps.get(element.rowId)?.topColor ?? timelineProvider.line.color"
<!-- 73 -->  [style.border-left-style]="_timelineGaps.get(element.rowId)?.topGap ? timelineProvider.line.gapStyle : timelineProvider.line.style"
<!-- 86 -->  *ngIf="element.rowId !== _timelineLastId"
<!-- 88 -->  [style.border-left-color]="_timelineGaps.get(element.rowId)?.bottomColor ?? timelineProvider.line.color"
<!-- 89 -->  [style.border-left-style]="_timelineGaps.get(element.rowId)?.bottomGap ? timelineProvider.line.gapStyle : timelineProvider.line.style"
<!-- 165 --> {{ indexProvider.format(element.rowId + _indexPageOffset) }}
<!-- 257 --> <ng-container *ngFor="let action of col.actionView.get(element.rowId)">
<!-- 398 --> [config]="tableView[element.rowId]?.get(columnConfig.key)"
<!-- 487 --> [style.border-left-color]="_timelineGaps.get(element.rowId)?.bottomColor ?? timelineProvider.line.color"
<!-- 488 --> [style.border-left-style]="_timelineGaps.get(element.rowId)?.bottomGap ? timelineProvider.line.gapStyle : timelineProvider.line.style"
```

- [ ] **Step 6: Migrate `ActionViewFactory.ts`**

`projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts:14`:

```ts
result.set(row.rowId, this.prepareActionsForRow(row, actionConfig));
```

- [ ] **Step 7: Update the specs that read `TableRow.id`**

`RowStyleFactory.spec.ts:53` (the `style` hook receives a `TableRow`):

```ts
      bodyRowCfg: { styleCfg: { style: r => `color: c${r.rowId}` } },
```

`ActionViewFactory.spec.ts` — `old`/`young` are `TableRow<Customer>`; update the Map lookups:

```ts
// line 40
    const action = view.get(old.rowId)![0];
// line 59
    const del = view.get(young.rowId)![0].menu![1];
// line 72
    expect(view.get(old.rowId)![0].menu).toBeUndefined();
```

> Do NOT touch `trackBy: r => r.id` (`expanded-rows.spec.ts:394`, `trackby.spec.ts:65`) or `item => item.id` — there `r`/`item` is `rowSrc`, so `.id` is the business field.

- [ ] **Step 8: Run the suite and verify GREEN**

Run: `ng test ngx-aur-mat-table --watch=false`
Expected: PASS — the new repro test passes (all 4 rows show `mat-icon`), and the full existing suite (including `ActionViewFactory.spec`, `RowStyleFactory.spec`, timeline/index/trackby specs) is green.

- [ ] **Step 9: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/TableRow.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
        projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts \
        projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts \
        projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts
git commit -m "fix(table)!: rename internal TableRow.id index to rowId

Column key:'id' overwrote the internal positional index, breaking valueView/
row-styles/index-column/timeline lookups. Move the index to rowId; key:'id'
now works as a normal business column.

BREAKING CHANGE: TableRow.id (the row index) is renamed to rowId. Read the
row index via the directive context's \`index\` instead of row.id.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Reserved-key guard (throw-always)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts` (add a describe)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`ngOnInit` ~line 395, new private method)

**Interfaces:**
- Consumes: `TableRow.rowId` from Task 1 (the reserved name being protected).
- Produces: `NgxAurMatTableComponent.assertNoReservedColumnKeys()` (private; throws `Error` on init).

- [ ] **Step 1: Write the failing guard tests**

Append to `ngx-aur-mat-table-rowid-collision.spec.ts`:

```ts
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ReservedKeyHostComponent {
  cfg: TableConfig<any> = { columnsCfg: [{key: 'rowId', name: 'X', valueConverter: (v: any) => v.x}] };
  data: any[] = [{x: 1}];
}

describe('NgxAurMatTable rowId collision — reserved-key guard', () => {
  function renderWith(key: string): () => void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ReservedKeyHostComponent],
    });
    const fixture = TestBed.createComponent(ReservedKeyHostComponent);
    fixture.componentInstance.cfg = {columnsCfg: [{key, name: 'X', valueConverter: (v: any) => v.x}]};
    return () => fixture.detectChanges();
  }

  it('throws when a column key is "rowId"', () => {
    expect(renderWith('rowId')).toThrowError(/конфликтует со служебным полем/);
  });

  it('throws when a column key is "rowSrc"', () => {
    expect(renderWith('rowSrc')).toThrowError(/конфликтует со служебным полем/);
  });
});
```

- [ ] **Step 2: Run and verify it FAILS**

Run: `ng test ngx-aur-mat-table --watch=false`
Expected: FAIL — `detectChanges()` does not throw yet (no guard); Jasmine reports "Expected function to throw an Error".

- [ ] **Step 3: Implement the guard**

In `ngx-aur-mat-table.component.ts`, call it from `ngOnInit` right after the mandatory `[tableConfig]` check:

```ts
  ngOnInit(): void {
    if (!this.tableConfig) {
      throw new Error("init inputs [tableConfig] is mandatory!")
    }
    this.assertNoReservedColumnKeys();
    if (this.isServerWiring() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
  }
```

Add the private method (place it next to `ngOnInit` / other init helpers):

```ts
  /**
   * Ключ колонки не должен совпадать со служебным полем TableRow: иначе overlay
   * `row[c.key] = valueConverter(...)` затирает его (как было с `id` до 20.0.0).
   */
  private assertNoReservedColumnKeys(): void {
    const RESERVED = ['rowId', 'rowSrc'];
    const clash = this.tableConfig.columnsCfg.find(c => RESERVED.includes(c.key));
    if (clash) {
      throw new Error(
        `[aur-mat-table] ключ колонки "${clash.key}" конфликтует со служебным полем TableRow ` +
        `(${RESERVED.join(', ')}). Переименуйте колонку.`);
    }
  }
```

- [ ] **Step 4: Run and verify GREEN**

Run: `ng test ngx-aur-mat-table --watch=false`
Expected: PASS — both guard tests throw the expected error; full suite still green (no existing spec uses a `rowId`/`rowSrc` column key).

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts
git commit -m "feat(table): throw on column key colliding with reserved TableRow field

Fail-fast on init (like the mandatory [tableConfig] check) when a column key
is 'rowId' or 'rowSrc', instead of silently corrupting the row.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Collision regression coverage + doc-comments

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts` (add describes)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/AurRowContext.ts` (comments, lines 7, 11)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/AurCellContext.ts` (comments, lines 9, 13)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts:13` (comment)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts:50` (test name)

**Interfaces:**
- Consumes: `TableRow.rowId` (Task 1), guard (Task 2). Produces: nothing for later tasks.

- [ ] **Step 1: Add the index-column collision regression test**

Append to `ngx-aur-mat-table-rowid-collision.spec.ts`:

```ts
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IndexColumnHostComponent {
  cfg: TableConfig<Row> = {
    indexCfg: {offset: 1},
    columnsCfg: [{key: 'id', name: 'ID', valueConverter: v => v.id}],
  };
  data: Row[] = [{id: 23, status: 'RUN'}, {id: 3, status: 'RUN'}, {id: 2, status: 'RUN'}, {id: 1, status: 'RUN'}];
}

describe('NgxAurMatTable rowId collision — index column with a key:"id" column', () => {
  it('shows the positional row number, not the business id', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IndexColumnHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(IndexColumnHostComponent);
    fixture.detectChanges();
    // index column (tbl_index) is prepended → first cell of each row
    const indexCells = Array.from(
      fixture.nativeElement.querySelectorAll('tr.mat-mdc-row td.mat-mdc-cell:first-child')) as HTMLElement[];
    expect(indexCells.map(c => c.textContent!.trim())).toEqual(['1', '2', '3', '4']);
  });
});
```

- [ ] **Step 2: Add the rowStyles collision regression test**

Append to the same file:

```ts
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class RowStyleHostComponent {
  cfg: TableConfig<Row> = {
    bodyRowCfg: {styleCfg: {class: r => r.rowSrc.status === 'RUN' ? 'is-run' : null}},
    columnsCfg: [{key: 'id', name: 'ID', valueConverter: v => v.id}],
  };
  data: Row[] = [{id: 23, status: 'RUN'}, {id: 3, status: 'IDLE'}];
}

describe('NgxAurMatTable rowId collision — row styles with a key:"id" column', () => {
  it('applies the per-row class to the correct row (business id out of index range)', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [RowStyleHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(RowStyleHostComponent);
    fixture.detectChanges();
    const rows = Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')) as HTMLElement[];
    expect(rows[0].classList.contains('is-run')).withContext('строка id=23 (RUN) должна получить класс').toBeTrue();
    expect(rows[1].classList.contains('is-run')).withContext('строка id=3 (IDLE) не должна').toBeFalse();
  });
});
```

- [ ] **Step 3: Run and verify both pass (lock-in)**

Run: `ng test ngx-aur-mat-table --watch=false`
Expected: PASS — both regression tests are green (they would fail if Task 1's rename were reverted, which is what they guard).

- [ ] **Step 4: Update doc-comments**

`AurRowContext.ts` lines 7 and 11:

```ts
  /** Строка таблицы: .rowSrc — исходный объект T, .rowId — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.rowId. */
```

`AurCellContext.ts` lines 9 and 13 — same edits:

```ts
  /** Строка таблицы: .rowSrc — исходный объект T, .rowId — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.rowId. */
```

`RowStyleFactory.ts:13`:

```ts
   * Разрешает `bodyRowCfg.styleCfg` в массив по строкам, индексированный по `row.rowId`.
```

`RowStyleFactory.spec.ts:50` (test name):

```ts
  it('aligns result order/length with row.rowId', () => {
```

- [ ] **Step 5: Run the full suite**

Run: `ng test ngx-aur-mat-table --watch=false`
Expected: PASS — entire suite green.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-rowid-collision.spec.ts \
        projects/ngx-aur-mat-table/src/lib/model/AurRowContext.ts \
        projects/ngx-aur-mat-table/src/lib/model/AurCellContext.ts \
        projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts \
        projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.spec.ts
git commit -m "test(table): collision regression coverage + rowId doc-comments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage** (each spec section → task):
- Field rename `id`→`rowId` → Task 1 Step 3. ✓
- Read-site migration (component.ts/html, ActionViewFactory) → Task 1 Steps 4-6. ✓
- Affected specs kept green → Task 1 Step 7. ✓
- `trackBy`/`rowSrc.id` left untouched → Task 1 Step 7 note. ✓
- `index` context sourced from `rowId` → Task 1 Step 4 (lines 457/463). ✓
- Throw-always guard, reserved `['rowId','rowSrc']`, wired in `ngOnInit` → Task 2. ✓
- Tests: repro icon (Task 1), guard throw (Task 2), index-column + rowStyles collision regression (Task 3). Timeline + actionView collision: actionView is set/get-consistent and covered by the updated `ActionViewFactory.spec` (Task 1); timeline reads are set/get-consistent and exercised by existing timeline specs (`aur-column.spec`, `row-marker-def.spec`) under the full-suite gate — no dedicated collision test added (documented, not silently dropped). ✓
- Doc-comments (AurRowContext/AurCellContext/RowStyleFactory) → Task 3 Step 4. ✓
- Changelog/README deferred to bump → Global Constraints (out of scope). ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows exact before/after. ✓

**3. Type consistency:** Field `rowId: number` defined in Task 1 Step 3; every later reference (`element.rowId`, `row.rowId`, `r.rowId`, `visibleData[i].rowId`, `assertNoReservedColumnKeys` reserved list) uses that exact name. Constructor stays positional, so `new TableRow(i, obj)` call sites (e.g. `TableRowsFactory.ts:17`, `TableViewFactory.spec`, `NgxAurFilters.spec`) need no change. ✓
