# `disabled` для действий + фикс icon-view `visible` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A — `Action.disabled` (вариант b: прямые действия И кнопка-триггер меню), tooltip работает на disabled-кнопке через span-обёртку. B — фикс бага аудита: `icon-view` при `visible:false` не рендерит пустой круг/div.

**Architecture:** Контракт `Action.disabled` + резолв в `ActionViewFactory` + `[disabled]` на 4 вариантах кнопки в шаблоне (тултип-варианты оборачиваются в `<span [matTooltip]>`). Отдельно — перенос проверки видимости во внешний `*ngIf` в `icon-view.component.html`. TDD: 4 красных + 2 пина.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-15-action-disabled-design.md`

**Контекст ветки:** `feat/19.7.0-feedback`, коммит на пункт. НЕ мержить. `public-api.ts` правки не требует.

---

### Task 1: Контракт + красный спек (части A и B)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (интерфейс `Action<T>` ~строка 258)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-disabled.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-icon-view.spec.ts` (добавить host + describe)

- [ ] **Step 1.1: Поле `disabled` в `Action<T>`.** Найти:

```ts
export interface Action<T> {
  action: T;
  icon: IconView<T>;
  /** Показать действие. `undefined`/`true` → показано, `false` → скрыто. */
  visible?: Resolvable<T, boolean>;
  menu?: MenuItem<T>[];
}
```

заменить на:

```ts
export interface Action<T> {
  action: T;
  icon: IconView<T>;
  /** Показать действие. `undefined`/`true` → показано, `false` → скрыто. */
  visible?: Resolvable<T, boolean>;
  /** Выключить действие (кнопка видна, но недоступна). `undefined`/`false` → включено, `true` → выключено. */
  disabled?: Resolvable<T, boolean>;
  menu?: MenuItem<T>[];
}
```

- [ ] **Step 1.2: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-disabled.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; system: boolean; }

/** По кнопке (mat-icon-button) на строку тела; tooltip-вариант оборачивает кнопку в span, querySelector её всё равно находит. */
function rowButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'))
    .map(tr => (tr as HTMLElement).querySelector('button') as HTMLButtonElement);
}

// ---------- прямые действия ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                            (rowAction)="events.push($event)"></aur-mat-table>`,
})
class DirectActionHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  events: any[] = [];
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'edit',
          icon: { name: () => 'edit', tooltip: () => 'cannot edit' },
          disabled: row => row.system,
        },
      ],
    },
  };
  // row 0 system → disabled; row 1 → enabled
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('NgxAurMatTable action disabled (direct)', () => {
  let fixture: ComponentFixture<DirectActionHostComponent>;
  let host: DirectActionHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DirectActionHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DirectActionHostComponent);
    host = fixture.componentInstance;
  });

  it('disabled действие: кнопка disabled, клик не эмитит rowAction', () => {
    fixture.detectChanges();
    const row0Btn = rowButtons(fixture)[0];
    expect(row0Btn.disabled).toBeTrue();
    row0Btn.click();
    expect(host.events.length).toBe(0);
  });

  it('enabled действие: кнопка активна, клик эмитит rowAction', () => {
    fixture.detectChanges();
    const row1Btn = rowButtons(fixture)[1];
    expect(row1Btn.disabled).toBeFalse();
    row1Btn.click();
    expect(host.events.length).toBe(1);
    expect(host.events[0]).toEqual({ action: 'edit', value: { name: 'b', system: false } });
  });

  it('tooltip у disabled-кнопки висит на span-обёртке, не на самой кнопке', () => {
    fixture.detectChanges();
    const disabledSpan = fixture.debugElement.queryAll(By.directive(MatTooltip))
      .find(de => de.nativeElement.tagName === 'SPAN'
        && (de.nativeElement.querySelector('button') as HTMLButtonElement)?.disabled);
    expect(disabledSpan).withContext('span с matTooltip вокруг disabled-кнопки').toBeTruthy();
    expect(disabledSpan!.injector.get(MatTooltip).message).toBe('cannot edit');
  });
});

// ---------- кнопка-триггер меню ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class MenuActionHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'more',
          icon: { name: () => 'more_vert' },
          disabled: () => true,
          menu: [{ action: () => 'x', text: () => 'X' }],
        },
      ],
    },
  };
  data: Row[] = [{ name: 'a', system: true }];
}

