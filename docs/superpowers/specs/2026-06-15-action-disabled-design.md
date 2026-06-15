# `disabled` для прямых действий + фикс icon-view `visible`

**Дата:** 2026-06-15
**Статус:** Design (одобрен к реализации)
**Тип изменения:** A — аддитивная фича (`Action.disabled`); B — fix высокого бага аудита
(«icon-view visible»). Существующее поведение не меняется без новых полей.
**Контекст батча:** пункт 6 фидбека от 2026-06-11 (Andrey Patsko); ветка `feat/19.7.0-feedback`,
коммит на пункт. Два связанных по теме изменения в одном коммите (решение пользователя).

---

## Часть A — `disabled` для действий

### Проблема

Прямое действие (`actionCfg.actions[]`) можно только показать/скрыть (`visible`). Нужно
оставлять кнопку **видимой, но недоступной**, с объясняющим tooltip. `MenuItem` уже имеет
`disabled`, а `Action` — нет (асимметрия).

### Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| На что распространяется | вариант **(b)**: и прямые действия, и кнопка-триггер меню (disabled гасит открытие дропдауна) |
| Тип поля | `disabled?: Resolvable<T, boolean>` — зеркало `Action.visible` и `MenuItem.disabled` |
| Tooltip на disabled-кнопке | обёртка `<span [matTooltip]>` вокруг кнопки (disabled-кнопка не ловит pointer-события); ветки «без тултипа» остаются голой кнопкой — сохраняем оптимизацию «MatTooltip только когда задан» |

### Контракт — `model/ColumnConfig.ts`, интерфейс `Action<T>`

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

### Реализация

**`ActionViewFactory.prepareActionsForRow`** — добавить резолв (зеркало `visible`):

```ts
return actionConfig.actions.map(action => ({
  action: action.action(row.rowSrc),
  icon: this.prepareIconConfig(action.icon, row.rowSrc),
  visible: action.visible ? action.visible(row.rowSrc) : true,
  disabled: action.disabled ? action.disabled(row.rowSrc) : false,
  menu: action.menu ? action.menu.map(item => this.prepareMenuItem(item, row.rowSrc)) : undefined
}));
```

**`ngx-aur-mat-table.component.html`** — все 4 варианта кнопки действия:

- На каждую кнопку (триггер-меню с тултипом/без, прямое с тултипом/без) добавить
  `[disabled]="action.disabled === true"`.
- Варианты «с тултипом»: перенести `[matTooltip]`/`[matTooltipClass]` с кнопки на обёртку
  `<span>`, кнопка внутри. Пример (прямое действие с тултипом):

```html
<span *ngIf="action.icon.tooltip; else directBtnPlain"
      [matTooltip]="action.icon.tooltip"
      [matTooltipClass]="action.icon.tooltipClass || ''">
  <button mat-icon-button
          [disabled]="action.disabled === true"
          (click)="emitRowAction(action.action, element.rowSrc, $event)">
    <mat-icon [style.color]="action.icon.color">{{ action.icon.name }}</mat-icon>
  </button>
</span>
<ng-template #directBtnPlain>
  <button mat-icon-button
          [disabled]="action.disabled === true"
          (click)="emitRowAction(action.action, element.rowSrc, $event)">
    <mat-icon [style.color]="action.icon.color">{{ action.icon.name }}</mat-icon>
  </button>
</ng-template>
```

Аналогично для кнопки-триггера меню (`[matMenuTriggerFor]="actionMenu"` + `[disabled]`,
тултип на span). `mat-menu` и пункты меню (`MenuItem.disabled`) не меняются.

### Edge cases (A)

- **Disabled + click**: нативная disabled-кнопка не эмитит click → `rowAction`/открытие меню
  не происходит.
- **Disabled-кнопка-триггер**: `[matMenuTriggerFor]` на disabled-кнопке не открывает меню.
- **`disabled` не задан**: резолвится в `false` → поведение прежнее.
- **`visible: false`** по-прежнему скрывает действие целиком (внешний `*ngIf="action.visible !== false"`).

---

## Часть B — фикс icon-view `visible`

### Проблема (баг аудита #4)

`icon-view.component.html:2`: внешний `<div *ngIf="view">` рендерится, пока `view` задан, а
проверка `visible !== false` стоит **внутри** и гасит только `<mat-icon>`. При `visible: false`:
- с `wrapper` → пустой **закрашенный круг** (div `.circle` + `background-color`, без иконки);
- без wrapper → пустой div.

Данные корректны: `TableViewFactory.configureIcon:52` резолвит `visible`. Ломается рендер.
(`ActionViewFactory` `visible` не копирует, но иконки действий рисуются прямым `<mat-icon>`,
не через `lib-icon-view` — на них не влияет, фабрику не трогаем.)

### Решение — `icon-view.component.html`

Перенести проверку видимости во внешний `*ngIf`, убрать избыточный внутренний `ng-container`:

```html
<!-- без view или при visible:false не рендерим ничего — ни круга-обёртки, ни пустого div -->
<div *ngIf="view && view.visible !== false"
     [ngClass]="{'circle': view.wrapper}"
     [style.background-color]="view.wrapper?.color">
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

### Edge cases (B)

- **`visible: false`** (резолвленное или статичное): не рендерится ничего.
- **`visible: true`/`undefined`**: иконка рендерится как раньше.
- **`wrapper` + `visible: false`**: круга больше нет.
- Затрагивает все иконки через `lib-icon-view`: колонки (`lib-column-view`), drag-иконка.

---

## Тесты

Новый `ngx-aur-mat-table-action-disabled.spec.ts` (часть A):
1. **Прямое действие disabled**: `disabled: row => true` → у кнопки атрибут `disabled`; клик
   по ней не эмитит `rowAction`.
2. **Прямое действие enabled**: `disabled` не задан → кнопка активна, клик эмитит `rowAction`.
3. **Tooltip на span у disabled**: `disabled: () => true` + `icon.tooltip` → кнопка обёрнута
   в `span[matTooltip]` (тултип-директива на span, не на disabled-кнопке).
4. **Кнопка-триггер меню disabled**: action с `menu` + `disabled: () => true` → у кнопки-триггера
   атрибут `disabled` (меню не открыть).

Дополнить `ngx-aur-mat-table-icon-view.spec.ts` (часть B):
5. **`visible: false` + wrapper**: в DOM нет `.circle` (и вообще нет `<mat-icon>`).
6. **`visible: true`** + wrapper: `.circle` и иконка присутствуют (пин).

## Документация

- JSDoc — в контрактах выше.
- README: одно предложение в секции про actions/icons — `disabled` у действий + объясняющий tooltip.
- Changelog-запись — при бампе 19.7.0 (A — feat, B — fix), не в этом коммите.
