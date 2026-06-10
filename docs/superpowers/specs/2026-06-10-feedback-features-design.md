# Фидбек-фичи 19.6.0: align, класс подсветки, форматтер индекса, fit, a11y, padding, иконки

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** 6 аддитивных фич + 1 **BREAKING** (удаление `ClickConfig.highlightClicked`)
+ 1 визуальное изменение по умолчанию (25px у последнего заголовка только при header button).
По решению — один релиз **19.6.0** (прецедент ломающих изменений в миноре — 19.2.0),
с блоком BREAKING и строкой миграции в changelog. Одна ветка, коммит на пункт.

## Контекст

Батч фидбека от пользователя библиотеки. Пункт «разделить внешний `[highlight]` и
переключение по клику `cancelable`» из исходного списка **уже реализован** — в работу не входит.
Нумерация пунктов сохранена из фидбека: #1, #2, #3, #4, #6, #7, #8 (№5 существует, №8 дослан).

Ключевые решения (зафиксированы с пользователем):

| Решение | Выбор |
|---|---|
| Упаковка | один минор 19.6.0, ветка одна, коммит на пункт |
| 25px у последнего `th` | применяется только при включённом `headerButtonCfg` (причина его существования — кнопка настроек поверх угла таблицы) |
| API выравнивания | одно типобезопасное поле `align` (экспортируемый литеральный союз), действует на заголовок+ячейки+итог |
| Триггер клавиатурной a11y | автоматически при заданном `bodyRowCfg.clickCfg`, без новых флагов |
| `highlightClicked` | удаляется жёстко (не deprecation) |

---

## #1 Выравнивание колонки (left / center / right)

### Проблема

Выравнивание контента колонки не настраивается. Класс `.text-right` в SCSS — мёртвый
(ни к чему не привязан). Контент ячеек трёх видов, и `text-align` покрывает не всё:

| Контент | Где живёт | Что двигает |
|---|---|---|
| plain-ячейки `span.aur-plain-cell`, итоги футера | шаблон таблицы | `text-align` на `td` |
| `lib-column-view` (flex `.align-container`) | дочерний компонент | `justify-content` |
| сортируемый заголовок `.mat-sort-header-container` (flex) | компонент Material | `justify-content` |

### Контракт — `model/ColumnConfig.ts`

```ts
/** Горизонтальное выравнивание контента колонки. */
export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnConfig<T> {
  // ...
  /** Выравнивание заголовка, ячеек и итога колонки. По умолчанию 'left'. */
  align?: ColumnAlign;
}

export interface IndexConfig {
  // ...
  /** Выравнивание колонки индекса. По умолчанию 'left'. */
  align?: ColumnAlign;
}
```

### Реализация

Класс на `th`/`td`: `aur-align-center` / `aur-align-right`; `'left'`/`undefined` — без класса
(текущее поведение). Классы precompute в `initTable()` в map по ключу колонки (паттерн
perf-работы 19.5.0 — без вызовов функций в каждом CD):

```ts
// ngx-aur-mat-table.component.ts
_alignClass: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
// заполняется из columnsCfg[].align + indexCfg.align (ключ IndexProvider.COLUMN_NAME)
```

Биндинг `[ngClass]="_alignClass[columnConfig.key]"` на: `th` колонок (обе ветки — sortable и
notSortable), `td` ячеек, `td` футера; то же для индексной колонки. Специальные колонки
(selection/action/drag/timeline) выравнивание не получают — у них нет текстового контента.

SCSS таблицы:

```scss
.aur-mat-table th.aur-align-center, .aur-mat-table td.aur-align-center { text-align: center; }
.aur-mat-table th.aur-align-right,  .aur-mat-table td.aur-align-right  { text-align: right; }

// контейнер Material внутри сортируемого заголовка — без ::ng-deep не достать;
// селектор остаётся заскоупленным под элементы хоста (первый ::ng-deep в библиотеке)
.aur-mat-table th.aur-align-center ::ng-deep .mat-sort-header-container { justify-content: center; }
.aur-mat-table th.aur-align-right  ::ng-deep .mat-sort-header-container { justify-content: flex-end; }
```

CSS `column-view` (компонент сам реагирует на контекст предка — без ::ng-deep):

```css
:host-context(.aur-align-center) .align-container { justify-content: center; }
:host-context(.aur-align-right)  .align-container { justify-content: flex-end; }
```

