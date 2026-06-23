# Directive-based template API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four `@Input() TemplateRef` props (`extendedRowTemplate`, `timelineMarkerTemplate`, `extraHeaderCellTopTemplate`, `extraHeaderCellBottomTemplate`) with structural directives mirroring `ngxAurCellDef`, enriching the row-template context so `$implicit` is the source object.

**Architecture:** Each directive is `standalone: false`, captures `TemplateRef` in its constructor, and is collected by the component via `@ContentChildren(...).changes` (OnPush-safe, dev-warn on duplicates). The HTML reads the resolved templates through getters and renders via `*ngTemplateOutlet`. Clean break — the `@Input`s are removed.

**Tech Stack:** Angular 19, Angular Material table (`multiTemplateDataRows`), Karma + Jasmine, TypeScript.

## Global Constraints

- **Mirror `ngxAurCellDef` exactly:** directive captures `TemplateRef` in constructor; component collects with `@ContentChildren(Dir, {descendants: true})`, resolves in `ngAfterContentInit`, subscribes to `.changes`, calls `this.cdr.markForCheck()`; dev-mode `console.warn` via `isDevMode()`.
- **Clean break:** remove the four `@Input()` declarations entirely. No `@deprecated` fallback, no dual code path.
- **Row context** (`ngxAurExpandedRowDef`, `ngxAurRowMarkerDef`) is `AurRowContext<T>`, mirroring `AurCellContext` minus `value`: `{ $implicit: rowSrc, row: TableRow<T>, rowSrc: T, index: number }`. `$implicit` is `rowSrc` (the source object), **not** the `TableRow` wrapper. `index` = `row.id` (0-based).
- **Extra-header context** stays `{ key: string, index: number }` (`AurExtraHeaderContext`) — only delivery changes.
- **Behavior-preserving migration rule for the two row templates:** a positional `let-X` (old `$implicit` = wrapper) becomes `let-X="row"` (the wrapper is now under the `row` slot). Named slots (`let-key="key"`) are unchanged.
- **Directive selectors / classes / files:**
  - `[ngxAurExpandedRowDef]` → `NgxAurExpandedRowDefDirective` → `directive/ngx-aur-expanded-row-def.directive.ts`
  - `[ngxAurRowMarkerDef]` → `NgxAurRowMarkerDefDirective` → `directive/ngx-aur-row-marker-def.directive.ts`
  - `[ngxAurExtraHeaderTopDef]` → `NgxAurExtraHeaderTopDefDirective` → `directive/ngx-aur-extra-header-top-def.directive.ts`
  - `[ngxAurExtraHeaderBottomDef]` → `NgxAurExtraHeaderBottomDefDirective` → `directive/ngx-aur-extra-header-bottom-def.directive.ts`
- **Version:** 19.10.0. Changelog `changelog/19.10.0.md`, migration `docs/MIGRATION-19.10.0.md`.
- **Test command (lib):** `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
- **Build command (lib):** `npm run build_lib`
- **Build command (demo):** `ng build aur-demo`
- Line numbers below reflect the file before this plan's edits and drift as tasks land. **Match by surrounding content, not by line number alone.**

---

### Task 1: Expanded-row directive + shared infrastructure

Establishes `AurRowContext`, the `resolveDef` helper, the `rowCtx` helper, and converts `extendedRowTemplate` → `ngxAurExpandedRowDef`. Migrates the three existing specs that bind `[extendedRowTemplate]` (required — the `@Input` is removed in this task).

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/model/AurRowContext.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-expanded-row-def.directive.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-row-def.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`
- Modify (migrate): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts`
- Modify (migrate): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-conditional-defs.spec.ts`
- Modify (migrate): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-click-disable.spec.ts`

**Interfaces:**
- Produces:
  - `AurRowContext<T> = { $implicit: T; row: TableRow<T>; rowSrc: T; index: number }`
  - `NgxAurExpandedRowDefDirective` with `templateRef: TemplateRef<AurRowContext<any>>`
  - Component getter `expandedRowTemplate: TemplateRef<AurRowContext<T>> | null`
  - Component method `rowCtx(element: TableRow<T>): AurRowContext<T>`
  - Private helper `resolveDef<C>(list, label, assign): Subscription`
  - Private field `defSubs: Subscription[]`

- [ ] **Step 1: Write the failing directive spec**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-row-def.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** Раскрытие через директиву ngxAurExpandedRowDef + обогащённый контекст. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef let-rowSrc let-row="row" let-i="index">
        <span class="d">{{ rowSrc.name }}|{{ row.rowSrc.name }}|{{ i }}</span>
      </ng-template>
    </aur-mat-table>
  `,
})
class ExpandedDefHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

