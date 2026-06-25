# TableRow: перенос служебного индекса с публичного `id` на `rowId`

**Дата:** 2026-06-25
**Статус:** Design (одобрен к реализации)
**Тип изменения:** breaking fix. Колонка с `key:'id'` (любой ключ, совпадающий со
служебным полем строки) перетирала внутренний индекс `TableRow.id`, из-за чего
ломались valueView, стили строк, колонка-№ и timeline. Публичное `TableRow.id`-как-индекс
**удаляется** → следующий мажор **20.0.0**.
**Стейджинг:** отдельная ветка `fix/rowid-internal-index-collision` сейчас; решение
«соло 20.0.0 vs бандл с очередью отложенных бряков (`api-cleanup` #8 type-safety и пр.)» —
на finish-этапе.
**Контекст:** валидация баг-репорта пользователя — таблица с колонкой `key:'id'` + `valueView`
показывала иконку только у строк, чей бизнес-`id` случайно попал в диапазон индексов `0..N-1`,
а у остальных — голый текст.

## Проблема

`TableRow` хранит служебный позиционный индекс в **публичном строковом поле `id`**, а фабрика
затем раскладывает значения колонок по их ключам в тот же объект. Колонка с `key:'id'`
пишет в ту же ячейку — индекс затирается бизнес-значением.

```ts
// TableRow.ts
export class TableRow<T> {
  id: number;          // служебный индекс
  rowSrc: T;
  [key: string]: any;  // сюда же ложатся колонки → коллизия
  constructor(id, rowSrc) { this.rowSrc = rowSrc; this.id = id; }
}

// TableRowsFactory.ts:17-18
const row = new TableRow<T>(id, obj);                    // row.id = индекс 0..N-1
config.forEach(c => row[c.key] = c.valueConverter(obj)); // key:'id' → row.id = бизнес-id ⚠️
```

`tableView`/`rowStyles` — позиционные массивы (`rows.map(...)`), индексируются по позиции
строки. Шаблон и компонент читают их по `element.id` (`component.html:398`,
`component.ts:918/939`), но после затирания `element.id` ≠ позиция → лукап промахивается:

- бизнес-`id` вне диапазона `0..N-1` (например `23` при 4 строках) → `tableView[23] = undefined`
  → `lib-column-view` без `config` рисует голый текст;
- бизнес-`id` внутри диапазона (`1`,`2`,`3`) → попадает в массив → иконка показывается
  (часто — вид **чужой** строки).

Затрагиваемые потребители служебного индекса (все читают `element.id`/`row.id`, где получатель — `TableRow`):

| # | Потребитель | Где | Тип лукапа | Эффект коллизии |
|---|---|---|---|---|
| 1 | view ячеек | `tableView[element.id]` (`html:398`) | позиционный массив | ломается |
| 2 | стиль/класс строки | `rowStyles[row.id]` (`ts:918/939`) | позиционный массив | ломается |
| 3 | колонка-№ | `indexProvider.format(element.id + offset)` (`html:165`) | id = номер строки | показывает бизнес-id |
| 4 | timeline | `visibleData[i].id` ± gap-арифметика (`ts:770-781`, `html:70-89`) | непрерывный счётчик | мусорные разрывы |
| 5 | контекст директив | `index: element.id` (`ts:457/463`) | публичный `index` | отдаёт бизнес-id |
| 6 | действия | `actionView.set/get(row.id)` (`ActionViewFactory.ts:14`, `html:257`) | Map по id | согласовано при уникальных id |
| 7 | drag/выделение | `r.id === row.id` (`ts:1145`) | сравнение id | согласовано при уникальных id |

Корень: служебный индекс (роль «позиция в параллельных массивах») сидит на публичном строковом
имени, которое забирает пользовательская колонка.

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Имя служебного поля | `id` → **`rowId`** (однообразно с существующим публичным `rowSrc`) |
| `rowSrc` | **не трогаем** — established публичный контракт, низко-коллизионный |
| Защита от коллизии | **dev-guard**: `isDevMode()` + `console.warn('[aur-mat-table] …')` на колонку с ключом из reserved-набора |
| Reserved-набор | ровно `['rowId', 'rowSrc']` (единственные именованные поля `TableRow`) |
| Реакция guard'а | warn + continue (house-стиль, как `RowActionProvider.ts:56`); сломанный рендер всё равно произойдёт, но dev получает точную причину |
| Публичный `index` | **сохраняется** в `AurRowContext`/`AurCellContext`, источник → `rowId` |
| `TableRow.id` | удаляется; shim-геттер невозможен (getter-only поле + `row['id']=…` бросит в strict mode) |

**Отклонённые альтернативы:**
- **Symbol для индекса** — Angular-шаблон не читает символьный ключ напрямую, потребовался бы
  per-cell хелпер `rowIndex(el)`; выгода (коллизия невозможна по построению) перекрывается guard'ом.
- **Единый безопасный префикс на оба (`_aurRowSrc`/`_aurRowId`)** — вынуждает переименовать
  сильно-публичный `rowSrc` (большой бряк) ради косметической однообразности.

## Реализация

### `model/TableRow.ts`

```ts
export class TableRow<T> {
  rowId: number;   // было: id — page-local позиционный индекс 0..N-1
  rowSrc: T;
  [key: string]: any;
  constructor(rowId: number, rowSrc: T) { this.rowSrc = rowSrc; this.rowId = rowId; }
}
```

Семантика индекса не меняется: присваивается в `TableRowsFactory.convert` из позиции массива,
page-local `0..N-1`, переживает sort/filter (`MatTableDataSource` переупорядочивает render-копию,
объекты не трогает), колонка-№ по-прежнему добавляет `_indexPageOffset` при отображении.

### Правило миграции read-sites

`.id` → `.rowId` **только там, где получатель — `TableRow`**. Бизнесовый `rowSrc.id`
(пользовательское поле данных `T`) **не трогаем**.

`TableRow`-сайты (переименовать):
- `ngx-aur-mat-table.component.html`: `:398` (tableView), `:165` (колонка-№),
  `:70/72/73/86/88/89/487/488` (timeline-биндинги), `:257` (actionView).
- `ngx-aur-mat-table.component.ts`: `:918/939` (rowStyles), `:770-781` (timeline-расчёт),
  `:1145` (`r.rowId === row.rowId`; `getSelectedRows(): TableRow<T>[]` — подтверждено
  `SelectionProvider.ts:71`), `:457/463` (контекст `index: element.rowId`).
- `factories/ActionViewFactory.ts:14` (`result.set(row.rowId, …)`).
- Спеки, строящие `new TableRow(...)` и читающие `.id` как индекс
  (`TableViewFactory.spec.ts`, `RowStyleFactory.spec.ts`, `ActionViewFactory.spec.ts`,
  `NgxAurFilters.spec.ts` и пр.).
- Док-комментарии: `model/RowStyleFactory.ts:13`, `model/AurRowContext.ts`, `model/AurCellContext.ts`.

`rowSrc`-сайты (оставить как есть):
- `tableConfig.trackBy` — получает `rowSrc` (`ColumnConfig.ts:34` `(item: T) => unknown`,
  вызывается `this.tableConfig.trackBy(row.rowSrc)` в `component.ts:836`). Спеки
  `trackBy: r => r.id` / `item => item.id` читают **бизнес-id** (данные `{id, name}`) — не менять.
- `valueConverter`, `dataPropertyGetter` (`element[key]`) — работают с бизнес-ключами.

> На этапе плана — пройтись по **каждому** вхождению `.id` и классифицировать по типу
> получателя (TableRow vs rowSrc), чтобы миграция была механически однозначной.

### Dev-guard на reserved-ключи

Отдельный метод, вызывается из init-пути компонента (рядом с обязательной проверкой
`[tableConfig]` в `ngOnInit`, до `initTable()`), один раз на применение конфига:

```ts
private warnReservedColumnKeys(): void {
  if (!isDevMode()) return;
  const RESERVED = ['rowId', 'rowSrc'];
  this.tableConfig.columnsCfg
    .filter(c => RESERVED.includes(c.key))
    .forEach(c => console.warn(
      `[aur-mat-table] ключ колонки "${c.key}" конфликтует со служебным полем TableRow — переименуйте колонку.`));
}
```

`key:'id'` теперь валиден и ничего не триггерит — он ложится в `row['id']` как бизнес-значение
и читается через `dataPropertyGetter`.

### Публичный `index` в контекстах

`component.ts:457/463` — источник `index` переключается на `rowId`:

```ts
return { $implicit: element.rowSrc, row: element, rowSrc: element.rowSrc, index: element.rowId };
```

Ключ контекста остаётся `index` → потребительские `let-i="index"` не ломаются.

## Поведение

| Сценарий | До | После |
|---|---|---|
| Колонка `key:'id'` + `valueView`, бизнес-id `[23,3,2,1]` | иконка только у 1/2/3 (попавших в диапазон), у 23 — текст; виды перепутаны | иконка у всех строк; виды корректны |
| Колонка-№ при наличии `key:'id'` | печатает бизнес-id | печатает позицию `1..N` |
| timeline-разрывы при `key:'id'` | мусорные | корректные |
| `row.id` у потребителя (ожидал индекс) | индекс (или бизнес-id при коллизии) | `undefined` (или бизнес-id, если есть колонка `id`) → миграция на `index` |
| Данные без бизнес-`id`, без колонки `id` | работает | работает (rowId синтетический) |
| Колонка `key:'rowId'`/`'rowSrc'` | тихая порча | dev-warn + (порча сохраняется до переименования) |

## Edge cases

- **Данные без поля `id`.** Библиотека на бизнес-`id` не полагается: `rowId` ставится из позиции
  массива. Default trackBy (`component.ts:836`) — ссылка на `rowSrc`, `id` не нужен.
- **Несколько колонок с reserved-ключом.** Guard варнит по каждой.
- **Прод-сборка.** `isDevMode()` отсекает guard; в проде проверки нет (как и прочие dev-варны либы).
- **`rowSrc`-коллизия** (`key:'rowSrc'`) — покрыта тем же guard'ом; ломает скролл/expand/highlight
  (`component.ts:384,1031`), но это сценарий той же природы и теперь предупреждается.
- **Sort/filter.** `rowId` едет вместе со строкой, `tableView` в исходном порядке → лукап верен
  при любом отображаемом порядке (инвариант не меняется, только имя поля).

## Публичный контракт и миграция

- **Удаляется:** `TableRow.id` как служебный индекс. Shim невозможен (геттер `id` несовместим
  с колонкой, пишущей `row['id']`).
- **Сохраняется:** контекстный `index` (`ngxAur*Def`-шаблоны), `TableRow.rowSrc`,
  все `@Output` (они над `T`/`rowSrc`, индекс не отдают), `tableConfig.trackBy` (над `rowSrc`).
- **Миграция потребителя:** «читали `row.id` для индекса строки → используйте контекстный `index`;
  `id` как ключ колонки теперь работает штатно».
- **Версия:** breaking → **20.0.0**. Changelog-запись — при бампе, не в этом коммите.

## Тесты

Новый `ngx-aur-mat-table-rowid-collision.spec.ts` + правки существующих.

1. **Репро (red → green).** Колонка `key:'id'` + `valueView` с иконкой, данные с бизнес-id
   вне диапазона позиций (`[{id:23},{id:3},{id:2},{id:1}]`, 4 строки) → иконка резолвится
   для **всех** строк, включая `id:23`. До фикса падает, после — зелёный.
2. **Колонка-№ при наличии `key:'id'`.** `indexCfg` + колонка `id` → отображается позиция
   `1..N`, не бизнес-id.
3. **rowStyles при наличии `key:'id'`.** `bodyRowCfg.styleCfg` по позиции применяется к верным
   строкам.
4. **timeline-разрывы при наличии `key:'id'`.** Gap-детекция корректна.
5. **Guard.** Колонка `key:'rowId'` и `key:'rowSrc'` → `console.warn` (spy) в dev-режиме.
6. **Регрессия.** Полный существующий набор зелёный после `.id`→`.rowId`
   (включая `TableViewFactory`, `RowStyleFactory`, `ActionViewFactory`, trackBy-, expanded-rows-спеки).
7. **trackBy не затронут.** Бизнес-key trackBy (`item => item.id` над данными `{id, name}`)
   по-прежнему переиспользует DOM (существующий `trackby.spec.ts` остаётся зелёным без правок логики).

## Документация

- JSDoc на поле `rowId` (что это page-local индекс) — в коде.
- Обновить док-комментарии `AurRowContext`/`AurCellContext` («Индекс строки = row.rowId»).
- README: при необходимости — заметка про коллизию ключей колонок со служебными полями
  (`rowId`/`rowSrc`) и про то, что индекс строки берётся из контекстного `index`.
- Changelog 20.0.0: breaking — `TableRow.id` (индекс) переименован в `rowId`; внешний контракт
  индекса — контекстный `index`; миграция как выше.
