# Условные hover/pointer/click по строке (RowValue<T,R>)

**Дата:** 2026-06-15
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича — `HoverConfig`/`ClickConfig` параметризуются `<T>`,
поля `pointer`/`style`/`class` принимают значение-или-функцию от строки. Обратносовместимо
(статика остаётся валидной), существующее поведение не меняется.
**Контекст батча:** пункт 7 фидбека от 2026-06-11 (Andrey Patsko); ветка `feat/19.7.0-feedback`,
коммит на пункт. Скоуп расширен с hover-only до hover+click (решение пользователя — единообразие
`BodyRowConfig<T>`).

## Проблема

`hover` и `pointer` задаются на всю таблицу:
- `pointer` — статичный boolean, применяется ко ВСЕМ строкам (`rowNgClass`: `'pointer': hover?.pointer || false`, `component.ts:730`);
- `hoverCfg.styleCfg.style`/`class` — статичные (`HoverStyleConfig`, `ColumnConfig.ts:104`), одинаковы для всех;
- `HoverConfig`/`ClickConfig` не дженерики (`ColumnConfig.ts:72,95`).

Нужно отключать hover/pointer для отдельных строк (системные/недоступные). Заодно `BodyRowConfig<T>`
асимметричен: `styleCfg` параметризован (`BodyStyleConfig<T>`), а `clickCfg`/`hoverCfg` — нет.

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Тип аргумента функций | `(row: TableRow<T>)` — как у соседнего `bodyRowCfg.styleCfg` (`BodyStyleConfig<T>`/`RowStyleFactory`); единый тип во всём `bodyRowCfg`. Доступ к источнику — `row.rowSrc`, к значению колонки — `row['key']` |
| Скоуп | hover И click оба per-row (полное единообразие `BodyRowConfig<T>`); `cancelable`/`enable` остаются табличными |
| Поля per-row | `pointer`, `styleCfg.style`, `styleCfg.class` (в обоих оверлеях); `class` тоже функция — для симметрии со `style` |
| Совместимость | `<T = any>` + union `RowValue` → статика по-прежнему присваивается; поведение без функций прежнее |

## Контракт — `model/ColumnConfig.ts`

```ts
/** Значение, общее для строки, или вычисляемое по строке. */
export type RowValue<T, R> = R | ((row: TableRow<T>) => R);

export interface ClickConfig<T = any> {
  styleCfg?: ClickStyleConfig<T>;
  /** По умолчанию false. Поведение toggle при повторном клике. От строки не зависит. */
  cancelable?: boolean;
}

export interface ClickStyleConfig<T = any> {
  /** CSS-класс(ы) на подсвеченном <tr>; значение или (row) => значение. */
  class?: RowValue<T, string | null>;
  /** Инлайн-стиль; StyleBuilder.Row | строка, либо (row) => то же. */
  style?: RowValue<T, StyleBuilder.Row | string>;
}

export interface HoverConfig<T = any> {
  /** Главный переключатель оверлея наведения (табличный); true, когда hoverCfg задан и не false. */
  enable?: boolean;
  /** Показывать cursor: pointer; значение или (row) => значение. */
  pointer?: RowValue<T, boolean>;
  styleCfg?: HoverStyleConfig<T>;
}

export interface HoverStyleConfig<T = any> {
  class?: RowValue<T, string | null>;
  style?: RowValue<T, StyleBuilder.Row | string>;
}

export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig<T>;
  hoverCfg?: HoverConfig<T>;
  styleCfg?: BodyStyleConfig<T>;
}
```

`RowValue` экспортируется через существующий `export * from './lib/model/ColumnConfig'`.

## Реализация — `ngx-aur-mat-table.component.ts`

Резолвер (по образцу `resolveTotal`):

```ts
/** RowValue<T,R> → R: статика как есть, функция вызывается со строкой. */
private resolveRow<R>(v: RowValue<T, R> | undefined, row: TableRow<T>): R | undefined {
  return typeof v === 'function' ? (v as (row: TableRow<T>) => R)(row) : v;
}
```

`rowStyle(row)` — резолвить hover/click style per-row (click — только когда подсвечена):

```ts
rowStyle(row: TableRow<T>): string | null {
  let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
  if (this.hoverActive(row)) {
    acc = this.mergeStyle(acc, this.resolveRow(this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style, row) ?? null);
  }
  if (this.highlighted === row.rowSrc) {
    acc = this.mergeStyle(acc, this.resolveRow(this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg?.style, row) ?? null);
  }
  return this.toCss(acc);
}
```

`rowNgClass(row)` — резолвить pointer (на все), hover-class (при hoverActive), click style/class (при isHighlighted):

```ts
rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
  const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
  const click = this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
  const isHighlighted = this.highlighted === row.rowSrc;
  const hl = isHighlighted ? this.resolveRow(click?.style, row) : null;
  const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.colorValue : !!hl;
  const cls: { [klass: string]: boolean } = {
    'pointer': this.resolveRow(hover?.pointer, row) || false,
    'new-color': isHighlighted && hlHasColor,
  };
  const custom = this.rowStyles[row.id]?.class;
  if (custom) cls[custom] = true;
  const hcls = this.hoverActive(row) ? this.resolveRow(hover?.styleCfg?.class, row) : null;
  if (hcls) cls[hcls] = true;
  const ccls = isHighlighted ? this.resolveRow(click?.class, row) : null;
  if (ccls) cls[ccls] = true;
  return cls;
}
```

Шаблон/SCSS не меняются: `[ngClass]="rowNgClass(row)"`/`[style]="rowStyle(row)"` и `onRowEnter/Leave`
уже на месте. Перф-частота вызовов та же (методы и так per-row per-CD); click/hover-функции
вызываются только для подсвеченной/наведённой строки, pointer — для всех (как и статичное чтение сейчас).

## Edge cases

- **Статика** (`pointer: true`, `style: '...'`, `class: '...'`): резолвер возвращает как есть → поведение прежнее.
- **`StyleBuilder.Row`**: объект, `typeof !== 'function'` → возвращается как есть.
- **`style: row => ''`**: пустой оверлей у строки (системная строка без hover/click-подсветки).
- **`enable: false`**: по-прежнему гасит весь hover-оверлей таблично (через `hoverActive`).
- **`new-color`/`hlHasColor`**: считаются от резолвленного click-style текущей строки только при подсветке.

## Тесты — новый `ngx-aur-mat-table-conditional-row-style.spec.ts`

1. **pointer per-row**: `pointer: row => !row.rowSrc.system` → системная строка БЕЗ класса `pointer`,
   обычная — С ним.
2. **hover-style per-row**: `hoverCfg.styleCfg.style: row => row.rowSrc.system ? '' : 'color: red'`;
   `mouseenter` на обычную строку → `[style]` содержит `color: red`; на системную → пусто.
3. **click-style per-row**: `clickCfg.styleCfg.style: row => 'color: ' + (row.rowSrc.vip ? 'gold' : 'gray')`;
   клик по vip-строке → стиль `gold`; по обычной → `gray`.
4. **Регрессия (статика)**: `hoverCfg.pointer: true` (boolean) → класс `pointer` на всех строках.

## Документация

- JSDoc — в контракте выше.
- README: одно предложение в секции row config/styling — hover/pointer/click можно задавать
  функцией от строки (отключать для системных строк).
- Changelog-запись — при бампе 19.7.0, не в этом коммите.
