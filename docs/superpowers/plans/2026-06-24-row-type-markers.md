# Row Type Markers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach stable, namespaced marker classes (`aur-data-row` / `aur-expanded-row` / `aur-total-row`) to the three table row types so consumers can distinguish and style them from their own CSS.

**Architecture:** Pure template change — three static `class` attributes added to the existing `<tr>` elements in `ngx-aur-mat-table.component.html`. Angular merges a static `class` with the element's existing `[ngClass]`/`[style]` bindings, so the markers are additive and touch no logic. No TypeScript API, no component logic, no SCSS. Backed by a new unit spec and documented in README + demo.

**Tech Stack:** Angular 19.2 (workspace Material/CDK 18.2), TypeScript 5.8, Karma + Jasmine, `NgxAurMatTableModule` (component is `ChangeDetectionStrategy.OnPush`, `standalone: false`).

## Global Constraints

- Marker class names are EXACTLY: `aur-data-row`, `aur-expanded-row`, `aur-total-row`.
- Keep the legacy `expanded-row` class on the detail `<tr>` (tests and the expand animation depend on it).
- Template-only feature: do NOT modify `model/ColumnConfig.ts`, `ngx-aur-mat-table.component.ts`, or `ngx-aur-mat-table.component.scss`. Markers carry no library styling (neutral posture).
- Markers must be disjoint: each marker appears only on its own `<tr>` type.
- Existing test selectors must keep working: `tr[mat-row]:not(.expanded-row)` (data rows) and `tr.expanded-row` (detail rows).
- Lib unit tests: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`.
- Lib build: `npm run build_lib` (= `ng build ngx-aur-mat-table`).
- Demo build: `ng build aur-demo`.
- Changelog (`changelog/19.13.0.md`) and `package.json` bump (`19.11.0` → `19.13.0`) are DEFERRED to the release step (see end of plan) — not part of the feature commits.
- Commit messages: Conventional Commits; end body with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Marker classes on the three row types (TDD)

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-type-markers.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (3 `<tr>` lines: data `~462`, detail `500`, total `505`)

**Interfaces:**
- Consumes: nothing (uses public `aur-mat-table` selector, `TableConfig`, `ngxAurExpandedRowDef`).
- Produces: three CSS marker classes on rendered rows — `aur-data-row` (data `<tr>`), `aur-expanded-row` (detail `<tr>`, alongside legacy `expanded-row`), `aur-total-row` (footer `<tr>`). No TS exports.

- [ ] **Step 1: Write the failing test**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-type-markers.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** Хост со всеми тремя типами строк: data + detail (ngxAurExpandedRowDef) + total (totalConverter). */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurExpandedRowDef let-row="row">
        <span class="d">{{ row.rowSrc.name }}</span>
      </ng-template>
    </aur-mat-table>
  `,
})
class MarkersHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length },
    ],
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('row type markers (aur-data-row / aur-expanded-row / aur-total-row)', () => {
  let fixture: ComponentFixture<MarkersHost>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MarkersHost],
    });
    fixture = TestBed.createComponent(MarkersHost);
    fixture.detectChanges();
  });

  const dataRows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tr.aur-data-row'));
  const detailRows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tr.aur-expanded-row'));
  const totalRow = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('tr.aur-total-row');

  it('маркеры присутствуют на каждом типе строки', () => {
    expect(dataRows().length).toBe(2);
    expect(detailRows().length).toBe(2);
    expect(totalRow()).not.toBeNull();
    // detail сохраняет legacy-класс expanded-row
    detailRows().forEach(r => expect(r.classList.contains('expanded-row')).toBeTrue());
    // total — это footer-строка Material
    expect(totalRow()!.classList.contains('mat-mdc-footer-row')).toBeTrue();
  });

  it('маркеры дизъюнктны (один тип на строку)', () => {
    dataRows().forEach(r => {
      expect(r.classList.contains('aur-expanded-row')).withContext('data !expanded').toBeFalse();
      expect(r.classList.contains('aur-total-row')).withContext('data !total').toBeFalse();
    });
    detailRows().forEach(r => {
      expect(r.classList.contains('aur-data-row')).withContext('detail !data').toBeFalse();
      expect(r.classList.contains('aur-total-row')).withContext('detail !total').toBeFalse();
    });
    const total = totalRow()!;
    expect(total.classList.contains('aur-data-row')).withContext('total !data').toBeFalse();
    expect(total.classList.contains('aur-expanded-row')).withContext('total !expanded').toBeFalse();
  });

  it('back-compat селекторов сохранён', () => {
    // data-строки селектятся «от обратного» — как в существующих expanded-спеках
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)').length).toBe(2);
    // detail-строки по-прежнему ловятся legacy-классом
    expect(fixture.nativeElement.querySelectorAll('tr.expanded-row').length).toBe(2);
  });
});
```

- [ ] **Step 2: Run the suite to verify the new tests fail**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `row type markers` describe fails (e.g. `Expected 0 to be 2` for `dataRows().length`, since `tr.aur-data-row` matches nothing yet). All other specs PASS.

- [ ] **Step 3: Add the three marker classes in the template**

In `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`:

**(a) data row** (`~line 462`) — add a static `class`:

```
        <tr mat-row #rowLink
