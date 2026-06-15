# tooltipPosition (плоское поле) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Статическое `tooltipPosition?: TooltipPosition` в `IconView` и `TextView`; прокид через 2 фабрики; биндинг `[matTooltipPosition]="... || 'below'"` в 5 местах рендера тултипа. Non-breaking, дефолт `'below'`.

**Architecture:** Чисто аддитивное опциональное поле → красная фаза компилируется без правок компонента (Task 1 = контракт + спек). Зелёная (Task 2) = 3 копирования в фабриках + 5 биндингов в шаблонах. TDD: 3 красных + 1 пин.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-15-tooltip-position-design.md`

**Контекст ветки:** `feat/19.7.0-feedback`, коммит на пункт. НЕ мержить. `public-api.ts` правки не требует.

---

### Task 1: Контракт + красный спек

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (импорт; `IconView` ~162; `TextView` ~197)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-tooltip-position.spec.ts`

- [ ] **Step 1.1: Импорт `TooltipPosition`.** В начале `ColumnConfig.ts` найти:

```ts
import {StyleBuilder} from "../style-builder/style-builder";
```

заменить на:

```ts
import {StyleBuilder} from "../style-builder/style-builder";
import {TooltipPosition} from "@angular/material/tooltip";
```

- [ ] **Step 1.2: `IconView.tooltipPosition`.** Найти:

```ts
  /** CSS-класс(ы) тултипа; прокидывается в matTooltipClass. */
  tooltipClass?: T;

  /**
   * Позиция иконки относительно текста ячейки: 'start' (по умолчанию) — перед текстом,
   * 'end' — после. Действует в ячейках/заголовках; для кнопок действий и drag-иконки игнорируется.
   */
  position?: 'start' | 'end';
```

заменить на:

```ts
  /** CSS-класс(ы) тултипа; прокидывается в matTooltipClass. */
  tooltipClass?: T;

  /** Позиция тултипа (matTooltipPosition). По умолчанию 'below'. От строки не зависит. */
  tooltipPosition?: TooltipPosition;

  /**
   * Позиция иконки относительно текста ячейки: 'start' (по умолчанию) — перед текстом,
   * 'end' — после. Действует в ячейках/заголовках; для кнопок действий и drag-иконки игнорируется.
   */
  position?: 'start' | 'end';
```

- [ ] **Step 1.3: `TextView.tooltipPosition`.** Найти:

```ts
export interface TextView<T> {
  /** По умолчанию true*/
  show?: boolean;
  /** Подсказка */
  tooltip?: T;
  color?: T;
}
```

заменить на:

```ts
export interface TextView<T> {
  /** По умолчанию true*/
  show?: boolean;
  /** Подсказка */
  tooltip?: T;
  color?: T;
  /** Позиция тултипа текста ячейки (matTooltipPosition). По умолчанию 'below'. */
  tooltipPosition?: TooltipPosition;
}
```

- [ ] **Step 1.4: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-tooltip-position.spec.ts`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

/** Позиции всех MatTooltip в DOM (в этих хостах ровно один тултип на хост). */
function tooltipPositions(fixture: ComponentFixture<unknown>): string[] {
  return fixture.debugElement.queryAll(By.directive(MatTooltip))
    .map(de => de.injector.get(MatTooltip).position);
}

// ---------- иконка ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IconPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { icon: { name: () => 'info', tooltip: () => 'hint', tooltipPosition: 'right' } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: icon', () => {
  let fixture: ComponentFixture<IconPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IconPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(IconPosHost);
    fixture.detectChanges();
  });
  it("иконка: matTooltipPosition === 'right'", () => {
    expect(tooltipPositions(fixture)).toEqual(['right']);
  });
});

// ---------- текст ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class TextPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { text: { tooltip: () => 'hint', tooltipPosition: 'above' } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: text', () => {
  let fixture: ComponentFixture<TextPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TextPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(TextPosHost);
    fixture.detectChanges();
  });
  it("текст: matTooltipPosition === 'above'", () => {
    expect(tooltipPositions(fixture)).toEqual(['above']);
  });
});

// ---------- действие ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ActionPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: { actions: [{ action: () => 'edit', icon: { name: () => 'edit', tooltip: () => 'hint', tooltipPosition: 'left' } }] },
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: action', () => {
  let fixture: ComponentFixture<ActionPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ActionPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ActionPosHost);
    fixture.detectChanges();
  });
  it("действие: matTooltipPosition === 'left'", () => {
    expect(tooltipPositions(fixture)).toEqual(['left']);
  });
});

// ---------- дефолт (регрессия) ----------

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DefaultPosHost {
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: { icon: { name: () => 'info', tooltip: () => 'hint' } },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('tooltipPosition: default', () => {
  let fixture: ComponentFixture<DefaultPosHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DefaultPosHost],
    }).compileComponents();
    fixture = TestBed.createComponent(DefaultPosHost);
    fixture.detectChanges();
  });
  it("без tooltipPosition → 'below'", () => {
    expect(tooltipPositions(fixture)).toEqual(['below']);
  });
});
```

