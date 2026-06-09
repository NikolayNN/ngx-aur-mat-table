# Total Row Last-Page-By-Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the total (footer) row render only on the last pagination page by default, with an explicit `totalRowCfg.showOnEveryPage: true` opt-in to restore the previous every-page behavior.

**Architecture:** A template-evaluated method `isTotalRowVisible()` (plus private helper `currentPaging()`) computes visibility each change-detection cycle. The footer `<tr mat-footer-row>` gains the condition `&& isTotalRowVisible()`. Client vs server paging is distinguished by the presence of `paginatorState` (same branch logic as the existing `getTimelineVisibleData()`). The change is additive in API surface (one optional field) but flips the runtime default; shipped as minor 19.3.0 with a changelog note.

**Tech Stack:** Angular 19, Angular Material (MDC) table/paginator, Karma/Jasmine, OnPush change detection.

**Spec:** `docs/superpowers/specs/2026-06-09-total-row-last-page-design.md`

---

## File Structure

- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — add `showOnEveryPage?: boolean` to `TotalRowConfig<T>`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — add public `isTotalRowVisible()` and private `currentPaging()`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — extend the total footer-row `*ngIf`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts` — **new** spec (method-level + DOM).
- `projects/ngx-aur-mat-table/package.json` — version bump 19.2.0 → 19.3.0.
- `changelog/19.3.0.md` — **new** changelog entry.

---

## Task 1: Visibility logic (`isTotalRowVisible` + `currentPaging`) and config field

**Files:**
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts` (create)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:297-301`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (add two methods near `isFeatureEnabled`, ~line 617)

These tests call the method directly (no DOM footer assertion yet), so they pass once the field and methods exist — the template change comes in Task 2.

- [ ] **Step 1: Write the failing test file**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { AurPage, AurPageSource } from './model/AurPage';

interface Row { name: string; }

// ---- client, paginated, total enabled ----
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClientTotalHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
    paginationCfg: { enable: true, size: 5 },
  };
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('isTotalRowVisible — client mode', () => {
  let fixture: ComponentFixture<ClientTotalHost>;
  let host: ClientTotalHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientTotalHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientTotalHost);
    host = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit + ngAfterViewInit (paginator bound)
  });

  it('default: hidden on a non-last page, shown on the last page', () => {
    // 12 rows / size 5 => pages 0,1,2 ; start on page 0
    expect(host.table.isTotalRowVisible()).toBeFalse();
    host.table.activePaginator.lastPage(); // -> pageIndex 2
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });

  it('showOnEveryPage:true keeps it visible on every page', () => {
    host.table.tableConfig.totalRowCfg = { enable: true, showOnEveryPage: true };
    expect(host.table.isTotalRowVisible()).toBeTrue(); // page 0
    host.table.activePaginator.lastPage();
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });

  it('single page (data fits) is treated as the last page', () => {
    host.data = [{ name: 'only' }];
    fixture.detectChanges(); // ngOnChanges(tableData) -> refresh
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });

  it('empty data is visible (lastPageIndex clamped to 0)', () => {
    host.data = [];
    fixture.detectChanges();
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });
});

// ---- pagination disabled ----
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class NoPaginationHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
  };
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('isTotalRowVisible — pagination disabled', () => {
  let fixture: ComponentFixture<NoPaginationHost>;
  let host: NoPaginationHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [NoPaginationHost],
    }).compileComponents();
    fixture = TestBed.createComponent(NoPaginationHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('is always visible when pagination is off', () => {
    expect(host.table.isTotalRowVisible()).toBeTrue();
  });
});

// ---- server mode ----
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [pageSource]="source"></aur-mat-table>`,
})
class ServerTotalHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
    paginationCfg: { enable: true, size: 10, mode: 'server' },
  };
  // 42 elements / size 10 => pages 0..4, lastPageIndex 4
  source: AurPageSource<Row> = (req) =>
    of({ content: [{ name: 'a' }], totalElements: 42, number: req.pageIndex } as AurPage<Row>);
}