```
→
```
        <tr mat-row #rowLink class="aur-data-row"
```

**(b) detail row** (`line 500`) — extend the existing class list:

```
          <tr mat-row class="expanded-row" *matRowDef="let row; columns: ['expandedRow']"></tr>
```
→
```
          <tr mat-row class="expanded-row aur-expanded-row" *matRowDef="let row; columns: ['expandedRow']"></tr>
```

**(c) total/footer row** (`line 505`) — add a static `class` (do NOT touch the sub-footer row):

```
          <tr mat-footer-row *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
```
→
```
          <tr mat-footer-row class="aur-total-row" *matFooterRowDef="_displayColumns; sticky: this.tableConfig.stickyCfg?.total"
```

- [ ] **Step 4: Run the suite to verify the new tests pass**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — the `row type markers` describe (3 specs) is green AND every pre-existing spec is still green (markers are additive; `tr[mat-row]:not(.expanded-row)` and `tr.expanded-row` counts unchanged).

- [ ] **Step 5: Build the library to confirm the template compiles**

Run: `npm run build_lib`
Expected: build succeeds with no template/AOT errors.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-type-markers.spec.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "feat(rows): stable marker classes aur-data-row/aur-expanded-row/aur-total-row" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Document the markers in README

**Files:**
- Modify: `README.md` (insert a `###` subsection at the end of the `## Row config & styling` section, immediately before `### Migration from pre-19.1.0`)

**Interfaces:**
- Consumes: the marker classes shipped in Task 1.
- Produces: nothing code-facing (documentation only).

- [ ] **Step 1: Insert the marker-classes subsection**

In `README.md`, find the line `### Migration from pre-19.1.0` and insert the following block immediately BEFORE it (leave a blank line between the new block and the `### Migration` heading):

````markdown
### Row type markers (CSS hooks)

Every rendered `<tr>` carries a stable, namespaced marker class, so the three row
types are explicitly distinguishable from your own (global / `::ng-deep`) CSS:

| Row type | Marker class |
|---|---|
| data row | `aur-data-row` |
| detail / expanded row (`ngxAurExpandedRowDef`) | `aur-expanded-row` |
| total / footer row | `aur-total-row` |

The library attaches no styling of its own to these classes — they are pure hooks.
The detail row also keeps its legacy `expanded-row` class for backward compatibility.

```css
/* neutralize the hover your app/theme applies to the detail row */
tr.aur-expanded-row:hover { background: none; }

/* give the detail "drawer" a background and drop its own bottom border */
tr.aur-expanded-row { background: #fafafa; }
tr.aur-expanded-row td.expanded-cell { border-bottom: none; }

/* emphasize the total row */
tr.aur-total-row { font-weight: 600; }
```

> A collapsed detail row has `height: 0`, so its `:hover` never triggers — the marker
> targets the expanded one. Merging a detail row visually with its parent (removing the
> separator *between* them) is the parent data row's cell `border-bottom`, and is out of
> scope here.
````

- [ ] **Step 2: Verify the section reads correctly**

