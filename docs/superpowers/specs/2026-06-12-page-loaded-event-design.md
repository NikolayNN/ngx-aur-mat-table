# Событие (pageLoaded): данные применённой серверной страницы для родителя

**Дата:** 2026-06-12
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича — новый `@Output() pageLoaded` + экспортируемый тип
`AurPageLoadedEvent<T>`. Существующее поведение не меняется (кто не подписан — не заметит).
**Контекст батча:** пункт 3 фидбека от 2026-06-11 (Andrey Patsko); ветка `feat/19.7.0-feedback`,
коммит на пункт. Опирается на пункты 1-2 (server sort mode, initial sortCfg).

## Проблема

В `pageSource`-режиме таблица сама управляет загрузкой, и у родителя нет момента/данных
пришедшей страницы: `totalElements` живёт внутри таблицы (`paginatorState`), публичного
выхода нет. Кейс фидбека: header-счётчики («всего найдено: N»), графики и связанные
представления. Обходной путь — `tap()` внутри своей `pageSource`-функции — работает, но:
side-effect прячется в загрузчике, фабричный `pageSource` (паттерн консьюмера) приходится
оборачивать на каждом экране, и `tap` срабатывает в момент HTTP-ответа, а не после
применения данных таблицей. У таблицы уже есть `loadingChange` и `pageError` —
`pageLoaded` достраивает тройку жизненного цикла загрузки.

## Решение (зафиксировано с пользователем)

| Решение        | Выбор                                                                                                                                                                                |
|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Механизм       | `@Output() pageLoaded` с эмитом из коллбека `onResult` `ServerPageController` (вариант «tap в pageSource» отклонён как статус-кво, «Observable из контроллера» — как раздувание API) |
| Форма события  | `AurPageLoadedEvent<T> = { content: T[]; totalElements: number; pageIndex: number }` — имена как в `AurPage`/фидбеке; `pageIndex` вместо спрингового `number` — однозначнее          |
| Момент эмита   | ПОСЛЕ `refreshTable()`: `paginatorState` и данные уже применены, родитель может безопасно читать публичное состояние таблицы                                                         |
| Когда эмитится | каждая успешная загрузка: старт, смена страницы, сортировка, `reload()`; при ошибке — нет (зона `pageError`)                                                                         |
| Режимы         | только `pageSource`; в ручном/legacy режиме события нет — хост сам грузит данные (JSDoc)                                                                                             |

## Контракт — `model/AurPage.ts`

```ts
/** Данные применённой серверной страницы (pageSource-режим) — для счётчиков/графиков родителя. */
export interface AurPageLoadedEvent<T> {
  content: T[];
  totalElements: number;
  pageIndex: number;
}
```

Экспорт — автоматически через существующий `export * from './lib/model/AurPage'`
в `public-api.ts`, правка не нужна.

## Реализация — `ngx-aur-mat-table.component.ts`

1. Новый output рядом с `loadingChange`/`pageError`:

```ts
/**
 * Успешно загруженная и УЖЕ применённая серверная страница (pageSource-режим).
 * Эмитится на каждую успешную загрузку: старт, смена страницы, сортировка, reload().
 * При ошибке не эмитится (см. pageError). В ручном/legacy режиме события нет —
 * хост загружает данные сам.
 */
@Output() pageLoaded = new EventEmitter<AurPageLoadedEvent<T>>();
```

2. Эмит в `startServerController()`, коллбек `onResult`, после `refreshTable()`:

```ts
onResult: result => {
  this.paginatorState = result.state;
  this.applyExternalPaginatorState(result.state);
  this.tableData = result.content;
  this.refreshTable();
  this.pageLoaded.emit({
    content: result.content,
    totalElements: result.state.length,
    pageIndex: result.state.pageIndex,
  });
  this.cdr.markForCheck();
},
```

`ServerPageController` не меняется.

## Edge cases

- **Ошибка загрузки**: `catchError` контроллера → `onError`/`pageError`, `onResult` не
  вызывается → `pageLoaded` нет. `loadingChange(false)` приходит в обоих исходах.
- **`reload()`/внешний пагинатор**: идут через тот же `onResult` → эмитятся штатно.
- **Пустая страница** (`content: []`): эмитится как обычная успешная загрузка.
- **Initial sort (пункт 2)**: стартовая загрузка с `sortCfg` даёт ровно один `pageLoaded`
  (пин из финального ревью пункта 2).
- **Клиентский/ручной режим**: контроллер не создаётся → события нет.

## Тесты — новый `ngx-aur-mat-table-page-loaded.spec.ts`

1. **Стартовая загрузка с `sortCfg`**: ровно один `pageLoaded` с
   `{content, totalElements, pageIndex: 0}`.
2. **Смена страницы**: `onPageChangeInternal` → второй эмит с новым `pageIndex`.
3. **Ошибка**: `pageSource` кидает → `pageError` есть, `pageLoaded` нет.
4. **Консистентность**: в обработчике события `table.paginatorState.length === event.totalElements`
   (состояние применено до эмита).
5. **Клиентский режим**: `tableData` без `pageSource` → событие не эмитится.

## Документация

- JSDoc — в контракте и output выше.
- README: одно предложение в секции server pagination после абзаца **Sorting:**
  (событие `(pageLoaded)` с применённой страницей для счётчиков/графиков).
- Changelog-запись — при бампе 19.7.0, не в этом коммите.
