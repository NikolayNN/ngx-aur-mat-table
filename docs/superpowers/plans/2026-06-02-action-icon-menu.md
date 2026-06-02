# Action-Icon Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an icon in the action column (`actionCfg`) to open a `mat-menu` with multiple items, each emitting the existing `onRowAction` event.

**Architecture:** Extend the existing `Action` model with an optional `menu?: MenuItem<T>[]`. `ActionViewFactory` resolves each menu item's `(value) => string` functions per row, exactly like it already resolves icons. The action-column template renders a `mat-menu` trigger when `menu` is present, otherwise keeps today's direct-emit button. Fully backward compatible.

**Tech Stack:** Angular 19, Angular Material 18 (`@angular/material/menu`), TypeScript, Jasmine/Karma.

**Spec:** `docs/superpowers/specs/2026-06-02-action-icon-menu-design.md`

---

## File Structure

- **Modify** `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — add `MenuItem<T>` interface and `menu?` field on `Action<T>`.
- **Modify** `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts` — resolve `menu` items per row.
- **Create** `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts` — unit tests for menu resolution.
- **Modify** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` — import `MatMenuModule`.
- **Modify** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — render menu trigger + `mat-menu` in the action column.
- **Modify** `projects/aur-demo/src/app/with-actions/table-with-actions/table-with-actions.component.ts` — demo an action with a `menu`.

---

### Task 1: Add `MenuItem` model and `menu` field on `Action`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:177-181`

- [ ] **Step 1: Add `menu` field to `Action` and define `MenuItem` interface**

Replace the existing `Action<T>` interface (currently at lines 177-181):

```ts
export interface Action<T> {
  action: T;
  icon: IconView<T>;
  display?: T;
  menu?: MenuItem<T>[];
}

export interface MenuItem<T> {
  /** action code emitted via onRowAction */
  action: T;
  /** menu item label text */
  text: T;
  /** optional leading icon */
  icon?: IconView<T>;
  /** 'show' | 'none' — conditionally hide the item */
  display?: T;
  /** 'true' | 'false' — conditionally disable the item */
  disabled?: T;
}
```

- [ ] **Step 2: Verify the library still builds**

Run: `npm run build_lib`
Expected: build succeeds (no type errors). `MenuItem` is exported automatically via `public-api.ts` (`export * from './lib/model/ColumnConfig'`).

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "feat: add optional menu field to action config"
```

---

### Task 2: Resolve `menu` items in `ActionViewFactory`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts`
- Test: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts`:

```ts
import {ActionViewFactory} from './ActionViewFactory';
import {ActionConfig} from '../model/ColumnConfig';
import {TableRow} from '../model/TableRow';

interface Customer {
  name: string;
  age: number;
}