/** Две директивы → dev-warn, берётся первая. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef><span class="first">FIRST</span></ng-template>
      <ng-template ngxAurExpandedRowDef><span class="second">SECOND</span></ng-template>
    </aur-mat-table>
  `,
})
class DuplicateDefHost {
  cfg: TableConfig<R> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: R[] = [{ name: 'a' }];
}

describe('ngxAurExpandedRowDef', () => {
  function rows(fixture: ComponentFixture<any>): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }

  it('доставляет detail-шаблон и обогащённый контекст ($implicit=rowSrc, row=wrapper, index=id)', () => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExpandedDefHost],
    });
    const fixture = TestBed.createComponent(ExpandedDefHost);
    fixture.detectChanges();
    rows(fixture)[0].click();
    fixture.detectChanges();
    const d = fixture.nativeElement.querySelector('.d') as HTMLElement;
    expect(d.textContent!.trim()).toBe('a|a|0');
  });

  it('multiTemplateDataRows включён: detail-строка существует в разметке', () => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExpandedDefHost],
    });
    const fixture = TestBed.createComponent(ExpandedDefHost);
    fixture.detectChanges();
    expect(fixture.componentInstance.table.expandedRowTemplate).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('tr.expanded-row').length).toBe(2);
  });

  it('две директивы → dev-warn, рендерится первая', () => {
    const warn = spyOn(console, 'warn');
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DuplicateDefHost],
    });
    const fixture = TestBed.createComponent(DuplicateDefHost);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('tr[mat-row]:not(.expanded-row)') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.first')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.second')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the spec, verify it fails**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — template parse error (`ngxAurExpandedRowDef` is not a known directive) / `expandedRowTemplate` not on component.

- [ ] **Step 3: Create `AurRowContext`**

Create `projects/ngx-aur-mat-table/src/lib/model/AurRowContext.ts`:

```ts
import { TableRow } from './TableRow';

/** Контекст row-level шаблонов (ngxAurExpandedRowDef / ngxAurRowMarkerDef). */
export interface AurRowContext<T = any> {
  /** Исходный объект строки (row.rowSrc). */
  $implicit: T;
  /** Строка таблицы: .rowSrc — исходный объект T, .id — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.id. */
  index: number;
}
```

- [ ] **Step 4: Create the directive**

Create `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-expanded-row-def.directive.ts`:

```ts
import { Directive, TemplateRef } from '@angular/core';
import { AurRowContext } from '../model/AurRowContext';

/**
 * Шаблон тела detail-строки (раскрытие). Ставится на <ng-template>,
 * спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurExpandedRowDef let-rowSrc let-row="row">…</ng-template>
 */
@Directive({
  selector: '[ngxAurExpandedRowDef]',
  standalone: false,
})
export class NgxAurExpandedRowDefDirective {
  constructor(public templateRef: TemplateRef<AurRowContext<any>>) {}
}
```

- [ ] **Step 5: Register the directive in the module**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`, add the import and include the class in both `declarations` and `exports`:

```ts
import {NgxAurExpandedRowDefDirective} from './directive/ngx-aur-expanded-row-def.directive';
```
Add `NgxAurExpandedRowDefDirective` to the `declarations` array (after `NgxAurCellDefDirective`) and to the `exports` array (after `NgxAurCellDefDirective`).

- [ ] **Step 6: Export from public API**

In `projects/ngx-aur-mat-table/src/public-api.ts`, add:

```ts
export * from './lib/directive/ngx-aur-expanded-row-def.directive'
export * from './lib/model/AurRowContext';
```

- [ ] **Step 7: Add component imports**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`, after the existing `AurCellContext` import (line ~56):

```ts
import {NgxAurExpandedRowDefDirective} from './directive/ngx-aur-expanded-row-def.directive';
import {AurRowContext} from './model/AurRowContext';
```

- [ ] **Step 8: Add the ContentChildren query, resolved field, getter, and `defSubs`**

In the component, next to the existing `cellDefs` query (after line ~140, the `private cellDefsSub?: Subscription;` line), add:

```ts
  @ContentChildren(NgxAurExpandedRowDefDirective, {descendants: true})
  private expandedRowDefs!: QueryList<NgxAurExpandedRowDefDirective>;
  private _expandedRowTpl: TemplateRef<AurRowContext<T>> | null = null;
  get expandedRowTemplate(): TemplateRef<AurRowContext<T>> | null { return this._expandedRowTpl; }

  /** Подписки на .changes собранных template-директив (отписка в ngOnDestroy). */
  private defSubs: Subscription[] = [];