- [ ] **Step 1.5: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-tooltip-position.spec.ts'
```

Ожидание — 3 FAIL и 1 PASS:
- FAIL «иконка 'right'» — фабрика/шаблон ещё не прокидывают → MatTooltip.position = дефолт 'below';
- FAIL «текст 'above'» — то же;
- FAIL «действие 'left'» — то же;
- PASS «default 'below'» — позиция не задана, дефолт совпадает.

Иное распределение — остановиться, разобраться, доложить.

---

### Task 2: Зелёный — прокид в фабриках + биндинги

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts` (`prepareIconConfig`)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts` (`configureIcon`, `configureText`)
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (3 места)

- [ ] **Step 2.1: `ActionViewFactory.prepareIconConfig`.** Найти:

```ts
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(value) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
```

заменить на:

```ts
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(value) : undefined,
      tooltipPosition: iconSource.tooltipPosition,
      position: iconSource.position,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
```

- [ ] **Step 2.2: `TableViewFactory.configureIcon`.** Найти:

```ts
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(row) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(row)}: undefined,
      visible: iconSource.visible? iconSource.visible(row): true
```

заменить на:

```ts
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(row) : undefined,
      tooltipPosition: iconSource.tooltipPosition,
      position: iconSource.position,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(row)}: undefined,
      visible: iconSource.visible? iconSource.visible(row): true
```

- [ ] **Step 2.3: `TableViewFactory.configureText`.** Найти:

```ts
    return {
      show: textSource.show,
      tooltip: textSource.tooltip?.(row),
      color: textSource.color?.(row)
    }
```

заменить на:

```ts
    return {
      show: textSource.show,
      tooltip: textSource.tooltip?.(row),
      color: textSource.color?.(row),
      tooltipPosition: textSource.tooltipPosition
    }
```

- [ ] **Step 2.4: `icon-view.component.html`.** Найти:

```html
  <mat-icon *ngIf="view.tooltip as tooltip; else plainIcon"
            [matTooltip]="tooltip"
            [matTooltipClass]="view.tooltipClass || ''"
            [style.color]="view.color">
```

заменить на:

```html
  <mat-icon *ngIf="view.tooltip as tooltip; else plainIcon"
            [matTooltip]="tooltip"
            [matTooltipClass]="view.tooltipClass || ''"
            [matTooltipPosition]="view.tooltipPosition || 'below'"
            [style.color]="view.color">
```

- [ ] **Step 2.5: `column-view.component.html`.** Найти:

```html
    <span *ngIf="config?.text?.tooltip as tooltip; else plainText"
          [matTooltip]="tooltip"
          [style.color]="config?.text?.color">
```

заменить на:

```html
    <span *ngIf="config?.text?.tooltip as tooltip; else plainText"
          [matTooltip]="tooltip"
          [matTooltipPosition]="config?.text?.tooltipPosition || 'below'"
          [style.color]="config?.text?.color">
```

- [ ] **Step 2.6: `ngx-aur-mat-table.component.html` — selection action (около строки 203).** Найти:

```html
                  <button mat-icon-button
                          (click)="emitSelectedRowsAction(action.action, selectionProvider.selection.selected)"
                          [matTooltip]="action.icon.tooltip || ''"
                          *ngIf="action.visible !== false">