Примечание: у `span` внутри `column-view` и у `.aur-plain-cell` есть `margin-left: 4px` —
при центрировании даёт сдвиг ~2px одинаково в заголовке и ячейках (консистентно, не чиним).

### Тесты

Новый spec `ngx-aur-mat-table-align.spec.ts`: класс на th/td/footer-td при `align: 'center'|'right'`;
отсутствие класса при `'left'`/не задан; align индексной колонки; сортируемый заголовок получает класс.

---

## #2 Класс подсвеченной кликом строки — BREAKING

### Проблема

`highlightClicked?: StyleBuilder.Row | string` принимает только инлайн-стиль (строка трактуется
как CSS-текст, не имя класса). Назначить класс именно выделенной строке нельзя:
`bodyRowCfg.styleCfg.class(row)` не знает о внутреннем состоянии `highlighted`.

### Контракт — `model/ColumnConfig.ts`

Зеркало существующего `HoverStyleConfig` (симметрия hover ↔ click):

```ts
export interface ClickConfig {
  /** Стиль/класс, применяемый к подсвеченной кликом строке */
  styleCfg?: ClickStyleConfig;
  /**
   * По умолчанию false
   * false: и первый, и второй клик испускают эту строку; выделение не сбрасывается.
   * true: первый клик испускает эту строку, второй клик испускает undefined; первый выделяет, второй снимает выделение.
   */
  cancelable?: boolean;
}

export interface ClickStyleConfig {
  /** CSS-класс(ы) на подсвеченном <tr> */
  class?: string;
  /** Инлайн-стиль; StyleBuilder.Row или сырая CSS-строка */
  style?: StyleBuilder.Row | string;
}
```

**`highlightClicked` удаляется полностью** (решение пользователя; не deprecation).

### Реализация — `ngx-aur-mat-table.component.ts`

- `rowStyle()`: оверлей подсветки читает `clickCfg?.styleCfg?.style` (порядок мёржа
  base → hover → highlight не меняется, подсветка побеждает).
- `rowNgClass()`: `hl`/`hlHasColor` читают `clickCfg?.styleCfg?.style`; при
  `highlighted === row.rowSrc` дополнительно добавляется `clickCfg?.styleCfg?.class`.
- Тоггл `new-color` остаётся привязан **только к style-ветке** (наличие цвета в
  `styleCfg.style`). Класс потребителя сам решает, что красить:
  `tr.my-highlight td { color: …; }` — пример в JSDoc `ClickStyleConfig.class`.

### Миграция (в репозитории и changelog)

```ts
// было
clickCfg: { highlightClicked: Row.builder().background('yellow') }
// стало
clickCfg: { styleCfg: { style: Row.builder().background('yellow') } }
```

Правки в репо: `ngx-aur-mat-table-row-style.spec.ts`, демо
`table-expanding-row` (`.ts` + сниппет в `.html`), `table-highlight-clicked-row`,
`table-with-sub-footer`.

### Тесты

Расширить `ngx-aur-mat-table-row-style.spec.ts`: класс появляется на кликнутой строке;
снимается вторым кликом при `cancelable: true`; `styleCfg.style` ведёт себя как прежний
`highlightClicked` (фон, `new-color` при цвете); класс и стиль работают одновременно.

---

## #3 Форматтер индекса

### Проблема

Шаблон рендерит сырое число `{{ element.id + indexProvider.offset }}` — «1.» вместо «1»
сделать нельзя.

### Контракт — `model/ColumnConfig.ts`

```ts
export interface IndexConfig {
  // ...
  /** Форматирует отображаемый индекс (offset уже применён), например i => `${i}.` */
  formatter?: (index: number) => string;
}
```

Форматтер вместо суффикса: покрывает «1.», «№1», «01» одним концептом.

### Реализация — `providers/IndexProvider.ts` + шаблон

```ts
// IndexProvider
public formatter: ((index: number) => string) | undefined;  // из indexConfig.formatter

public format(id: number): string {
  const i = id + this.offset;
  return this.formatter ? this.formatter(i) : String(i);
}
```

Шаблон: `{{ indexProvider.format(element.id) }}` (вызов метода per-row — той же стоимости,
что существующие per-row биндинги).

### Тесты

Юнит на `IndexProvider.format` (с/без форматтера, с offset); компонентный — отрендеренное
значение ячейки индекса с `formatter: i => i + '.'`.

---

## #4 `fit` — колонка по содержимому