```

- [ ] **Step 9: Remove the old `@Input() extendedRowTemplate`**

Delete this line (was line 158):

```ts
  @Input() extendedRowTemplate: TemplateRef<any> | null = null;
```

- [ ] **Step 10: Add the `resolveDef` and `rowCtx` helpers**

After `rebuildCellTemplates()` (ends ~line 393), add:

```ts
  /**
   * Резолвит одно-слотовую template-директиву: ставит первую в assign, dev-warn при
   * нескольких, подписывается на .changes (OnPush). Зеркало механизма cellDefs.
   */
  private resolveDef<C>(
    list: QueryList<{ templateRef: TemplateRef<C> }>,
    selector: string,
    assign: (tpl: TemplateRef<C> | null) => void,
  ): Subscription {
    const apply = () => {
      if (isDevMode() && list.length > 1) {
        console.warn(`[aur-mat-table] обнаружено несколько ${selector}; используется первый.`);
      }
      assign(list.first?.templateRef ?? null);
      this.cdr.markForCheck();            // таблица OnPush
    };
    apply();
    return list.changes.subscribe(apply);
  }

  /** Контекст row-level шаблона (обогащённый, как AurCellContext минус value). */
  rowCtx(element: TableRow<T>): AurRowContext<T> {
    return { $implicit: element.rowSrc, row: element, rowSrc: element.rowSrc, index: element.id };
  }
```

- [ ] **Step 11: Wire resolution in `ngAfterContentInit`**

Extend the existing `ngAfterContentInit()` (lines 375-381) so it also resolves the expanded-row directive:

```ts
  ngAfterContentInit(): void {
    this.rebuildCellTemplates();
    this.cellDefsSub = this.cellDefs.changes.subscribe(() => {
      this.rebuildCellTemplates();
      this.cdr.markForCheck();            // таблица OnPush
    });
    this.defSubs.push(
      this.resolveDef(this.expandedRowDefs, 'ngxAurExpandedRowDef', t => this._expandedRowTpl = t),
    );
  }
```

- [ ] **Step 12: Dispose `defSubs` in `ngOnDestroy`**

In `ngOnDestroy()` (line ~1012), after `this.cellDefsSub?.unsubscribe();`:

```ts
    this.defSubs.forEach(s => s.unsubscribe());
```

- [ ] **Step 13: Update the in-code reference at the click guard**

In `handleExpandOnClick` (line ~895), change:

```ts
    if (!this.extendedRowTemplate) return;
```
to:
```ts
    if (!this.expandedRowTemplate) return;
```

- [ ] **Step 14: Update the component HTML**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`:

- Line 39: `[multiTemplateDataRows]="expandedRowTemplate !== null"`
- Line 472: `<ng-container *ngIf="expandedRowTemplate">`
- Line 487: `<ng-container *ngTemplateOutlet="expandedRowTemplate; context: rowCtx(element)"></ng-container>`
- Line 494: `<ng-container *ngIf="expandedRowTemplate">`

- [ ] **Step 15: Migrate the three existing specs that bind `[extendedRowTemplate]`**

Apply this exact transform at every site. The old binding + sibling `<ng-template #X>` becomes a projected directive `<ng-template>` inside `<aur-mat-table>...</aur-mat-table>`; the positional `let-row` becomes `let-row="row"` (behavior-preserving — `row` keeps holding the `TableRow` wrapper, so `row.rowSrc.name` is unchanged).

Canonical before/after:

```html
<!-- before -->
<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
               [extendedRowTemplate]="detail"
               [highlight]="hl"
               (expandedRowChange)="single.push($event)"></aur-mat-table>
<ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>

<!-- after -->
<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
               [highlight]="hl"
               (expandedRowChange)="single.push($event)">
  <ng-template ngxAurExpandedRowDef let-row="row"><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
</aur-mat-table>
```

Sites to migrate:
- `ngx-aur-mat-table-expanded-rows.spec.ts`: every host (`[extendedRowTemplate]="detail"` at lines 15, 128, 184, 206, 228, 248, 387). Each has a sibling `<ng-template #detail let-row>…</ng-template>` (or self-closed `<aur-mat-table … [extendedRowTemplate]="detail"></aur-mat-table>` at 387 — move the existing `#detail` template inside). All `#detail` bodies use `row.rowSrc.*`, so `let-row="row"`.
- `ngx-aur-mat-table-conditional-defs.spec.ts`: `ExpandedHostComponent` (lines 35-47) — `#details let-row` with `row.rowSrc.name` → `let-row="row"`.
- `ngx-aur-mat-table-row-click-disable.spec.ts`: `DisabledHostComponent` (lines 11-19) — `#detail let-row` with `row.rowSrc.name` → `let-row="row"`.

