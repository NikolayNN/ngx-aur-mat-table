# Меню на иконке в колонке действий

**Дата:** 2026-06-02
**Библиотека:** `ngx-aur-mat-table`

## Цель

Дать возможность настроить в колонке действий (`actionCfg`) иконку, по нажатию на
которую открывается выпадающее меню (`mat-menu`) с несколькими пунктами, вместо
немедленной генерации одного действия. Каждый пункт меню при клике эмитит то же
событие `onRowAction`, что и обычные действия.

## Контекст / текущее состояние

- Колонка действий настраивается через `actionCfg: ActionConfig<T>` с массивом
  `actions: Action<(value: T) => string>[]`.
- Каждый `Action` сейчас — иконка (`IconView`) с опциональным `display`. По клику
  вызывается `emitRowAction(action, row, $event)` →
  `@Output() onRowAction: EventEmitter<ActionEvent<T>>` (`{action, value}`).
- `ActionViewFactory.create()` резолвит функции `(value) => string` в строки на
  каждую строку таблицы, возвращая `Map<number, Action<string>[]>`.
- `RowActionProvider` хранит `actionView` и прокидывает его в шаблон.
- Шаблон колонки действий в `ngx-aur-mat-table.component.html` рендерит иконки
  кнопками с `(click)="emitRowAction(...)"`.
- `mat-menu` (MatMenuModule) в библиотеке сейчас **не используется**.

## Решение

Расширить существующий механизм действий, не ломая обратную совместимость:
добавить опциональное поле `menu` к `Action`. Если оно задано — иконка становится
триггером `mat-menu`; если нет — поведение прежнее (прямой `emitRowAction`).

### 1. Модель конфига (`projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`)

```ts
export interface Action<T> {
  action: T;
  icon: IconView<T>;
  display?: T;
  menu?: MenuItem<T>[];   // NEW: задано → иконка открывает mat-menu
}

export interface MenuItem<T> {
  action: T;          // код действия, уходит в onRowAction
  text: T;            // подпись пункта меню
  icon?: IconView<T>; // опциональная иконка пункта
  display?: T;        // 'show' | 'none' — условное скрытие (как у Action)
  disabled?: T;       // 'true' | 'false' — условное отключение
}
```

Сохраняется текущая конвенция: на этапе конфига `T = (value: T) => string`, после
`ActionViewFactory` — `T = string`. `disabled` — строка `'true' | 'false'` для
единообразия со строковым `display` (`'show' | 'none'`).

### 2. ActionViewFactory (`projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts`)

В `prepareActionsForRow` при подготовке каждого `Action`: если задан `menu` —
резолвить каждый `MenuItem`, вызывая его функции для `row.rowSrc`, в
`MenuItem<string>`. Вынести подготовку пункта меню в отдельный приватный метод
`prepareMenuItem` по аналогии с `prepareIconConfig`:

- `action` → `item.action(value)`
- `text` → `item.text(value)`
- `icon` → `prepareIconConfig(item.icon, value)` если задан, иначе `undefined`
- `display` → `item.display ? item.display(value) : 'show'`
- `disabled` → `item.disabled ? item.disabled(value) : 'false'`

Результат — `Action<string>` с полем `menu?: MenuItem<string>[]`.

### 3. Провайдер

`RowActionProvider` — без изменений. Он прокидывает `Map<number, Action<string>[]>`,
которая теперь содержит заполненный `menu`.

### 4. Шаблон (`projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`)

В блоке `<!-- action column -->`, в `*ngFor` по `action`:

- **если `action.menu`** — кнопка-иконка с `[matMenuTriggerFor]="menuRef"` и
  связанным `<mat-menu #menuRef>`. Внутри меню — `*ngFor` по пунктам:
  ```html
  <button mat-menu-item
          *ngIf="item.display !== 'none'"
          [disabled]="item.disabled === 'true'"
          (click)="emitRowAction(item.action, element.rowSrc, $event)">
    <mat-icon *ngIf="item.icon" [style.color]="item.icon.color">{{ item.icon.name }}</mat-icon>
    <span>{{ item.text }}</span>
  </button>
  ```
  Триггер-кнопка сама показывает иконку (`action.icon`) и подчиняется
  `*ngIf="action.display !== 'none'"`.
- **иначе** — текущая разметка (прямой `emitRowAction(action.action, ...)`).

`mat-menu` нужен на каждую кнопку-триггер в строке; шаблон `#menuRef` объявляется
рядом с кнопкой внутри `*ngFor`, чтобы у каждого триггера было своё меню.

### 5. Событие

Переиспользуется существующий `emitRowAction` → `onRowAction`
(`ActionEvent<T> = {action: string, value: T}`). **Новых `@Output` нет.**
Триггер-иконка только открывает меню (обрабатывается `matMenuTriggerFor`); ячейка
колонки действий уже делает `(click)="$event.stopPropagation()"`, поэтому клик по
строке не сработает.

### 6. Модуль (`projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`)

Добавить `MatMenuModule` (`@angular/material/menu`) в `imports`.

### 7. Демо

В `projects/aur-demo/.../with-actions/table-with-actions` добавить пример действия
с `menu` (несколько пунктов, один с условным `disabled`/`display`), чтобы показать
поведение.

### 8. Публичный API

`MenuItem` экспортируется автоматически вместе с `ColumnConfig.ts`
(`public-api.ts` уже делает `export * from './lib/model/ColumnConfig'`).

## Тестирование (TDD)

- Юнит-тест `ActionViewFactory`: при заданном `menu` каждый пункт резолвится в
  строки на основе данных строки — проверить `action`, `text`, `icon.name`,
  `display`, `disabled`, а также значения по умолчанию (`display = 'show'`,
  `disabled = 'false'`, `icon = undefined`).
- Тест обратной совместимости: `Action` без `menu` резолвится как раньше
  (`menu` остаётся `undefined`).

## Обратная совместимость

Поле `menu` опционально. Существующие конфигурации `actionCfg` работают без
изменений. Никаких изменений сигнатур публичных событий.

## Вне области (YAGNI)

- Вложенные подменю (рекурсивные `children`) — не делаем.
- Отдельная конфигурация/колонка только для меню — не делаем.
- Меню в обычных колонках данных (`valueView`) — не в этой итерации.