### Проблема

Семантического «сжать по контенту» нет; пользователи пишут хак `width: '1%'`.

### Контракт — `model/ColumnConfig.ts`

```ts
export interface ColumnSize {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  /** Сжать колонку по содержимому (семантическая замена width:'1%' + nowrap). */
  fit?: boolean;
}
```

### Реализация

Класс `aur-col-fit` на th/td/footer-td:

```scss
.aur-mat-table .aur-col-fit { width: 1%; white-space: nowrap; }
```

(стандартный табличный приём; чистый `width: fit-content` на `td` работает ненадёжно).

Биндинг `[class.aur-col-fit]="….size?.fit || false"` добавляется **во всех** местах, где
сейчас биндится `[style.width]` от `ColumnSize` — колонки данных, index, selection, action,
drag, timeline (фича бесплатно доступна всем спец-колонкам через общий тип).

Сочетание `fit: true` + `width`: инлайновый `width` побеждает класс (CSS), `nowrap` при этом
действует. В JSDoc: «при заданном `width` поле `fit` не влияет на ширину — не сочетать».

### Тесты

Класс присутствует на th/td/footer при `fit: true` (колонка данных + одна спец-колонка),
отсутствует без него.

---

## #6 Клавиатурная доступность кликабельных строк

### Проблема

`<tr>` — не нативный интерактивный элемент: Tab его пропускает, Enter/Space не синтезируют
клик, скринридер не объявляет интерактивность и состояние выделения (оно передаётся только
цветом — нарушение WCAG 1.4.1). Приложение-потребитель не может починить это снаружи —
`<tr>` внутри шаблона библиотеки. Покрытие: WCAG 2.1.1 Keyboard (A), 2.4.7 Focus Visible (AA),
4.1.2 Name Role Value (A).

### Решение

Включается **автоматически при заданном `bodyRowCfg.clickCfg`** (`isFeatureEnabled`),
без новых флагов. Read-only таблицы не получают tab-стопов — поведение для них не меняется.

`ngx-aur-mat-table.component.ts`:

```ts
_rowsInteractive = false;  // precompute в initTable(): isFeatureEnabledFn(bodyRowCfg?.clickCfg)

handleRowKeydown(event: KeyboardEvent, row: TableRow<T>) {
  // только сама строка: Enter/Space на вложенной кнопке/чекбоксе всплывает — не дублировать клик
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();             // Space скроллит страницу
    this.handleRowClick(row);
  }
}
```

Шаблон `<tr mat-row>`:

```html
[attr.tabindex]="_rowsInteractive ? 0 : null"
[attr.aria-current]="highlighted === row.rowSrc ? 'true' : null"
(keydown)="handleRowKeydown($event, row)"
```

- `aria-current` вместо `aria-selected`: валиден на любом элементе без смены ролей
  (`aria-selected` формально требует `role="grid"` с полным паттерном). Биндится
  безусловно — полезен и при внешнем `[highlight]` без `clickCfg`.
- Единый `(keydown)` вместо псевдособытий `keydown.enter`/`keydown.space` — нужен общий
  guard по `event.target`.

SCSS:

```scss
.aur-mat-table tr.mat-mdc-row:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
```

**Вне скоупа** (осознанно): roving tabindex / навигация стрелками / `role="grid"` —
отдельная итерация по запросу.

### Тесты

Новый spec `ngx-aur-mat-table-a11y.spec.ts`: `tabindex="0"` при `clickCfg`, отсутствует без;
Enter и Space на строке эмитят `rowClick` и ставят подсветку; Space делает `preventDefault`;
keydown с вложенного элемента (`target !== currentTarget`) игнорируется; `aria-current="true"`
на подсвеченной строке, на остальных отсутствует.

---

## #7 Padding: условный 25px + CSS-переменные + конфиг

### Проблема

1. `.mat-mdc-header-row th:last-child { padding-right: 25px !important; }` — безусловный;
   его реальное назначение — чтобы текст последнего заголовка не уходил под абсолютную
   кнопку настроек (`.table-settings-button`, `right: 4px`). Платят все, кнопку имеют немногие.
2. `padding-right/left: 4px !important` на th/td не переопределить снаружи без
   specificity-войн; селектор `…th, td` — `td` без префикса `.aur-mat-table` (неаккуратный скоуп,
   спасает только эмуляция инкапсуляции).
3. Конфигурации padding нет ни на уровне таблицы, ни на уровне колонки.