> The "renders no expanded rows without extendedRowTemplate" test (`conditional-defs.spec.ts:111`) and the "клик по строке без [extendedRowTemplate]" test (`expanded-rows.spec.ts:116`) use hosts with **no** detail template — leave those hosts as-is (no directive projected); they keep asserting the empty case.

- [ ] **Step 16: Run the full lib suite, verify green**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — new `ngxAurExpandedRowDef` spec green; all migrated specs green; no remaining reference to `extendedRowTemplate` as an input.

- [ ] **Step 17: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "feat(template-api): ngxAurExpandedRowDef directive + AurRowContext (replaces [extendedRowTemplate])"
```

---

### Task 2: Row-marker directive (`ngxAurRowMarkerDef`)

Reuses `AurRowContext`, `resolveDef`, and `rowCtx` from Task 1. No existing spec binds `timelineMarkerTemplate`; the demo migration is Task 4.

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-row-marker-def.directive.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-marker-def.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`

**Interfaces:**
- Consumes: `AurRowContext<T>`, `resolveDef`, `rowCtx`, `defSubs` (Task 1).
- Produces: `NgxAurRowMarkerDefDirective` (`templateRef: TemplateRef<AurRowContext<any>>`); component getter `rowMarkerTemplate: TemplateRef<AurRowContext<T>> | null`.

- [ ] **Step 1: Write the failing spec**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-marker-def.spec.ts`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { TimelineProvider } from './providers/TimelineProvider';

interface R { name: string; status: string; }

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurRowMarkerDef let-rowSrc let-i="index">
        <span class="m">{{ rowSrc.status }}-{{ i }}</span>
      </ng-template>
    </aur-mat-table>
  `,
})
class MarkerDefHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    timelineCfg: { enable: true },
  };
  data: R[] = [{ name: 'a', status: 'ok' }, { name: 'b', status: 'warn' }];
}

describe('ngxAurRowMarkerDef', () => {
  function markers(fixture: ComponentFixture<any>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.m'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('доставляет marker-шаблон и обогащённый контекст (rowSrc + index)', () => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MarkerDefHost],
    });
    const fixture = TestBed.createComponent(MarkerDefHost);
    fixture.detectChanges();
    expect(markers(fixture)).toEqual(['ok-0', 'warn-1']);
  });
});
```

> **Implementer note:** confirm the exact `timelineCfg`/`TimelineProvider` enable shape from `model/ColumnConfig.ts` + the timeline demo (`table-timeline.component.ts`); use whatever the demo uses so the marker column renders. Drop the unused `TimelineProvider` import if not needed. The assertion (enriched context delivered via the directive) is the spec's point.

- [ ] **Step 2: Run, verify it fails**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `ngxAurRowMarkerDef` is not a known directive.

- [ ] **Step 3: Create the directive**

Create `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-row-marker-def.directive.ts`:

```ts
import { Directive, TemplateRef } from '@angular/core';
import { AurRowContext } from '../model/AurRowContext';

/**
 * Шаблон маркера строки (timeline). Ставится на <ng-template>,
 * спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurRowMarkerDef let-rowSrc let-row="row">…</ng-template>
 */
@Directive({
  selector: '[ngxAurRowMarkerDef]',
  standalone: false,
})
export class NgxAurRowMarkerDefDirective {
  constructor(public templateRef: TemplateRef<AurRowContext<any>>) {}
}
```

- [ ] **Step 4: Register in module + public API**

Module: import `NgxAurRowMarkerDefDirective` and add it to `declarations` and `exports`.
Public API: `export * from './lib/directive/ngx-aur-row-marker-def.directive'`.

- [ ] **Step 5: Add the query, field, getter, and import in the component**

Import:
```ts
import {NgxAurRowMarkerDefDirective} from './directive/ngx-aur-row-marker-def.directive';
```
Next to `expandedRowDefs`:
```ts
  @ContentChildren(NgxAurRowMarkerDefDirective, {descendants: true})
  private rowMarkerDefs!: QueryList<NgxAurRowMarkerDefDirective>;
  private _rowMarkerTpl: TemplateRef<AurRowContext<T>> | null = null;
  get rowMarkerTemplate(): TemplateRef<AurRowContext<T>> | null { return this._rowMarkerTpl; }
```

- [ ] **Step 6: Remove the old `@Input() timelineMarkerTemplate`**

Delete (was line 166):
```ts
  @Input() timelineMarkerTemplate: TemplateRef<any> | null = null;
