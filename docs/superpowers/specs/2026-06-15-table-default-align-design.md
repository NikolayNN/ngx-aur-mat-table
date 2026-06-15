# Табличное выравнивание по умолчанию (tableViewCfg.align)

**Дата:** 2026-06-15
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича — новое поле `TableViewConfig.align`. Без него поведение
не меняется; обратносовместимо.
**Контекст батча:** пункт 9 (последний) фидбека от 2026-06-11 (Andrey Patsko); ветка
`feat/19.7.0-feedback`, коммит на пункт.

## Проблема

`align` задаётся только поколоночно (`ColumnConfig.align`, `IndexConfig.align`). При едином
выравнивании всей таблицы это приходится дублировать в каждой колонке — конфиг разрастается.
`TableViewConfig` (`tableViewCfg`) имеет `height`/`cellPadding*`, но не `align`.

`buildAlignClassMap()` (`component.ts:468`) строит карту классов по ключу колонки без табличного
фолбэка: `map[c.key] = toClass(c.align)`. `toClass(undefined)` → `undefined` → класса нет → дефолт
`left`.

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Где живёт | `TableViewConfig.align?: ColumnAlign` (рядом с height/cellPadding) |
| Охват | обычные колонки (`columnsCfg`) И колонка индекса — **вариант b**: индекс наследует табличный дефолт при пустом `indexCfg.align` |
| Приоритет | локальный `align` колонки/индекса перекрывает табличный (`c.align ?? tableViewCfg.align`) |
| Спецколонки | selection/action/drag/timeline align-классов не получают (нет в карте) — не затрагиваются |
| Дефолт | не задан / `'left'` → класса нет → `left` (как сейчас) |

## Контракт — `model/ColumnConfig.ts`, `TableViewConfig`

```ts
export interface TableViewConfig {
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  /** Левый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingLeft?: string;
  /** Правый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingRight?: string;
  /**
   * Выравнивание по умолчанию для обычных колонок и колонки индекса.
   * Локальный ColumnConfig.align / IndexConfig.align приоритетнее. По умолчанию 'left'.
   */
  align?: ColumnAlign;
}
```

## Реализация — `ngx-aur-mat-table.component.ts`, `buildAlignClassMap()`

Текущий метод:

```ts
private buildAlignClassMap(): Record<string, 'aur-align-center' | 'aur-align-right' | undefined> {
  const toClass = (a?: ColumnAlign) =>
    a === 'center' ? 'aur-align-center' as const
      : a === 'right' ? 'aur-align-right' as const
        : undefined;
  const map: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
  this.tableConfig.columnsCfg.forEach(c => map[c.key] = toClass(c.align));
  map[IndexProvider.COLUMN_NAME] = toClass(this.tableConfig.indexCfg?.align);
  return map;
}
```

Меняются две строки построения карты — добавляется табличный фолбэк:

```ts
  const def = this.tableConfig.tableViewCfg?.align;
  this.tableConfig.columnsCfg.forEach(c => map[c.key] = toClass(c.align ?? def));
  map[IndexProvider.COLUMN_NAME] = toClass(this.tableConfig.indexCfg?.align ?? def);
```

`toClass`, тип возврата и остальное — без изменений. Шаблон/SCSS не трогаем: `[ngClass]="_alignClass[...]"`
уже висит на `th` (sortable/notSortable), `td` тела и `td` футера данных + индексной колонки; SCSS
(`.aur-align-center`/`.aur-align-right`) умеет text-align и `justify-content` для flex sortable-заголовка.

## Edge cases

- **`tableViewCfg.align: 'left'`/не задан** → `toClass(undefined)` → класса нет → дефолт left (no-op).
- **Локальный `align: 'left'` поверх табличного `center`** → `'left' ?? center` = `'left'` → `toClass('left')`
  = undefined → класса нет → явный сброс к left.
- **config-only-change**: карта пересобирается в `initTable()` при смене данных/колонок, не при смене
  одной ссылки `tableConfig` — то же известное ограничение, что и у текущего `align`; задокументировано.
- **Спецколонки** (selection/action/drag/timeline) — не в карте, выравнивание не получают.

## Тесты — новый `ngx-aur-mat-table-table-align.spec.ts`

Порядок колонок: `[0]=tbl_index, [1..]=данные`. Хелперы `headerCells`/`bodyCells`/`footerCells`
(как в существующем `ngx-aur-mat-table-align.spec.ts`).

Host A — `tableViewCfg: { align: 'center' }`, `indexCfg: { enable: true }` (без `align`),
колонки: `name` (без align), `age` (`align: 'left'`), `city` (`align: 'right'` + `totalConverter`):
1. **Наследование**: `name` без своего align → `aur-align-center` на header и body.
2. **Override → left**: `age` `align: 'left'` → нет ни center, ни right (header/body).
3. **Override → right**: `city` `align: 'right'` → `aur-align-right` (не center) на header/body/footer.
4. **Индекс наследует (b)**: индекс без `indexCfg.align` → `aur-align-center` на header/body/footer.

Host B — `tableViewCfg: { align: 'center' }`, `indexCfg: { enable: true, align: 'right' }`:
5. **Индекс override**: `aur-align-right` (не center) на header индекса.

## Документация

- JSDoc — в контракте выше.
- README: одно предложение в секции про колонки/align — `tableViewCfg.align` задаёт дефолт для
  всех колонок и индекса, локальный `align` приоритетнее.
- Changelog-запись — при бампе 19.7.0, не в этом коммите.
