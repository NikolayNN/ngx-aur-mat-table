# Авто-offset колонки индекса в серверном режиме

**Дата:** 2026-06-15
**Статус:** Design (одобрен к реализации)
**Тип изменения:** fix высокого бага из аудита 2026-06 («server-индексы»). Меняет
отображаемый номер строки в серверном (`pageSource`) режиме; клиентский режим не затронут.
Отметить в changelog 19.7.0 как fix.
**Контекст батча:** пункт 5 фидбека от 2026-06-11 — **переформулирован**. Исходная просьба
«официально поддержать ручной server mode без pageSource» отклонена: ручная обвязка
(`paginatorState` + события) deprecated в пользу `pageSource` и подлежит удалению — полировать
её нельзя. Сохранён только реальный баг, скрытый в пункте: индекс не учитывает страницу,
и это ломается в рекомендованном `pageSource`-режиме тоже. Ветка `feat/19.7.0-feedback`,
коммит на пункт.

## Проблема

`id` строки — её позиция в **загруженном** массиве: `TableRowsFactory.convert` делает
`data.map((obj, index) => new TableRow(index, ...))` (`TableRowsFactory.ts:13`), всегда `0..N`
в пределах переданного массива. Колонка индекса печатает `format(id)` = `id + indexCfg.offset`
(`IndexProvider.format`, шаблон `component.html:163`).

- **Клиентский режим**: `tableData` — весь датасет, ids идут `0..total-1` сквозь все страницы,
  `MatTableDataSource` нарезает локально → индекс уже абсолютный. **Корректно, не трогаем.**
- **Серверный (`pageSource`) режим**: `tableData` — только текущая страница (например, 20 строк),
  ids всегда `0..19` → на каждой странице индекс `1..20` вместо `21..40`. **Баг** (высокий, аудит 2026-06).

Offset нужен ровно тогда, когда данные постраничные с сервера.

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Сигнал серверного режима | наличие `paginatorState` — устоявшаяся идиома компонента (`getTimelineVisibleData()` и `currentPaging()` уже ветвятся на `if (this.paginatorState)`); новых предикатов нет |
| Величина offset | `pageIndex * pageSize`, где `pageSize = activePaginator?.pageSize ?? paginationProvider.size` (та же логика, что в `currentPaging()`) |
| Где живёт | предвычисляемое поле `_indexPageOffset`, считается раз на загрузку в `prepareTableData()` (паттерн precompute, как `_alignClass`/`rowStyles`) |
| IndexProvider | не меняется — остаётся чистым форматтером; offset прибавляется на стороне компонента |
| Ручной/legacy режим | отдельно не поддерживаем, но если `paginatorState` задан — индекс тоже станет корректным (бесплатный побочный фикс) |

## Реализация

### `ngx-aur-mat-table.component.ts`

Новое поле рядом с прочими precompute-полями:

```ts
/** Смещение индекса строки на номер страницы в серверном режиме (pageIndex*pageSize); 0 в клиентском. */
_indexPageOffset = 0;
```

Вычисление в `prepareTableData()`, после создания `paginationProvider`:

```ts
this.paginationProvider = PaginationProvider.create(this.tableConfig);

// Серверная страница содержит только свои строки (id = позиция в странице) — смещаем индекс
// на номер страницы. Клиентский режим режет весь датасет локально (id сквозной) → offset 0.
const pageSize = this.activePaginator?.pageSize ?? this.paginationProvider.size;
this._indexPageOffset = this.paginatorState ? this.paginatorState.pageIndex * pageSize : 0;
```

### `ngx-aur-mat-table.component.html` (строка 163)

```html
{{ indexProvider.format(element.id + _indexPageOffset) }}
```

`format()` сверху добавляет `indexCfg.offset` и применяет `formatter`. Итоговый отображаемый
номер = `id + _indexPageOffset + indexCfg.offset → formatter`.

## Поведение

| Режим | `_indexPageOffset` | Индекс на стр. 2 (size 20, offset 1) |
|---|---|---|
| Клиентский | 0 | `21..40` (как сейчас — ids сквозные) |
| `pageSource` | `pageIndex*pageSize` | `21..40` (фикс; было `1..20`) |
| Без колонки индекса | — | Dummy-провайдер, no-op |

## Edge cases

- **`formatter`** (`i => \`${i}.\``) видит уже абсолютный номер — корректно.
- **Смена размера страницы**: `activePaginator.pageSize` отражает новый размер, хост
  перезагружается с него → offset согласован.
- **`pageSize` на старте**: на первой серверной загрузке `prepareTableData` вызывается из
  `onResult` (после `ngAfterViewInit` → `initPaginator`), `activePaginator` уже доступен;
  fallback `paginationProvider.size` страхует.
- **Таймлайн** использует `element.id` отдельно (within-page для gap-детекции) — не затрагивается.
- **Клиент без пагинации**: `paginatorState` undefined → offset 0, без изменений.

## Тесты — новый `ngx-aur-mat-table-server-index.spec.ts`

Чтение индекса: колонка `tbl_index` стоит первой в `_displayColumns` → первый `td` строки
(`tr.mat-mdc-row td:first-child`).

1. **Server, страница 0**: `pageSource`, `indexCfg: { offset: 1 }`, страница из 3 строк →
   индексы `['1','2','3']`.
2. **Server, страница 2**: после `onPageChangeInternal({pageIndex: 2, pageSize: 20})` сервер
   отдаёт новую страницу → первый индекс `'41'` (`2*20 + 0 + 1`).
3. **Регрессия клиентского режима**: клиентские данные (12 строк, size 5), переход на стр. 2 →
   индексы продолжают нумерацию (например `'6'..'10'` при offset 1), offset не задвоился.
4. **Клиент без `paginatorState`**: индекс + клиентские данные, страница 0 → `1..N` (пин).

## Документация

- JSDoc на поле `_indexPageOffset` (внутреннее) — в коде выше.
- README: одно предложение в секции server pagination — индекс отражает абсолютный номер строки
  через страницы.
- Changelog-запись — при бампе 19.7.0, не в этом коммите.