```

- [ ] **Step 7: Wire resolution in `ngAfterContentInit`**

Add to the `this.defSubs.push(...)` call:
```ts
      this.resolveDef(this.rowMarkerDefs, 'ngxAurRowMarkerDef', t => this._rowMarkerTpl = t),
```

- [ ] **Step 8: Update the component HTML**

Lines 76-77:
```html
              <ng-container *ngIf="rowMarkerTemplate; else defaultMarker">
                <ng-container *ngTemplateOutlet="rowMarkerTemplate; context: rowCtx(element)"></ng-container>
```

- [ ] **Step 9: Run the suite, verify green**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "feat(template-api): ngxAurRowMarkerDef directive (replaces [timelineMarkerTemplate])"
```

---

### Task 3: Extra-header directives (`ngxAurExtraHeaderTopDef` / `ngxAurExtraHeaderBottomDef`)

Adds `AurExtraHeaderContext` and the two extra-header directives. Context stays `{key, index}` (delivery-only change). Migrates `conditional-defs.spec.ts`'s extra-header host.

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/model/AurExtraHeaderContext.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-extra-header-top-def.directive.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-extra-header-bottom-def.directive.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-extra-header-def.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`
- Modify (migrate): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-conditional-defs.spec.ts`

**Interfaces:**
- Consumes: `resolveDef`, `defSubs` (Task 1).
- Produces: `AurExtraHeaderContext = { key: string; index: number }`; `NgxAurExtraHeaderTopDefDirective`, `NgxAurExtraHeaderBottomDefDirective` (`templateRef: TemplateRef<AurExtraHeaderContext>`); getters `extraHeaderTopTemplate`, `extraHeaderBottomTemplate`.

- [ ] **Step 1: Write the failing spec**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-extra-header-def.spec.ts`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExtraHeaderTopDef let-key="key"><span class="top">T-{{ key }}</span></ng-template>
      <ng-template ngxAurExtraHeaderBottomDef let-key="key"><span class="bottom">B-{{ key }}</span></ng-template>
    </aur-mat-table>
  `,
})
class ExtraHeaderDefHost {
  cfg: TableConfig<R> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: R[] = [{ name: 'a' }];
}