### Решение

**a) 25px — только при кнопке.** Шаблон: `<table [class.aur-has-header-button]="headerButtonProvider.isEnabled">`.

```scss
.aur-mat-table table.aur-has-header-button .mat-mdc-header-row th:last-child {
  padding-right: var(--aur-last-header-padding-right, 25px) !important;
}
```

Таблицы без кнопки теряют лишние 25px — **визуальное изменение по умолчанию**, заметка в changelog.

**b) CSS-переменные.** Базовое правило (с фиксом скоупа):

```scss
.aur-mat-table th, .aur-mat-table td {
  padding-right: var(--aur-cell-padding-right, 4px) !important;
  padding-left: var(--aur-cell-padding-left, 4px) !important;
}
```

`!important` внутри остаётся — он перебивает падинги Material MDC, чьи селекторы различаются
между версиями (убирать рискованно). Но боль фидбека решена: значение течёт через переменную,
потребитель задаёт её на любом уровне (хост, таблица, ячейка) **без борьбы со специфичностью**.

**c) Конфиг.** Один механизм на оба уровня — переменная на элементе побеждает табличную:

```ts
export interface TableViewConfig {
  height?: string; minHeight?: string; maxHeight?: string;
  /** Горизонтальные отступы ячеек всей таблицы (CSS-значения), по умолчанию 4px */
  cellPaddingLeft?: string;
  cellPaddingRight?: string;
}

export interface ColumnSize {
  // ... (width/minWidth/maxWidth/fit)
  /** Горизонтальные отступы ячеек этой колонки, приоритетнее табличных */
  paddingLeft?: string;
  paddingRight?: string;
}
```