describe('NgxAurMatTable action disabled (menu trigger)', () => {
  let fixture: ComponentFixture<MenuActionHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MenuActionHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuActionHostComponent);
  });

  it('disabled кнопка-триггер: disabled, меню не открывается', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('tr.mat-mdc-row button') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
    btn.click();
    fixture.detectChanges();
    expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
  });
});
```

- [ ] **Step 1.3: Часть B — дополнить `ngx-aur-mat-table-icon-view.spec.ts`.** В КОНЕЦ файла добавить:

```ts

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IconVisibilityHostComponent {
  iconVisible = false;
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { icon: { name: () => 'info', wrapper: { color: () => 'red' }, visible: () => this.iconVisible } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable icon visible (wrapper)', () => {
  let fixture: ComponentFixture<IconVisibilityHostComponent>;
  let host: IconVisibilityHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IconVisibilityHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IconVisibilityHostComponent);
    host = fixture.componentInstance;
  });

  it('visible:false + wrapper — не рендерит ни круг, ни иконку', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tr.mat-mdc-row lib-icon-view .circle')).toBeNull();
    expect(fixture.nativeElement.querySelector('tr.mat-mdc-row lib-icon-view mat-icon')).toBeNull();
  });

  it('visible:true + wrapper — круг и иконка присутствуют (пин)', () => {
    host.iconVisible = true;
    host.data = [{ name: 'a' }]; // новая ссылка → ngOnChanges → refreshTable → re-resolve visible
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tr.mat-mdc-row lib-icon-view .circle')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('tr.mat-mdc-row lib-icon-view mat-icon')).toBeTruthy();
  });
});
```

- [ ] **Step 1.4: Красный прогон** обоих затронутых спеков:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-action-disabled.spec.ts'
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-icon-view.spec.ts'
```

Ожидание — 4 FAIL и 2 PASS суммарно:
- action: FAIL «disabled действие…» (нет `[disabled]` в шаблоне → кнопка не disabled);
- action: PASS «enabled действие…» (клик эмитит — работает сегодня);
- action: FAIL «tooltip на span…» (сегодня тултип на кнопке, span-обёртки нет);
- action: FAIL «disabled кнопка-триггер…» (нет `[disabled]` на триггере);
- icon: FAIL «visible:false + wrapper…» (сегодня рендерит `.circle`);
- icon: PASS «visible:true + wrapper…» (рендерит сегодня — пин);
- icon: PASS существующие 2 теста (tooltipClass/position) — не трогаются.

Иное распределение — остановиться, разобраться, доложить.

---

### Task 2: Зелёный — резолв, шаблон действий, фикс icon-view

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts` (`prepareActionsForRow`)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (4 варианта кнопки действия)
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html`

- [ ] **Step 2.1: Резолв `disabled` в `ActionViewFactory.prepareActionsForRow`.** Найти:

```ts
    return actionConfig.actions.map(action => ({
      action: action.action(row.rowSrc),
      icon: this.prepareIconConfig(action.icon, row.rowSrc),
      visible: action.visible? action.visible(row.rowSrc): true,
      menu: action.menu? action.menu.map(item => this.prepareMenuItem(item, row.rowSrc)): undefined
    }));
```

заменить на:

```ts
    return actionConfig.actions.map(action => ({
      action: action.action(row.rowSrc),
      icon: this.prepareIconConfig(action.icon, row.rowSrc),
      visible: action.visible? action.visible(row.rowSrc): true,
      disabled: action.disabled? action.disabled(row.rowSrc): false,
      menu: action.menu? action.menu.map(item => this.prepareMenuItem(item, row.rowSrc)): undefined
    }));
```

- [ ] **Step 2.2: Шаблон — кнопка-триггер меню.** В `ngx-aur-mat-table.component.html` найти:

```html
                  <button *ngIf="action.icon.tooltip; else menuBtnPlain" mat-icon-button
                          [matMenuTriggerFor]="actionMenu"
                          [matTooltip]="action.icon.tooltip"
                          [matTooltipClass]="action.icon.tooltipClass || ''">
                    <mat-icon [style.color]="action.icon.color">
                      {{ action.icon.name }}
                    </mat-icon>
                  </button>
                  <ng-template #menuBtnPlain>
                    <button mat-icon-button [matMenuTriggerFor]="actionMenu">
                      <mat-icon [style.color]="action.icon.color">
                        {{ action.icon.name }}
                      </mat-icon>
                    </button>
                  </ng-template>
```

заменить на:

```html
                  <span *ngIf="action.icon.tooltip; else menuBtnPlain"
                        [matTooltip]="action.icon.tooltip"
                        [matTooltipClass]="action.icon.tooltipClass || ''">
                    <button mat-icon-button
                            [matMenuTriggerFor]="actionMenu"
                            [disabled]="action.disabled === true">
                      <mat-icon [style.color]="action.icon.color">
                        {{ action.icon.name }}
                      </mat-icon>
                    </button>
                  </span>
                  <ng-template #menuBtnPlain>
                    <button mat-icon-button [matMenuTriggerFor]="actionMenu"
                            [disabled]="action.disabled === true">
                      <mat-icon [style.color]="action.icon.color">
                        {{ action.icon.name }}
                      </mat-icon>
                    </button>
                  </ng-template>
```

- [ ] **Step 2.3: Шаблон — прямое действие.** Найти:

```html
                  <button *ngIf="action.icon.tooltip; else directBtnPlain" mat-icon-button
                          (click)="emitRowAction(action.action, element.rowSrc, $event)"
                          [matTooltip]="action.icon.tooltip"
                          [matTooltipClass]="action.icon.tooltipClass || ''">
                    <mat-icon [style.color]="action.icon.color">
                      {{ action.icon.name }}
                    </mat-icon>
                  </button>
                  <ng-template #directBtnPlain>
                    <button mat-icon-button
                            (click)="emitRowAction(action.action, element.rowSrc, $event)">
                      <mat-icon [style.color]="action.icon.color">
                        {{ action.icon.name }}
                      </mat-icon>
                    </button>
                  </ng-template>
```

заменить на:

```html
                  <span *ngIf="action.icon.tooltip; else directBtnPlain"
                        [matTooltip]="action.icon.tooltip"
                        [matTooltipClass]="action.icon.tooltipClass || ''">
                    <button mat-icon-button
                            [disabled]="action.disabled === true"
                            (click)="emitRowAction(action.action, element.rowSrc, $event)">
                      <mat-icon [style.color]="action.icon.color">
                        {{ action.icon.name }}
                      </mat-icon>
                    </button>
                  </span>
                  <ng-template #directBtnPlain>
                    <button mat-icon-button
                            [disabled]="action.disabled === true"
                            (click)="emitRowAction(action.action, element.rowSrc, $event)">
                      <mat-icon [style.color]="action.icon.color">
                        {{ action.icon.name }}
                      </mat-icon>
                    </button>
                  </ng-template>
```

- [ ] **Step 2.4: Фикс `icon-view.component.html`.** Заменить весь файл на:

```html
<!-- без view или при visible:false не рендерим ничего — ни круга-обёртки, ни пустого div -->
<div *ngIf="view && view.visible !== false"
     [ngClass]="{'circle': view.wrapper}"
     [style.background-color]="view.wrapper?.color">
  <!-- MatTooltip создаётся только когда тултип задан -->
  <mat-icon *ngIf="view.tooltip as tooltip; else plainIcon"
            [matTooltip]="tooltip"
            [matTooltipClass]="view.tooltipClass || ''"
            [style.color]="view.color">
    {{ view.name }}
  </mat-icon>
  <ng-template #plainIcon>
    <mat-icon [style.color]="view.color">
      {{ view.name }}
    </mat-icon>
  </ng-template>
</div>
```

- [ ] **Step 2.5: Зелёный прогон** обоих спеков (команды из Step 1.4). Ожидание: action 4 PASS, icon-view 4 PASS (2 старых + 2 новых).

- [ ] **Step 2.6: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **170 of 170 SUCCESS** (164 существующих + 6 новых), 0 FAILED. Особое внимание: `ActionViewFactory.spec.ts` (проверяет поля по отдельности — `disabled` его не ломает), `ngx-aur-mat-table-menu-action.spec.ts`, `ngx-aur-mat-table-tooltip.spec.ts`. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (секция про actions/icons; если такой секции нет — добавить короткий абзац рядом с описанием действий)

- [ ] **Step 3.1: README.** Найти раздел про actions (например по якорю «actionCfg» или «Row config & styling»). Добавить абзац:

```md
**Disabled actions:** `actionCfg.actions[].disabled: row => boolean` keeps a row action visible but greyed out (works for direct actions and menu triggers). With `icon.tooltip` set, the tooltip is rendered on a wrapper so it still shows on the disabled button — handy for explaining why the action is unavailable.
```

Если подходящего раздела нет — вставить этот абзац в конец секции server pagination/row config (по усмотрению, но в README, не только в JSDoc). Зафиксировать в отчёте, куда вставлено.

- [ ] **Step 3.2: Сборка**:

```bash
npm run build_lib
```

Ожидание: успешно, без ошибок.

- [ ] **Step 3.3: Коммит** (один на пункт):

```powershell
git add projects/ngx-aur-mat-table/src/lib README.md
git commit -m @'
feat(actions): Action.disabled + fix(icon): visible hides wrapper

Action.disabled (row => boolean) keeps a row action visible but disabled,
for both direct actions and menu triggers. The icon tooltip moves onto a
<span> wrapper so it still shows on a disabled button (disabled buttons
swallow pointer events). Plain (no-tooltip) variants stay bare buttons.

Also fixes the icon-view audit bug: visible:false used to leave an empty
wrapper div / coloured circle because the *ngIf only gated the <mat-icon>;
visibility now gates the outer element, so nothing renders.
'@
```

После коммита `git show --stat HEAD`: 7 файлов — `model/ColumnConfig.ts`, `factories/ActionViewFactory.ts`, `ngx-aur-mat-table.component.html`, `components/icon-view/icon-view.component.html`, `ngx-aur-mat-table-action-disabled.spec.ts`, `ngx-aur-mat-table-icon-view.spec.ts`, `README.md`.

Changelog-запись (A — feat, B — fix) — при бампе 19.7.0, не в этом коммите.