describe('ngxAurExtraHeaderTopDef / ngxAurExtraHeaderBottomDef', () => {
  let fixture: ComponentFixture<ExtraHeaderDefHost>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ExtraHeaderDefHost],
    });
    fixture = TestBed.createComponent(ExtraHeaderDefHost);
    fixture.detectChanges();
  });

  it('доставляет extra-top шаблон с контекстом {key}', () => {
    const top = fixture.nativeElement.querySelector('.top') as HTMLElement;
    expect(top).not.toBeNull();
    expect(top.textContent!.trim()).toBe('T-name');
  });

  it('доставляет extra-bottom шаблон с контекстом {key}', () => {
    const bottom = fixture.nativeElement.querySelector('.bottom') as HTMLElement;
    expect(bottom).not.toBeNull();
    expect(bottom.textContent!.trim()).toBe('B-name');
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `ngxAurExtraHeaderTopDef` / `ngxAurExtraHeaderBottomDef` are not known directives.

- [ ] **Step 3: Create `AurExtraHeaderContext`**

Create `projects/ngx-aur-mat-table/src/lib/model/AurExtraHeaderContext.ts`:

```ts
/** Контекст extra-header шаблонов (ngxAurExtraHeaderTopDef / ngxAurExtraHeaderBottomDef). */
export interface AurExtraHeaderContext {
  /** Ключ колонки. */
  key: string;
  /** Индекс колонки. */
  index: number;
}
```

- [ ] **Step 4: Create the two directives**

`projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-extra-header-top-def.directive.ts`:

```ts
import { Directive, TemplateRef } from '@angular/core';
import { AurExtraHeaderContext } from '../model/AurExtraHeaderContext';

/** Шаблон верхней доп-ячейки заголовка. <ng-template ngxAurExtraHeaderTopDef let-key="key" let-index="index">…</ng-template> */
@Directive({
  selector: '[ngxAurExtraHeaderTopDef]',
  standalone: false,
})
export class NgxAurExtraHeaderTopDefDirective {
  constructor(public templateRef: TemplateRef<AurExtraHeaderContext>) {}
}
```

`projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-extra-header-bottom-def.directive.ts`:

```ts
import { Directive, TemplateRef } from '@angular/core';
import { AurExtraHeaderContext } from '../model/AurExtraHeaderContext';

/** Шаблон нижней доп-ячейки заголовка. <ng-template ngxAurExtraHeaderBottomDef let-key="key" let-index="index">…</ng-template> */
@Directive({
  selector: '[ngxAurExtraHeaderBottomDef]',
  standalone: false,
})
export class NgxAurExtraHeaderBottomDefDirective {
  constructor(public templateRef: TemplateRef<AurExtraHeaderContext>) {}
}
```

- [ ] **Step 5: Register in module + public API**

Module: import both directives; add both to `declarations` and `exports`.
Public API:
```ts
export * from './lib/directive/ngx-aur-extra-header-top-def.directive'
export * from './lib/directive/ngx-aur-extra-header-bottom-def.directive'
export * from './lib/model/AurExtraHeaderContext';
```

- [ ] **Step 6: Add queries, fields, getters, imports in the component**

Imports:
```ts
import {NgxAurExtraHeaderTopDefDirective} from './directive/ngx-aur-extra-header-top-def.directive';
import {NgxAurExtraHeaderBottomDefDirective} from './directive/ngx-aur-extra-header-bottom-def.directive';
import {AurExtraHeaderContext} from './model/AurExtraHeaderContext';
```
Next to the other def queries:
```ts
  @ContentChildren(NgxAurExtraHeaderTopDefDirective, {descendants: true})
  private extraHeaderTopDefs!: QueryList<NgxAurExtraHeaderTopDefDirective>;
  private _extraHeaderTopTpl: TemplateRef<AurExtraHeaderContext> | null = null;
  get extraHeaderTopTemplate(): TemplateRef<AurExtraHeaderContext> | null { return this._extraHeaderTopTpl; }

  @ContentChildren(NgxAurExtraHeaderBottomDefDirective, {descendants: true})
  private extraHeaderBottomDefs!: QueryList<NgxAurExtraHeaderBottomDefDirective>;
  private _extraHeaderBottomTpl: TemplateRef<AurExtraHeaderContext> | null = null;
  get extraHeaderBottomTemplate(): TemplateRef<AurExtraHeaderContext> | null { return this._extraHeaderBottomTpl; }
```

- [ ] **Step 7: Remove the old extra-header `@Input`s**

Delete (were lines 143 and 146, including their `// @ts-ignore` lines):
```ts
  // @ts-ignore
  @Input() extraHeaderCellTopTemplate: TemplateRef<any> | null;

  // @ts-ignore
  @Input() extraHeaderCellBottomTemplate: TemplateRef<any> | null;
```

- [ ] **Step 8: Wire resolution in `ngAfterContentInit`**

Add to the `this.defSubs.push(...)` call:
```ts
      this.resolveDef(this.extraHeaderTopDefs, 'ngxAurExtraHeaderTopDef', t => this._extraHeaderTopTpl = t),
      this.resolveDef(this.extraHeaderBottomDefs, 'ngxAurExtraHeaderBottomDef', t => this._extraHeaderBottomTpl = t),
```

- [ ] **Step 9: Update the component HTML**

Replace the four references to the old input names with the getters (contexts unchanged):
- Line 416: `<ng-container *ngIf="extraHeaderTopTemplate">`
- Line 421: `*ngTemplateOutlet="extraHeaderTopTemplate; context: {key: extraTopCell.replace(EXTRA_HEADER_CELL_TOP_SUFFIX, ''), index: index}"`
- Line 428: `<ng-container *ngIf="extraHeaderBottomTemplate">`
- Line 433: `*ngTemplateOutlet="extraHeaderBottomTemplate; context: {key: extraBottomCell.replace(EXTRA_HEADER_CELL_BOTTOM_SUFFIX, ''), index: index}"`
- Line 439: `<ng-container *ngIf="extraHeaderTopTemplate">`
- Line 451: `<ng-container *ngIf="extraHeaderBottomTemplate">`

- [ ] **Step 10: Migrate `conditional-defs.spec.ts` extra-header host**

`ExtraHeaderHostComponent` (lines 17-33): move both `<ng-template>`s inside `<aur-mat-table>` as directives; context is unchanged (`let-key="key"`), so bodies are untouched:

```ts
@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExtraHeaderTopDef let-key="key"><span class="top-cell">T-{{ key }}</span></ng-template>
      <ng-template ngxAurExtraHeaderBottomDef let-key="key"><span class="bottom-cell">B-{{ key }}</span></ng-template>
    </aur-mat-table>`
})
class ExtraHeaderHostComponent {
  cfg = cfg();
  data: Row[] = [{name: 'a'}];
}
```

- [ ] **Step 11: Run the suite, verify green**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — no remaining reference to any of the four removed `@Input`s.

- [ ] **Step 12: Verify the library builds**

Run: `npm run build_lib`
Expected: build succeeds (confirms public-api exports + types resolve).

- [ ] **Step 13: Commit**

```bash
git add projects/ngx-aur-mat-table/src
git commit -m "feat(template-api): ngxAurExtraHeader{Top,Bottom}Def directives (replaces extra-header @Inputs)"
```

---

### Task 4: Migrate the demo app

Convert the three demo pages to the directive form so `aur-demo` compiles against the new API.

**Files:**
- Modify: `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.html`
- Modify: `projects/aur-demo/src/app/table-timeline/table-timeline.component.html`
- Modify: `projects/aur-demo/src/app/table-with-top-column/table-with-top-column.component.html`

**Interfaces:**
- Consumes: all four directives + the migration rule (Global Constraints).

- [ ] **Step 1: Migrate `expanding-row.component.html`**

All three `<aur-mat-table … [extendedRowTemplate]="rowTemplate">` instances (lines 25-29, 34-39, 44-49) drop the input and project the template. The shared `#rowTemplate` (lines 51-53) feeds `<app-row-details [row]="row">`, which today receives the `TableRow` wrapper — preserve that with `let-row="row"`. Because the directive is single-slot per table, inline the template into each `<aur-mat-table>`:

```html
<aur-mat-table [tableData]="tableData" [tableConfig]="tableConfig">
  <ng-template ngxAurExpandedRowDef let-row="row">
    <app-row-details [row]="row"></app-row-details>
  </ng-template>
</aur-mat-table>
```
Apply the same inlined `<ng-template ngxAurExpandedRowDef let-row="row">…</ng-template>` to the Controlled (`[(expandedRow)]`) and Multiple (`[(expandedRows)]`) tables, keeping their existing inputs/outputs. Remove the now-unused standalone `#rowTemplate` template and update the prose on line 2 (mentions the `extendedRowTemplate` Input) to describe `ngxAurExpandedRowDef`.

- [ ] **Step 2: Migrate `table-timeline.component.html`**

`customMarker` (lines 13-17) uses `let-element` + `element.rowSrc.status`. Preserve by binding the wrapper to `let-element="row"`:

```html
<aur-mat-table [tableData]="tableData" [tableConfig]="tableConfigCustomMarker">
  <ng-template ngxAurRowMarkerDef let-element="row">
    <div class="custom-marker" [ngClass]="getMarkerClass(element.rowSrc.status)">
      {{ getMarkerIcon(element.rowSrc.status) }}
    </div>
  </ng-template>
</aur-mat-table>
```

- [ ] **Step 3: Migrate `table-with-top-column.component.html`**

Move both `<ng-template>`s inside `<aur-mat-table>` as directives; context is unchanged:

```html
<aur-mat-table [tableData]="tableData" [tableConfig]="tableConfig">
  <ng-template ngxAurExtraHeaderTopDef let-key="key" let-index="index">
    <div (click)="alert('Click on ' + key)" class="extra-top-header">
      Extra top header key: '{{ key }}' index={{index}}
    </div>
  </ng-template>
  <ng-template ngxAurExtraHeaderBottomDef let-key="key" let-index="index">
    <div (click)="alert('Click on ' + key)" class="extra-bottom-header">
      Extra bottom header key: '{{ key }}' index={{index}}
    </div>
  </ng-template>
</aur-mat-table>
```

- [ ] **Step 4: Build the demo, verify it compiles**

Run: `ng build aur-demo`
Expected: build succeeds with no template binding / unknown-directive errors.

- [ ] **Step 5: Commit**

```bash
git add projects/aur-demo/src
git commit -m "docs(demo): migrate demo pages to directive template API"
```

---

### Task 5: Documentation + changelog + JSDoc cleanup

**Files:**
- Create: `changelog/19.10.0.md`
- Create: `docs/MIGRATION-19.10.0.md`
- Modify: `README.md`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (JSDoc at lines 78-79)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (JSDoc at lines 226, 395)

**Interfaces:** none (docs).

- [ ] **Step 1: Write the changelog**

Create `changelog/19.10.0.md`. Match the existing English-prose style of other `changelog/*.md` files (read `changelog/19.9.0.md` first for tone/structure). Cover: the four templates now delivered via directives (`ngxAurExpandedRowDef`, `ngxAurRowMarkerDef`, `ngxAurExtraHeaderTopDef`, `ngxAurExtraHeaderBottomDef`); the `@Input`s removed (breaking); the enriched `AurRowContext` (`$implicit` is now `rowSrc`, breaking for row-template bodies); new exported types `AurRowContext` / `AurExtraHeaderContext`; pointer to `docs/MIGRATION-19.10.0.md`. State the suite is green.