Биндинги: `[style.--aur-cell-padding-left]` / `…-right]` на `<table>` из `tableViewCfg`;
те же переменные инлайном на th/td/footer-td колонки из `size.paddingLeft/Right`
(во всех местах биндинга `ColumnSize`, вместе с #4).

### Тесты

Класс `aur-has-header-button` есть при `headerButtonCfg`, отсутствует без; переменные
выставлены на `<table>` из `tableViewCfg` и на ячейках из `size`; (вычисленный padding
проверяется на уровне переменных/классов — рендер MDC в юнитах не эмулируем).

---

## #8 Иконка ячейки: `tooltipClass` и позиция относительно текста

### Проблема

`IconView` биндит только `[matTooltip]` — стилизовать тултип через `matTooltipClass` нельзя.
Иконка в `column-view` всегда рендерится **перед** текстом — «иконка после текста» невозможна.

### Контракт — `model/ColumnConfig.ts`

```ts
export interface IconView<T> {
  name: T;
  color?: T;
  tooltip?: T;
  /** CSS-класс(ы) тултипа — прокидывается в matTooltipClass */
  tooltipClass?: T;
  /** Позиция иконки относительно текста ячейки. По умолчанию 'start' (перед текстом). */
  position?: 'start' | 'end';
  wrapper?: IconWrapper<T>;
  visible?: Resolvable<T, boolean>;
}
```

- `tooltipClass: T` — на ячейках работает как резолвер per-row (например, класс по severity);
  требует дорезолва в `TableViewFactory` и `ActionViewFactory` (там, где разворачиваются
  остальные поля `IconView`).
- `position` — фиксированный союз (не `T`): структурное свойство, per-row смысла не имеет.
  Действует только в `column-view` (ячейки/заголовки); для кнопок действий и drag-иконки
  игнорируется (иконка там без текста).

### Реализация

- `icon-view.component.html`: `[matTooltipClass]="view.tooltipClass || ''"` в ветке с тултипом.
- Кнопки действий в шаблоне таблицы (прямой `[matTooltip]` на `<button>`, мимо `lib-icon-view`):
  добавить `[matTooltipClass]` в обе тултип-ветки (direct + menu).
- `column-view.component`: при `config.icon.position === 'end'` иконка визуально уходит за
  текст — шаблон column-view вешает класс `icon-end` на хост `lib-icon-view`, стили в
  `column-view.component.css`: `order: 1` внутри flex `.align-container` и `margin-left: 4px`
  (зеркало отступа: сейчас зазор делает `margin-left` у span текста).
- Визуальная проверка по запросу фидбека: в демо добавляется пример с иконкой
  `position: 'end'` и тултипом с кастомным классом (обязательная часть скоупа #8),
  прогон демо (`/verify`) со скриншотом.

### Тесты

`tooltipClass` доезжает до `matTooltipClass` (icon-view + кнопка действия); резолвер
`tooltipClass` разворачивается фабриками per-row (`ActionViewFactory.spec` + по месту для
`TableViewFactory`); при `position: 'end'` на `lib-icon-view` есть класс `icon-end`, при
`'start'`/не задан — нет.

---

## Порядок работ

Ветка `feature/feedback-19.6.0`, коммит на пункт, TDD на каждом шаге
(subagent-driven по плану из writing-plans):

1. `feat(columns): выравнивание align для заголовка, ячеек и итогов колонки`
2. `feat(row-click)!: класс подсветки кликнутой строки (styleCfg); удалён highlightClicked` — BREAKING
3. `feat(index): форматтер отображаемого индекса`
4. `feat(column-size): fit — колонка по содержимому`
5. `feat(a11y): клавиатурная доступность кликабельных строк`
6. `feat(padding): CSS-переменные и конфиг отступов; 25px последнего заголовка только при header button`
7. `feat(icon-view): tooltipClass и позиция иконки относительно текста`
8. `chore(release): bump 19.6.0 + changelog` (skill writing-changelog; BREAKING-блок с миграцией
   `highlightClicked` → `styleCfg.style`, заметка про 25px)

## Затронутые файлы (сводно)

- `model/ColumnConfig.ts` — `ColumnAlign`, `align` ×2, `ClickStyleConfig`, минус `highlightClicked`,
  `formatter`, `ColumnSize.fit/paddingLeft/paddingRight`, `TableViewConfig.cellPadding*`,
  `IconView.tooltipClass/position` (всё уезжает в public API через существующий `export *`).
- `ngx-aur-mat-table.component.ts` — `_alignClass`, правки `rowStyle`/`rowNgClass`,
  `_rowsInteractive`, `handleRowKeydown`.
- `ngx-aur-mat-table.component.html` — биндинги align/fit/padding-переменных на th/td/footer,
  tabindex/aria-current/keydown на `<tr>`, класс `aur-has-header-button` на `<table>`,
  `[matTooltipClass]` на кнопках действий, переменные на `<table>`.
- `ngx-aur-mat-table.component.scss` — align-классы (+ `::ng-deep` для sort-header),
  `aur-col-fit`, focus-visible, переменные padding, условный 25px, минус мёртвый `.text-right`.
- `components/column-value/column-view.component.{html,css}` — `:host-context` align,
  класс `icon-end` (биндинг в шаблоне + стили `order`/`margin`).
- `components/icon-view/icon-view.component.html` — `[matTooltipClass]`.
- `providers/IndexProvider.ts` — `formatter`/`format()`.
- `factories/TableViewFactory.ts`, `factories/ActionViewFactory.ts` — резолв `tooltipClass`.
- Спеки: новые `…-align.spec.ts`, `…-a11y.spec.ts`; расширение `…-row-style.spec.ts`,
  `ActionViewFactory.spec.ts` и по месту.
- Демо: миграция `highlightClicked` ×3 компонента (+сниппет); обязательный пример для #8
  (иконка `position: 'end'` + `tooltipClass`) под визуальную проверку. Примеры остальных
  опций — вне скоупа.
- `projects/ngx-aur-mat-table/package.json` — 19.5.0 → 19.6.0; changelog.

## Использование (после реализации)

```ts
tableConfig: TableConfig<Order> = {
  columnsCfg: [
    { name: 'Цена', key: 'price', valueConverter: v => v.price,
      align: 'right',                       // #1
      size: { fit: true, paddingRight: '12px' } },   // #4 + #7
    { name: 'Статус', key: 'status', valueConverter: v => v.status,
      valueView: { icon: {
        name: r => r.rowSrc.icon,
        tooltip: r => r.rowSrc.hint,
        tooltipClass: r => `tt-${r.rowSrc.severity}`, // #8
        position: 'end' } } },                        // #8
  ],
  indexCfg: { formatter: i => `${i}.`, align: 'center' },  // #3 + #1
  tableViewCfg: { cellPaddingLeft: '8px', cellPaddingRight: '8px' },  // #7
  bodyRowCfg: {
    clickCfg: {                              // #6 — клавиатура включилась автоматически
      styleCfg: { class: 'row-selected' },   // #2 — класс вместо инлайн-стилей
      cancelable: true,
    },
  },
};
```