```

заменить на:

```html
                  <button mat-icon-button
                          (click)="emitSelectedRowsAction(action.action, selectionProvider.selection.selected)"
                          [matTooltip]="action.icon.tooltip || ''"
                          [matTooltipPosition]="action.icon.tooltipPosition || 'below'"
                          *ngIf="action.visible !== false">
```

- [ ] **Step 2.7: `ngx-aur-mat-table.component.html` — span триггера меню (около строки 273).** Найти:

```html
                  <span *ngIf="action.icon.tooltip; else menuBtnPlain"
                        [matTooltip]="action.icon.tooltip"
                        [matTooltipClass]="action.icon.tooltipClass || ''">
```

заменить на:

```html
                  <span *ngIf="action.icon.tooltip; else menuBtnPlain"
                        [matTooltip]="action.icon.tooltip"
                        [matTooltipClass]="action.icon.tooltipClass || ''"
                        [matTooltipPosition]="action.icon.tooltipPosition || 'below'">
```

- [ ] **Step 2.8: `ngx-aur-mat-table.component.html` — span прямого действия (около строки 298).** Найти:

```html
                  <span *ngIf="action.icon.tooltip; else directBtnPlain"
                        [matTooltip]="action.icon.tooltip"
                        [matTooltipClass]="action.icon.tooltipClass || ''">
```

заменить на:

```html
                  <span *ngIf="action.icon.tooltip; else directBtnPlain"
                        [matTooltip]="action.icon.tooltip"
                        [matTooltipClass]="action.icon.tooltipClass || ''"
                        [matTooltipPosition]="action.icon.tooltipPosition || 'below'">
```

- [ ] **Step 2.9: Зелёный прогон** того же спека (команда из Step 1.5). Ожидание: 4 PASS, 0 FAIL.

- [ ] **Step 2.10: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **179 of 179 SUCCESS** (175 существующих + 4 новых), 0 FAILED. Особое внимание: `ngx-aur-mat-table-icon-view.spec.ts`, `ngx-aur-mat-table-tooltip.spec.ts`, `TableViewFactory.spec.ts`, `ActionViewFactory.spec.ts`. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (секция «Row config & styling» — добавить строку про tooltipPosition)

- [ ] **Step 3.1: README.** В конец секции «Row config & styling» (после абзаца про `Disabled actions`, перед заголовком `### Migration from pre-19.1.0`) добавить абзац (пустые строки вокруг):

```md
**Tooltip position:** `icon.tooltipPosition` / `text.tooltipPosition` (and the same on action icons) set `matTooltipPosition` (`'left' | 'right' | 'above' | 'below' | 'before' | 'after'`, default `'below'`) — useful for narrow or edge columns.
```

Если точное окружение отличается — вставить в конец секции «Row config & styling»; зафиксировать в отчёте точное место (файл:строка).

- [ ] **Step 3.2: Сборка**:

```bash
npm run build_lib
```

Ожидание: успешно, без ошибок.

- [ ] **Step 3.3: Коммит** (один на пункт):

```powershell
git add projects/ngx-aur-mat-table/src/lib README.md
git commit -m @'
feat(tooltip): tooltipPosition for icons, actions and cell text

IconView.tooltipPosition / TextView.tooltipPosition (static TooltipPosition,
default 'below') bind matTooltipPosition wherever a tooltip is rendered from
a view: column icons, drag icon, cell text, row-action buttons and selection
actions. Propagated through TableViewFactory/ActionViewFactory; bindings use
`|| 'below'` so unset config keeps Material's default. Non-breaking — flat
field alongside tooltip/tooltipClass (a grouped TooltipConfig was rejected:
under strictTemplates the shared input/resolved IconView interface makes a
union break template typing, and non-breaking would force coexistence anyway).
'@
```

После коммита `git show --stat HEAD`: ровно 8 файлов — `model/ColumnConfig.ts`, `factories/ActionViewFactory.ts`, `model/TableViewFactory.ts`, `components/icon-view/icon-view.component.html`, `components/column-value/column-view.component.html`, `ngx-aur-mat-table.component.html`, `ngx-aur-mat-table-tooltip-position.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