- [ ] **Step 2: Write the migration guide**

Create `docs/MIGRATION-19.10.0.md` (read `docs/MIGRATION-19.9.0.md` first for format). Include both breaking dimensions with copy-paste before/after:

a) **Delivery** — for each template, `[input]="tpl"` (sibling `<ng-template #tpl>`) → projected `<ng-template directive>` inside `<aur-mat-table>`:

| Removed `@Input` | New directive |
|---|---|
| `[extendedRowTemplate]` | `ngxAurExpandedRowDef` |
| `[timelineMarkerTemplate]` | `ngxAurRowMarkerDef` |
| `[extraHeaderCellTopTemplate]` | `ngxAurExtraHeaderTopDef` |
| `[extraHeaderCellBottomTemplate]` | `ngxAurExtraHeaderBottomDef` |

b) **Context (row templates only)** — `$implicit` is now `rowSrc`, not the `TableRow` wrapper. To keep using the wrapper, bind `let-x="row"`. Show the two concrete cases:
- expanded: `let-row` (was wrapper) → `let-row="row"` to keep `row.rowSrc.*`, or `let-rowSrc` to use the source directly.
- timeline marker: `let-element` (was wrapper) → `let-element="row"` to keep `element.rowSrc.*`, or `let-element` (now rowSrc) + `element.*`.

Note extra-header context is unchanged.

- [ ] **Step 3: Update the README**

In `README.md`, update the template-related sections to the directive form: the expanded-rows / `extendedRowCfg` section's examples (replace `[extendedRowTemplate]` usage), and any timeline / extra-header / template-input documentation. Add the four directive selectors and the `AurRowContext` shape. (Read the relevant sections first; keep the existing Russian prose style.)

- [ ] **Step 4: Update stale JSDoc references**

- `model/ColumnConfig.ts` lines 78-79: replace `extendedRowTemplate` / `[extendedRowTemplate]` references with `ngxAurExpandedRowDef`.
- `ngx-aur-mat-table.component.ts` line 226: the `@deprecated` note mentions `extraHeaderCellTopTemplate`/`extraHeaderCellBottomTemplate` — update to the directive names.
- `ngx-aur-mat-table.component.ts` line 395: comment "как у extendedRowTemplate" → "как у ngxAurExpandedRowDef".

- [ ] **Step 5: Verify lib still builds (JSDoc edits touch source)**

Run: `npm run build_lib`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add changelog/19.10.0.md docs/MIGRATION-19.10.0.md README.md projects/ngx-aur-mat-table/src
git commit -m "docs(template-api): changelog 19.10.0, migration guide, README + JSDoc"
```

---

## Self-Review

**Spec coverage:**
- All four templates → directives: Tasks 1 (`ngxAurExpandedRowDef`), 2 (`ngxAurRowMarkerDef`), 3 (`ngxAurExtraHeaderTopDef`/`BottomDef`). ✓
- Clean break (remove `@Input`s): Step 1.9, 2.6, 3.7. ✓
- Enriched `AurRowContext`: Task 1 Step 3 + `rowCtx` Step 10; used by Tasks 1 & 2 HTML. ✓
- Extra-header context unchanged: Task 3 (no `rowCtx`). ✓
- Module + public-api exports: each task. ✓
- Migrate existing specs: Task 1 (expanded-rows, conditional-defs expanded, row-click-disable), Task 3 (conditional-defs extra-header). No spec binds `timelineMarkerTemplate`. ✓
- Demo migration: Task 4. ✓
- Versioned docs 19.10.0 + migration guide + README + JSDoc: Task 5. ✓
- `multiTemplateDataRows` timing risk: pinned by Task 1 Step 1 test 2. ✓
- Dev-warn on duplicates: Task 1 Step 1 test 3 (+ `resolveDef` shared). ✓

**Type consistency:** `expandedRowTemplate`/`rowMarkerTemplate` typed `TemplateRef<AurRowContext<T>>`; extra-header getters `TemplateRef<AurExtraHeaderContext>`; `resolveDef<C>` accepts `QueryList<{templateRef: TemplateRef<C>}>` (all four directives expose `templateRef`); `rowCtx` returns `AurRowContext<T>`; `defSubs: Subscription[]`. Consistent across tasks. ✓

**Placeholder scan:** No TBD/TODO. Repetitive existing-spec migrations are specified by an exact canonical transform + enumerated sites (mechanical, identical) rather than re-transcribing each host. ✓

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-23-directive-template-api.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session with checkpoints.

**Which approach?**
