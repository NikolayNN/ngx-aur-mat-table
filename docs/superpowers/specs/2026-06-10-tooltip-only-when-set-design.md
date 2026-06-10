# MatTooltip только при заданном тултипе

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** оптимизация производительности, не ломающая. Квик-вин №2 из обзора
производительности. Релизный носитель — 19.5.0.

## Проблема

`[matTooltip]` привязан безусловно:

1. `column-view.component.html:13` — span значения каждой ячейки:
   `[matTooltip]="config?.text?.tooltip?.toString() || ''"`;
2. `icon-view.component.html:4` — каждая отрисованная иконка:
   `[matTooltip]="view?.tooltip?.toString() || ''"`;
3. `ngx-aur-mat-table.component.html` — кнопки действий строк (~222 menu-trigger, ~233
   direct) и кнопки действий выделения в заголовке (~166): `[matTooltip]="action.icon.tooltip || ''"`.

Когда тултип не настроен, выражение даёт `''`, но директива создаётся на каждом элементе.
Цена экземпляра с пустым сообщением (по `@angular/material/fesm2022/tooltip.mjs` 18.2):
DI ~десятка зависимостей, подписка на `_dir.change` в конструкторе (~строка 232),
`_focusMonitor.monitor(elementRef)` + подписка в `ngAfterViewInit` (~244), teardown-работа
в `ngOnDestroy`. Слушатели показа при `''` не вешаются (`_setupPointerEnterEventsIfNeeded`
выходит по гварду) — проблема в цене создания/удержания/разрушения директивы, а не показа.

Масштаб: таблица 50×10 без настроенных тултипов ⇒ 500+ экземпляров впустую (подписки,
регистрации FocusMonitor, аллокации), пересоздаваемых при каждом полном перестроении
строк. №4 (OnPush) срезал стоимость перепроверки ячеек; №2 срезает стоимость создания.

Пересечение с №3: голый `{{value}}` уберёт span-ы простых колонок целиком; №2 закрывает
колонки С `valueView` без тултипа, иконки без тултипа и кнопки действий.

## Решение

Ветвление шаблона: элемент с `[matTooltip]` рендерится только когда тултип задан; иначе —
тот же элемент без директивы. `*ngIf="... as tooltip"` даёт алиас и отсекает `''` (falsy).
Лишний `?.toString()` уходит (тип уже `string`).

Охват: span ячейки (column-view), иконка (icon-view), обе пер-строчные кнопки действий
(menu-trigger и direct). Кнопки действий выделения в заголовке (~166) сознательно НЕ
трогаем: они существуют один раз на таблицу (число = числу actions), выигрыш нулевой,
а ветвление удвоило бы разметку — несоразмерно.

### column-view.component.html

```html
<ng-container *ngIf="config?.text?.show != false">
  <span *ngIf="config?.text?.tooltip as tooltip; else plainText"
        [matTooltip]="tooltip"
        [style.color]="config?.text?.color">
     {{ value }}
  </span>
  <ng-template #plainText>
    <span [style.color]="config?.text?.color">
     {{ value }}
    </span>
  </ng-template>
</ng-container>
```

### icon-view.component.html

```html
<ng-container *ngIf="view && view?.visible !== false">
  <mat-icon *ngIf="view?.tooltip as tooltip; else plainIcon"
            [matTooltip]="tooltip"
            [style.color]="view?.color">
    {{ view?.name }}
  </mat-icon>
  <ng-template #plainIcon>
    <mat-icon [style.color]="view?.color">
      {{ view?.name }}
    </mat-icon>
  </ng-template>
</ng-container>
```

### ngx-aur-mat-table.component.html — кнопки действий

Menu-trigger (внутри существующего `*ngIf="action.visible !== false"`):

```html
<button *ngIf="action.icon.tooltip; else menuBtnPlain" mat-icon-button
        [matMenuTriggerFor]="actionMenu"
        [matTooltip]="action.icon.tooltip">
  <mat-icon [style.color]="action.icon.color">{{ action.icon.name }}</mat-icon>
</button>
<ng-template #menuBtnPlain>
  <button mat-icon-button [matMenuTriggerFor]="actionMenu">
    <mat-icon [style.color]="action.icon.color">{{ action.icon.name }}</mat-icon>
  </button>
</ng-template>
```

Direct (двум структурным директивам нужен ng-container):

```html
<ng-template #directAction>
  <ng-container *ngIf="action.visible !== false">
    <button *ngIf="action.icon.tooltip; else directBtnPlain" mat-icon-button
            (click)="emitRowAction(action.action, element.rowSrc, $event)"
            [matTooltip]="action.icon.tooltip">
      <mat-icon [style.color]="action.icon.color">{{ action.icon.name }}</mat-icon>
    </button>
    <ng-template #directBtnPlain>
      <button mat-icon-button
              (click)="emitRowAction(action.action, element.rowSrc, $event)">
        <mat-icon [style.color]="action.icon.color">{{ action.icon.name }}</mat-icon>
      </button>
    </ng-template>
  </ng-container>
</ng-template>
```

## Поведение

Не меняется: пустой тултип и раньше не показывался. Динамика сохраняется: тултип
появляется/исчезает со сменой view-объектов (пересоздаются на refresh) — ветка `*ngIf`
переключается тогда же. Шаблонные ссылки (`#plainText` и т.п.) скоупятся на embedded view —
коллизий в *ngFor нет.

## Тестирование (TDD)

MatTooltip вешает на хост класс `mat-mdc-tooltip-trigger` (tooltip.mjs:700) — DOM-критерий.
Новый spec `ngx-aur-mat-table-tooltip.spec.ts` (TestBed-хост): колонки plain / text-tooltip /
icon / icon-tooltip + actionCfg с двумя действиями (с тултипом и без):

1. ячейка plain-колонки — 0 элементов `.mat-mdc-tooltip-trigger`;
2. ячейка с text.tooltip — триггер на span;
3. ячейка с иконкой без тултипа — 0;
4. ячейка с icon.tooltip — ровно 1 триггер, и это mat-icon;
5. кнопка действия с тултипом — триггер есть; без — нет.

Red-фаза: пункты 1/3/5(без) падают на текущем коде (триггер сейчас у всех).
Плюс 86 существующих, `build_lib`, демо (в table-big тултипы настроены — живая проверка).

## Затронутые файлы

- `components/column-value/column-view.component.html`
- `components/icon-view/icon-view.component.html`
- `ngx-aur-mat-table.component.html` (два пер-строчных места кнопок действий)
- Создать: `ngx-aur-mat-table-tooltip.spec.ts`
- Changelog: запись при выпуске 19.5.0.