describe('ActionViewFactory menu resolution', () => {
  const young = new TableRow<Customer>(0, {name: 'Ann', age: 20});
  const old = new TableRow<Customer>(1, {name: 'Bob', age: 50});

  function configWithMenu(): ActionConfig<Customer> {
    return {
      actions: [
        {
          action: () => 'more',
          icon: {name: () => 'more_vert'},
          menu: [
            {
              action: () => 'edit',
              text: () => 'Edit',
              icon: {name: () => 'edit', color: () => 'blue'},
            },
            {
              action: () => 'delete',
              text: () => 'Delete',
              display: (c) => (c.age < 21 ? 'none' : 'show'),
              disabled: (c) => (c.age < 21 ? 'true' : 'false'),
            },
          ],
        },
      ],
    };
  }

  it('resolves menu item functions to strings per row', () => {
    const view = ActionViewFactory.create([old], configWithMenu());
    const action = view.get(old.id)![0];

    expect(action.action).toBe('more');
    expect(action.menu).toBeDefined();
    expect(action.menu!.length).toBe(2);

    const edit = action.menu![0];
    expect(edit.action).toBe('edit');
    expect(edit.text).toBe('Edit');
    expect(edit.icon!.name).toBe('edit');
    expect(edit.icon!.color).toBe('blue');
    expect(edit.display).toBe('show');
    expect(edit.disabled).toBe('false');
  });

  it('applies per-row display and disabled conditions', () => {
    const view = ActionViewFactory.create([young], configWithMenu());
    const del = view.get(young.id)![0].menu![1];

    expect(del.display).toBe('none');
    expect(del.disabled).toBe('true');
    expect(del.icon).toBeUndefined();
  });

  it('leaves menu undefined for actions without a menu', () => {
    const config: ActionConfig<Customer> = {
      actions: [{action: () => 'edit', icon: {name: () => 'edit'}}],
    };
    const view = ActionViewFactory.create([old], config);

    expect(view.get(old.id)![0].menu).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `action.menu` is `undefined` because `prepareActionsForRow` does not yet copy/resolve `menu`.

- [ ] **Step 3: Implement menu resolution**

In `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts`:

Update the import line (line 1) to include `MenuItem`:

```ts
import {Action, ActionConfig, IconView, MenuItem} from "../model/ColumnConfig";
```

Replace `prepareActionsForRow` (currently lines 25-31) with:

```ts
  private static prepareActionsForRow<T>(row: TableRow<T>, actionConfig: ActionConfig<T>): Action<string>[] {
    return actionConfig.actions.map(action => ({
      action: action.action(row.rowSrc),
      icon: this.prepareIconConfig(action.icon, row.rowSrc),
      display: action.display? action.display(row.rowSrc): 'show',
      menu: action.menu? action.menu.map(item => this.prepareMenuItem(item, row.rowSrc)): undefined
    }));
  }

  private static prepareMenuItem<T>(item: MenuItem<(value: T) => string>, value: T): MenuItem<string> {
    return {
      action: item.action(value),
      text: item.text(value),
      icon: item.icon? this.prepareIconConfig(item.icon, value): undefined,
      display: item.display? item.display(value): 'show',
      disabled: item.disabled? item.disabled(value): 'false'
    };
  }
```

Note: `prepareIconConfig` is already typed `prepareIconConfig<T>(iconSource: IconView<(value: T) => string>, value: T): IconView<string>` and is reused unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS — all three specs green.

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts
git commit -m "feat: resolve action menu items per row in ActionViewFactory"
```

---

### Task 3: Register `MatMenuModule`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts:18-19,32-44`

- [ ] **Step 1: Import `MatMenuModule`**

Add after the `DragDropModule` import (line 18):

```ts
import {MatMenuModule} from "@angular/material/menu";
```

- [ ] **Step 2: Add `MatMenuModule` to the `imports` array**

In the `imports` array (lines 32-44), add `MatMenuModule` after `DragDropModule,`:

```ts
    DragDropModule,
    MatMenuModule,
```

- [ ] **Step 3: Verify the library builds**

Run: `npm run build_lib`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts
git commit -m "feat: register MatMenuModule for action menus"
```

---

### Task 4: Render menu trigger + `mat-menu` in the action column

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:205-214`

- [ ] **Step 1: Replace the action button loop with menu-aware markup**

Replace the `<ng-container *ngFor="let action ...">` block (currently lines 205-214) with:

```html
            <ng-container *ngFor="let action of rowActionsProvider.actionView.get(element.id)">
              <!-- action with dropdown menu -->
              <ng-container *ngIf="action.menu; else directAction">
                <button mat-icon-button
                        [matMenuTriggerFor]="actionMenu"
                        [matTooltip]="action.icon.tooltip || ''"
                        *ngIf="action.display !== 'none'">
                  <mat-icon [style.color]="action.icon.color">
                    {{ action.icon.name }}
                  </mat-icon>
                </button>
                <mat-menu #actionMenu="matMenu">
                  <ng-container *ngFor="let item of action.menu">
                    <button mat-menu-item
                            *ngIf="item.display !== 'none'"
                            [disabled]="item.disabled === 'true'"
                            (click)="emitRowAction(item.action, element.rowSrc, $event)">
                      <mat-icon *ngIf="item.icon" [style.color]="item.icon.color">
                        {{ item.icon.name }}
                      </mat-icon>
                      <span>{{ item.text }}</span>
                    </button>
                  </ng-container>
                </mat-menu>
              </ng-container>

              <!-- direct action (existing behavior) -->
              <ng-template #directAction>
                <button mat-icon-button
                        (click)="emitRowAction(action.action, element.rowSrc, $event)"
                        [matTooltip]="action.icon.tooltip || ''"
                        *ngIf="action.display !== 'none'">
                  <mat-icon [style.color]="action.icon.color">
                    {{ action.icon.name }}
                  </mat-icon>
                </button>
              </ng-template>
            </ng-container>
```

Note: each action with a menu declares its own template-local `#actionMenu` inside the `*ngFor` iteration, so every row's trigger binds to its own menu instance. `emitRowAction` already calls `$event.stopPropagation()`; the cell `<td>` already has `(click)="$event.stopPropagation()"`, so row-click does not fire.

- [ ] **Step 2: Verify the library builds**

Run: `npm run build_lib`
Expected: build succeeds (template compiles, `matMenuTriggerFor` / `mat-menu` resolved via `MatMenuModule`).

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "feat: render dropdown menu for action-column icons"
```

---

### Task 5: Demonstrate the menu in the demo app

**Files:**
- Modify: `projects/aur-demo/src/app/with-actions/table-with-actions/table-with-actions.component.ts:28-47`

- [ ] **Step 1: Add a menu action to the demo config**

Replace the `actionCfg` block (currently lines 28-47) with:

```ts
    actionCfg: {
      actions: [
        {
          action: () =>'edit',
          icon: {
            name: () => 'edit',
            tooltip: () => 'редактировать',
            color: () => 'blue'
          }
        },
        {
          action: () => 'delete',
          icon: {
            name: () => 'delete',
            tooltip:  () => 'удалить',
            color: () => 'red'
          }
        },
        {
          action: () => 'more',
          icon: {
            name: () => 'more_vert',
            tooltip: () => 'ещё'
          },
          menu: [
            {
              action: () => 'duplicate',
              text: () => 'Дублировать',
              icon: {name: () => 'content_copy', color: () => 'green'}
            },
            {
              action: () => 'archive',
              text: () => 'В архив',
              icon: {name: () => 'archive'},
              disabled: (c) => (c.age < 18 ? 'true' : 'false')
            },
            {
              action: () => 'block',
              text: () => 'Заблокировать',
              display: (c) => (c.age < 18 ? 'none' : 'show')
            }
          ]
        }
      ]
    }
```

The existing `onRowActions($event)` handler already alerts `action + ': ' + value.name`, so menu clicks surface their action code without further changes.

- [ ] **Step 2: Verify the demo builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add projects/aur-demo/src/app/with-actions/table-with-actions/table-with-actions.component.ts
git commit -m "docs: demo action-column dropdown menu"
```

---

## Final Verification

- [ ] Run the full library test suite: `npm test -- --watch=false --browsers=ChromeHeadless` — all pass.
- [ ] Run `npm run build_lib` and `npm run build` — both succeed.
- [ ] (Optional manual) `npm start`, open the "with actions" table, click the `more_vert` icon: menu opens with Дублировать / В архив / Заблокировать; clicking a row item alerts the action code; row-click is not triggered; "В архив" is disabled and "Заблокировать" hidden for rows with age < 18.