describe('isTotalRowVisible — server mode', () => {
  let fixture: ComponentFixture<ServerTotalHost>;
  let host: ServerTotalHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ServerTotalHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerTotalHost);
    host = fixture.componentInstance;
  });

  it('default: hidden on first page, shown on the last (via paginatorState)', fakeAsync(() => {
    fixture.detectChanges(); // ngAfterViewInit -> startServerController loads page 0
    tick();
    fixture.detectChanges();
    expect(host.table.paginatorState?.pageIndex).toBe(0);
    expect(host.table.isTotalRowVisible()).toBeFalse();

    host.table.activePaginator.lastPage(); // -> pageIndex 4, fetches last page
    tick();
    fixture.detectChanges();
    expect(host.table.paginatorState?.pageIndex).toBe(4);
    expect(host.table.isTotalRowVisible()).toBeTrue();
  }));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test ngx-aur-mat-table --watch=false --include="**/ngx-aur-mat-table-total-row-visibility.spec.ts"`
Expected: FAIL — TypeScript compile error: `Property 'isTotalRowVisible' does not exist` and `showOnEveryPage` not assignable to `TotalRowConfig`.

- [ ] **Step 3: Add the `showOnEveryPage` field to the config**

In `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`, replace the `TotalRowConfig` interface (lines 297-301):

```ts
export interface TotalRowConfig<T> {
  /** Показать строку итогов. По умолчанию включено, когда какая-либо колонка определяет `totalConverter`; `false` выключает. */
  enable?: boolean;
  styleCfg?: TotalStyleConfig<T>;
  /**
   * Показывать строку итогов на каждой странице пагинации.
   * default false — итоги показываются ТОЛЬКО на последней странице (поведение по умолчанию).
   * true — итоги показываются на каждой странице (прежнее поведение до 19.3.0).
   * Если пагинация выключена — итоги показываются всегда (опция не влияет).
   */
  showOnEveryPage?: boolean;
}
```

- [ ] **Step 4: Add the visibility methods to the component**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`, immediately after the `isFeatureEnabled` method (ends at line 620), add:

```ts
  /**
   * Видна ли строка итогов на текущей странице.
   * По умолчанию итоги показываются только на последней странице пагинации;
   * `totalRowCfg.showOnEveryPage: true` возвращает показ на каждой странице.
   * Когда пагинация выключена — итоги показываются всегда.
   */
  isTotalRowVisible(): boolean {
    if (this.tableConfig.totalRowCfg?.showOnEveryPage) return true;
    if (!this.paginationProvider.isEnabled) return true;
    const { pageIndex, lastPageIndex } = this.currentPaging();
    return pageIndex >= lastPageIndex;
  }

  /**
   * Текущий индекс страницы и индекс последней страницы.
   * Серверный режим читает их из paginatorState (как getTimelineVisibleData),
   * клиентский — из активного пагинатора и числа отфильтрованных строк.
   */
  private currentPaging(): { pageIndex: number; lastPageIndex: number } {
    let total: number, pageIndex: number, pageSize: number;
    if (this.paginatorState) {
      total = this.paginatorState.length;
      pageIndex = this.paginatorState.pageIndex;
      pageSize = this.paginationProvider.size;
    } else {
      total = this.tableDataSource.filteredData.length;
      pageIndex = this.activePaginator?.pageIndex ?? 0;
      pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
    }
    const lastPageIndex = pageSize > 0 ? Math.max(0, Math.ceil(total / pageSize) - 1) : 0;
    return { pageIndex, lastPageIndex };
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test ngx-aur-mat-table --watch=false --include="**/ngx-aur-mat-table-total-row-visibility.spec.ts"`
Expected: PASS — all describes green.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts
git commit -m "feat(total-row): add showOnEveryPage + last-page visibility logic"
```

---

## Task 2: Wire visibility into the template (DOM render)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:381`
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts` (append DOM describe)

- [ ] **Step 1: Write the failing DOM test**

Append to `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts` (the `ClientTotalHost` class is already declared above — reuse it). The footer row stays in the DOM, so assert VISIBILITY via the inline `display` style:

```ts
describe('total footer row rendering (DOM) — client mode', () => {
  let fixture: ComponentFixture<ClientTotalHost>;
  let host: ClientTotalHost;

  const footerRow = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('tr.mat-mdc-footer-row');
  const footerHidden = (): boolean => {
    const el = footerRow();
    return !!el && el.style.display === 'none';
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClientTotalHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientTotalHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('default: footer row is hidden on page 0, visible on the last page', () => {
    expect(footerRow()).withContext('footer row should be rendered in the DOM').toBeTruthy();
    expect(footerHidden()).withContext('hidden on page 0').toBeTrue();
    host.table.activePaginator.lastPage();
    fixture.detectChanges();
    expect(footerRow()).withContext('row should be in DOM on last page').toBeTruthy();
    expect(footerRow()!.style.display).withContext('visible on last page').not.toBe('none');
  });

  it('showOnEveryPage:true keeps the footer visible on page 0', () => {
    host.table.tableConfig.totalRowCfg = { enable: true, showOnEveryPage: true };
    fixture.detectChanges();
    expect(footerRow()).withContext('row should be in DOM').toBeTruthy();
    expect(footerRow()!.style.display).withContext('visible on page 0 with showOnEveryPage').not.toBe('none');
  });
});
```

- [ ] **Step 2: Run the DOM test to verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `default: footer row is hidden on page 0` fails because the unmodified template has no `display:none` binding (the row is visible on page 0).

- [ ] **Step 3: Update the template (hide via `display`, not `*ngIf`)**

> **Note:** the original idea of extending the outer `*ngIf` to `totalRowProvider.isEnabled && isTotalRowVisible()` does **not** work. In this CDK table version, dynamically adding/removing `*matFooterRowDef` after the first render does not re-render the footer outlet (`_footerRowDefChanged` is not re-set on `ContentChildren` changes). The outer `*ngIf="totalRowProvider.isEnabled"` only works because it is stable from init. So keep the footer row permanently registered and hide it per-page with an inline `display` binding.

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`, keep the outer `*ngIf="totalRowProvider.isEnabled"` unchanged and add `[style.display]` to the `<tr mat-footer-row>`:

```html
<ng-container *ngIf="totalRowProvider.isEnabled">
  <tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
      [style]="_totalStyle" [ngClass]="_totalClass"
      [style.display]="isTotalRowVisible() ? null : 'none'"></tr>
</ng-container>
```

`[style]` and `[style.display]` coexist (the specific binding wins for `display`). When visible, `display` is `null` → default `table-row`, so `sticky: stickyCfg?.total` is preserved on the page where the row shows.

- [ ] **Step 4: Run the DOM test to verify it passes**

Run: `npx ng test ngx-aur-mat-table --watch=false --include="**/ngx-aur-mat-table-total-row-visibility.spec.ts"`
Expected: PASS.

- [ ] **Step 5: Run the full library suite to confirm no regressions**

Run: `npx ng test ngx-aur-mat-table --watch=false`
Expected: PASS — all existing specs (pagination, row-style, etc.) still green.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-total-row-visibility.spec.ts
git commit -m "feat(total-row): show total only on last page by default"
```

---

## Task 3: Version bump and changelog

**Files:**
- Modify: `projects/ngx-aur-mat-table/package.json:3`
- Create: `changelog/19.3.0.md`

- [ ] **Step 1: Bump the library version**

In `projects/ngx-aur-mat-table/package.json`, change line 3:

```json
  "version": "19.2.0",
```

to:

```json
  "version": "19.3.0",
```

- [ ] **Step 2: Create the changelog entry**

Create `changelog/19.3.0.md`:

```markdown
# 19.3.0

## Behavior change: total row shows only on the last pagination page by default

When pagination is enabled, the total (footer) row now renders **only on the
last page** instead of on every page. This fixes the misleading impression that
a mid-table page is the end of the data when the sticky total row sits at the
bottom of every page.

To restore the previous "total on every page" behavior, set the new
`totalRowCfg.showOnEveryPage: true` flag.

| Pagination | `showOnEveryPage` | Total row |
|---|---|---|
| disabled | (n/a) | always shown |
| enabled | `false` / unset (default) | last page only |
| enabled | `true` | every page |

Notes:
- A single page (data fits) counts as the last page, so the total still shows.
- Works for both `mode: 'client'` and `mode: 'server'`.
- Sticky behavior (`stickyCfg.total`) is preserved on the page where the total shows.

### Migration

If you relied on the total row appearing on every page:

```ts
totalRowCfg: {
  enable: true,
  showOnEveryPage: true,
}
```
```

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/package.json changelog/19.3.0.md
git commit -m "chore(release): 19.3.0 — total row last-page default"
```

---

## Self-Review Notes

- **Spec coverage:** default last-page (Task 1/2), `showOnEveryPage` opt-in (Task 1/2), pagination-off always-visible (Task 1), single page (Task 1), empty data (Task 1), client + server branches (Task 1), DOM wiring + sticky preserved (Task 2), version/changelog (Task 3). All spec sections mapped.
- **Type consistency:** `isTotalRowVisible()` / `currentPaging()` / `showOnEveryPage` names are identical across the test file, component, and config interface.
- **No placeholders:** every step contains the exact code/command and expected output.