Open `README.md`, confirm the new `### Row type markers (CSS hooks)` subsection renders under `## Row config & styling`, the table has three rows, and the fenced ```css block is intact. No build needed (Markdown).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(readme): document row type marker classes" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Showcase the markers in the demo

**Files:**
- Modify: `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.html` (add an explanatory block before the first `<aur-mat-table>`)
- Modify: `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.scss` (currently empty — add the `::ng-deep` recipe so the detail rows in this demo visibly use the marker)

**Interfaces:**
- Consumes: the marker classes shipped in Task 1.
- Produces: nothing code-facing (demo only).

- [ ] **Step 1: Add the styling recipe to the demo SCSS**

`projects/aur-demo/src/app/table-expanding-row/expanding-row.component.scss` is empty. Set its full content to:

```scss
/* Маркер-классы строк — стилизуем detail обычным CSS.
   ::ng-deep нужен, т.к. <tr> принадлежит библиотечному компоненту (эмулированная инкапсуляция). */
:host ::ng-deep tr.aur-expanded-row {
  background: #fafafa;
}

:host ::ng-deep tr.aur-expanded-row:hover {
  background: #fafafa; /* гасим унаследованный hover на детали */
}

:host ::ng-deep tr.aur-expanded-row td.expanded-cell {
  border-bottom: none;
}
```

- [ ] **Step 2: Add an explanatory block to the demo HTML**

In `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.html`, find the first table opening:

```html
<aur-mat-table
  [tableData]="tableData"
  [tableConfig]="tableConfig">
```

Insert this block immediately BEFORE it:

```html
<hr/>
<h3>Маркер-классы типов строк</h3>
<p>Каждый <code>&lt;tr&gt;</code> несёт стабильный класс:
  <code>aur-data-row</code>, <code>aur-expanded-row</code>, <code>aur-total-row</code>.
  Стилизуйте их своим (глобальным / <code>::ng-deep</code>) CSS. В этом примере detail-строка
  получает фон и сброс hover (см. expanding-row.component.scss):</p>
<pre>
  :host ::ng-deep tr.aur-expanded-row &#123; background: #fafafa; &#125;
  :host ::ng-deep tr.aur-expanded-row:hover &#123; background: #fafafa; &#125;
</pre>

```

- [ ] **Step 3: Build the demo to confirm it compiles**

Run: `ng build aur-demo`
Expected: build succeeds (the HTML block is static markup; the SCSS is valid CSS).

- [ ] **Step 4: Commit**

```bash
git add projects/aur-demo/src/app/table-expanding-row/expanding-row.component.html \
        projects/aur-demo/src/app/table-expanding-row/expanding-row.component.scss
git commit -m "feat(demo): show row type marker classes in expanding-row demo" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Release (deferred — not part of feature commits)

Done when cutting the release (the user manages versioning, possibly bundling features):

- Add `changelog/19.13.0.md` via the `writing-changelog` skill — section «Добавлено»: три маркер-класса строк (`aur-data-row` / `aur-expanded-row` / `aur-total-row`) + ссылка на README-рецепты.
- Bump `projects/ngx-aur-mat-table/package.json` `version` `19.11.0` → `19.13.0`.

## Self-Review

**1. Spec coverage** (`2026-06-24-row-type-markers-design.md`):
- Three marker classes on data/detail/total `<tr>` → Task 1, Step 3 (a/b/c). ✓
- Legacy `expanded-row` kept → Task 1 Step 3(b) keeps it; asserted in Step 1 test. ✓
- No `ColumnConfig`/`component.ts`/SCSS change → Global Constraints + Task 1 modifies only the `.html`. ✓
- Disjointness → Task 1 test #2. ✓
- Back-compat selectors (`:not(.expanded-row)`, `tr.expanded-row`) → Task 1 test #3. ✓
- Regression of existing expanded specs → Task 1 Step 4 (full suite green). ✓
- README section + CSS recipes → Task 2. ✓
- Demo block + CSS recipe → Task 3. ✓
- Changelog + version bump deferred → Release section. ✓
- Verification (`build_lib`, `ng test`) → Task 1 Steps 4–5. ✓

**2. Placeholder scan:** none — every step has full file content, exact old→new edits, exact commands and expected output.

**3. Type consistency:** marker class strings are identical across the test (Task 1 Step 1), the template edits (Step 3), the README (Task 2), and the demo (Task 3): `aur-data-row`, `aur-expanded-row`, `aur-total-row`. No TS symbols introduced.
