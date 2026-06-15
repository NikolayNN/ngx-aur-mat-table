# tooltipPosition для иконок, actions и текста (плоское поле, non-breaking)

**Дата:** 2026-06-15
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича — статическое поле `tooltipPosition` в `IconView` и `TextView`.
Дефолт = поведение Material `'below'`; обратносовместимо.
**Контекст батча:** пункт 8 фидбека от 2026-06-11 (Andrey Patsko); ветка `feat/19.7.0-feedback`,
коммит на пункт.

## Решение (зафиксировано с пользователем)

Рассмотрены 3 варианта оформления: (1) плоское `tooltipPosition`, (2) non-breaking юнион
`T | TooltipConfig<T>`, (3) breaking `TooltipConfig`. Юнион отклонён как технически невыгодный:
при `strictTemplates: true` библиотека переиспользует один generic-интерфейс `IconView<T>` и для
входного конфига, и для разрешённого вью — юнион на `tooltip` ломает типизацию шаблона
(`[matTooltip]` ждёт `string`), а требование non-breaking всё равно заставляет держать плоские
поля → `TooltipConfig` сосуществовал бы с ними («два способа»). Breaking-группировка даёт чистый
API, но требует миграции ~19 мест. **Выбран вариант (1)** — плоское `tooltipPosition`, non-breaking,
закрывает запрос фидбека (включая текстовые тултипы) минимальной ценой.

| Решение | Выбор |
|---|---|
| Форма | плоское `tooltipPosition?: TooltipPosition` рядом с `tooltip`/`tooltipClass` |
| Тип | статический `TooltipPosition` (Material), НЕ `T` — позиция от данных строки не зависит (как `IconView.position`) |
| Охват | `IconView` (колоночные иконки, drag, кнопки действий, selection actions) И `TextView` (тултипы текста ячеек) |
| Дефолт | `|| 'below'` в биндинге → поведение Material без изменений |

## Контракт — `model/ColumnConfig.ts`

```ts
import { TooltipPosition } from '@angular/material/tooltip'; // type-only

export interface IconView<T> {
  name: T;
  color?: T;
  tooltip?: T;
  tooltipClass?: T;
  /** Позиция тултипа (matTooltipPosition). По умолчанию 'below'. От строки не зависит. */
  tooltipPosition?: TooltipPosition;
  position?: 'start' | 'end';
  wrapper?: IconWrapper<T>;
  visible?: Resolvable<T, boolean>;
}

export interface TextView<T> {
  show?: boolean;
  tooltip?: T;
  color?: T;
  /** Позиция тултипа текста ячейки (matTooltipPosition). По умолчанию 'below'. */
  tooltipPosition?: TooltipPosition;
}
```

`TooltipPosition` импортируется из `@angular/material/tooltip` (источник истины, выравнивает
типы с тем, что принимает `matTooltipPosition`).

## Реализация

### Фабрики — прокид (статическое копирование, без резолва)

`factories/ActionViewFactory.ts` → `prepareIconConfig` (объектный литерал `IconView<string>`):

```ts
tooltipPosition: iconSource.tooltipPosition,
```

`model/TableViewFactory.ts` → `configureIcon` (объектный литерал `IconView<string>`):

```ts
tooltipPosition: iconSource.tooltipPosition,
```

`model/TableViewFactory.ts` → `configureText` (объектный литерал `TextView<string>`):

```ts
tooltipPosition: textSource.tooltipPosition,
```

### Шаблоны — биндинг `[matTooltipPosition]="... || 'below'"` (5 мест)

1. `components/icon-view/icon-view.component.html` — `<mat-icon>` в ветке с тултипом:
   `[matTooltipPosition]="view.tooltipPosition || 'below'"`.
2. `components/column-value/column-view.component.html` — `<span>` текста в ветке с тултипом:
   `[matTooltipPosition]="config?.text?.tooltipPosition || 'below'"`.
3. `ngx-aur-mat-table.component.html` — `<span>` прямого действия с тултипом (после п.6):
   `[matTooltipPosition]="action.icon.tooltipPosition || 'below'"`.
4. `ngx-aur-mat-table.component.html` — `<span>` триггера меню с тултипом:
   `[matTooltipPosition]="action.icon.tooltipPosition || 'below'"`.
5. `ngx-aur-mat-table.component.html` — кнопка selection-action:
   `[matTooltipPosition]="action.icon.tooltipPosition || 'below'"`.

Биндинги добавляются рядом с существующими `[matTooltipClass]`/`[matTooltip]` в каждом месте.

## Edge cases

- **`tooltipPosition` не задан** → `|| 'below'` → дефолт Material; рендер не меняется.
- **Иконка/текст/действие без тултипа** — `matTooltip`-директивы нет, позиция не применяется
  (plain-ячейки, plainIcon-ветка, кнопки без тултипа).
- **Статика**: в `<T>`-контексте резолвить не нужно (в отличие от `tooltipClass`), фабрики
  копируют как есть.
- **drag-иконка** (`IconView<string>` статический) — если задать `tooltipPosition`, тоже
  применится (через тот же `icon-view.component.html`).

## Тесты — новый `ngx-aur-mat-table-tooltip-position.spec.ts`

Оракул — `By.directive(MatTooltip)` + `.position` (как существующий тест `tooltipClass` в
`ngx-aur-mat-table-icon-view.spec.ts`).

1. **Иконка колонки**: `valueView.icon` с `tooltip` + `tooltipPosition: 'right'` →
   MatTooltip иконки `.position === 'right'`.
2. **Текст ячейки**: `valueView.text` с `tooltip` + `tooltipPosition: 'above'` →
   MatTooltip span текста `.position === 'above'`.
3. **Действие**: `actionCfg.actions[].icon` с `tooltip` + `tooltipPosition: 'left'` →
   MatTooltip span действия `.position === 'left'`.
4. **Регрессия (дефолт)**: иконка с `tooltip` без `tooltipPosition` →
   MatTooltip `.position === 'below'`.

## Документация

- JSDoc — в контракте выше.
- README: одно предложение в секции про иконки/тултипы — `tooltipPosition` задаёт
  позицию подсказки (для узких/крайних колонок).
- Changelog-запись — при бампе 19.7.0, не в этом коммите.
