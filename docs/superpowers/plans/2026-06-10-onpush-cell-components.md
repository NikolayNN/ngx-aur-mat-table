# OnPush для ячеечных компонентов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ChangeDetectionStrategy.OnPush` для `ColumnViewComponent` и `IconViewComponent` — Default-дети внутри OnPush-таблицы перепроверяются на каждом CD; OnPush отсекает спуск в ~тысячу дочерних шаблонов за цикл.

**Architecture:** Две правки декораторов; поведения нет — верификация существующими DOM-тестами и сборками.

**Tech Stack:** Angular 19, Jasmine + Karma.

**Спека:** `docs/superpowers/specs/2026-06-10-onpush-cell-components-design.md`

---

### Task 1: OnPush в оба декоратора и проверка

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.ts`

- [ ] **Step 1.1: Ветка**

```bash
git checkout -b perf/onpush-cell-components master
```

- [ ] **Step 1.2: column-view.component.ts**

```ts
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {ColumnView} from "../../model/ColumnConfig";

@Component({
    selector: 'lib-column-view',
    templateUrl: './column-view.component.html',
    styleUrls: ['./column-view.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ColumnViewComponent {
  @Input() config: ColumnView<string> | undefined;
  @Input() value: any;
}
```

- [ ] **Step 1.3: icon-view.component.ts**

```ts
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import { IconView } from '../../model/ColumnConfig';


@Component({
    selector: 'lib-icon-view',
    templateUrl: './icon-view.component.html',
    styleUrl: './icon-view.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class IconViewComponent {

  @Input() view: IconView<string> | undefined;

}
```

- [ ] **Step 1.4: Верификация**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: TOTAL: 86 SUCCESS (в т.ч. business-key DOM-тест: контент ячейки обновляется после смены данных)

Run: `npm run build_lib`
Expected: успех

Run: `npx ng build aur-demo --configuration development`
Expected: успех

- [ ] **Step 1.5: Commit + merge**

```bash
git add projects/ngx-aur-mat-table/src/lib/components
git commit -m "perf(core): OnPush for cell view components

ColumnViewComponent/IconViewComponent were Default-CD inside the OnPush
table, so every table CD cycle re-evaluated ~1000 child templates on a
50x10 table (hover/click/keystroke). Inputs are reference-stable between
refreshes, so OnPush skips them; data updates rebuild tableView refs and
re-check as before."
git checkout master
git merge perf/onpush-cell-components
git branch -d perf/onpush-cell-components
```

Changelog-запись (включая нюанс про in-place мутацию `headerView`) — при выпуске 19.5.0.
