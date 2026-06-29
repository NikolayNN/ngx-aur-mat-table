# Миграция на 19.16.0 — явный режим пагинации

В 19.16.0 `paginationCfg.mode` становится **единственным переключателем режима** пагинации.
`paginatorState` теперь несёт только состояние пагинатора (total + индекс страницы) — он больше
не активирует серверный режим. В этом же релизе удалены устаревшие back-compat элементы API.
Ниже — три таблицы, показывающие что изменилось, и пошаговые инструкции по миграции.

## A. Поведение по конфигурации

| Конфигурация | Было (19.15.0) | Стало (19.16.0) | Тип |
|---|---|---|---|
| `mode:'client'` / не задан | Полностью клиентский | без изменений | ✅ |
| `mode:'server'` + `[paginatorState]` + `(pageChange)` | ❌ сортировка серверная, но пагинатор привязан → клиентская перенарезка серверной страницы (пустая страница / сброс в 0 / лишний `pageChange`) | ✅ `paginator=null`, без перенарезки, все строки показаны на любой странице, `(pageChange)` эмитит, хост грузит | 🐞→✅ исправлено |
| `mode:'server'` + `[pageSource]` | работало | без изменений | ✅ |
| `[pageSource]` без `mode` | работало как серверный | без изменений | ✅ |
| `[paginatorState]` без `mode` | ⚠️ противоречиво (сортировка клиент, индекс/timeline сервер, пагинация сломана) | полностью **клиентский** | ⚠️ breaking |

## B. Почему было путано — по подсистемам

| Подсистема | `paginatorState` без `mode` — было | `mode:'server'` + `paginatorState` — было | Сейчас (через `isServerMode()`) |
|---|---|---|---|
| `dataSource.paginator` | привязан → нарезает | привязан → **нарезает (баг)** | `null` при серверном, привязан при клиентском |
| `dataSource.sort` | клиент (`matSort`) | сервер (`null`) | согласованно с пагинатором |
| `_indexPageOffset` | сервер (по `paginatorState`) | сервер | по `isServerMode()` |
| нарезка timeline | сервер | сервер | по `isServerMode()` |

## C. Публичный API

| Элемент | Было | Стало | Тип |
|---|---|---|---|
| Источник режима | `pageSource` **или** `mode` **или** наличие `paginatorState` | только `mode` (`pageSource ⇒ server`) | ⚠️ breaking |
| `paginatorState` | переключал режим + нёс состояние | **только состояние** | ⚠️ breaking |
| `new PaginatorState(total, idx)` | публичный позиционный конструктор | `private`; только `.of({total,pageIndex})` / `.empty()` | ⚠️ breaking |
| `NgxAurTablePageEventUtils.createEmpty(cfg)` | `@deprecated`, нужен для ручного старта | удалён; сервер автоматически сеет `PaginatorState.empty()` | ⚠️ breaking |
| Внутренние предикаты | `isServerMode()`=pageSource, `isServerWiring()`=pageSource\|\|mode | `isServerMode()`=mode\|\|pageSource, `hasPageSource()`=pageSource; `isServerWiring()` удалён | внутреннее |

## Что менять в приложении

### 1. Ручная серверная пагинация — добавьте `mode: 'server'`

Если вы используете ручную серверную пагинацию (`[paginatorState]` + `(pageChange)` без `pageSource`),
добавьте `mode: 'server'` в `paginationCfg`. Без него таблица теперь работает как клиентская и будет
перенарезать ваши данные локально.

```ts
// было (работало случайно через присутствие paginatorState):
paginationCfg: { enable: true, size: 20 }

// стало:
paginationCfg: { enable: true, size: 20, mode: 'server' }
```

Разметка без изменений: `[tableData]="page.content"` + `[paginatorState]` + `(pageChange)`.

### 2. bare `[paginatorState]` без `mode` теперь клиентский

Если вы полагались на серверное поведение только через `[paginatorState]` (без явного `mode`) —
добавьте `mode: 'server'` (см. п.1). Иначе таблица будет нарезать данные локально.

### 3. `new PaginatorState(total, idx)` → `PaginatorState.of(...)`

Публичный позиционный конструктор стал `private`. Используйте именованные фабрики:

```ts
// было:
new PaginatorState(total, pageIndex)

// стало:
PaginatorState.of({ total, pageIndex })
```

Для пустого/дефолтного состояния:

```ts
PaginatorState.empty()
```

### 4. `NgxAurTablePageEventUtils.createEmpty(cfg)` удалён

В серверном режиме начальное состояние сеется автоматически (`PaginatorState.empty()`) в `ngOnInit`.
Явный вызов больше не нужен. Если вам нужно пустое состояние явно — используйте `PaginatorState.empty()`.

```ts
// было:
this.paginatorState = NgxAurTablePageEventUtils.createEmpty(this.tableConfig.paginationCfg);

// стало (если явная инициализация всё же нужна):
this.paginatorState = PaginatorState.empty();
// или просто не инициализируйте — таблица сеет сама при mode:'server'
```
