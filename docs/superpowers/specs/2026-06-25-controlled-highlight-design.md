# Управляемый highlight (controlled highlight, развязка от click)

**Дата:** 2026-06-25
**Статус:** Design (одобрен к реализации)
**Тип изменения:** новая фича, additive. Подсветка строки получает собственный конфиг,
выделенный output для two-way и режим, развязывающий подсветку от клика. Существующее
поведение сохраняется при отсутствии нового конфига.
**Релиз:** 19.15.0 (minor). **Ветка:** `feat/controlled-highlight`.
**Контекст:** пункт 7 фидбэк-батча «Управляемый highlight» (Tier 1 по результатам валидации).
Tier 2 (`[highlightedRows]` / multiple) и Tier 3 (полный разрыв click↔highlight как breaking)
вынесены за рамки.

## Проблема

Подсветка строки сегодня неотделима от клика и не имеет полноценного controlled-контракта.
Подтверждено в коде:

| Факт | Где |
|---|---|
| `highlighted` — скаляр `T \| undefined` (одна строка) | `ngx-aur-mat-table.component.ts:284` |
| клик ВСЕГДА мутирует `highlighted` (кроме `enable:false`) | `handleRowClick` (`ts:963-975`) |
| единственный выход — `(rowClick)`, нет `(highlightedRowChange)` | `ts:237` |
| внешний вход — `[highlight]` через обёртку-контейнер (хак под OnChanges) | `ts:299-301`, `HighlightContainer` `ts:67-69` |
| `[highlight]`-вход маппится на `highlighted` + scrollIntoView | `handleHighlightChange` (`ts:378-393`) |
| конфиг подсветки живёт под «click»: `clickCfg.cancelable`, `clickCfg.styleCfg` | `model/ColumnConfig.ts:85-115` |
| стиль/класс/aria подсветки читаются из `clickCfg.styleCfg` | `rowStyle:938`, `rowNgClass:945,958`, `aria-current` `html:468` |

Следствия (все подтверждены):

1. **Нет чистого controlled-режима.** Клик мутирует `highlighted` напрямую, не сверяясь
   ни с каким режимом, и НЕ уведомляет наружу (нет `(highlightedRowChange)`). Контейнер,
   пытающийся держать состояние через `[highlight]`, получает рассинхрон: клик меняет
   внутреннее состояние за его спиной. Это ровно та поломка, которую для detail-строк уже
   починили `extendedRowCfg.mode:'controlled'` (19.9.0) — highlight остался на старом дизайне.
2. **Подсветка концептуально под «click».** Нельзя подсветить без клика как модели и нельзя
   кликнуть без подсветки; конфиг и стайлинг названы «click».
3. **Хак `HighlightContainer`** существует именно потому, что нет выхода для синка состояния
   (`ts:299`-коммент: «иначе OnChange не видит одинаковые значения»).

## Решение (зафиксировано с пользователем)

Привести highlight к тому же controlled-паттерну, что уже узаконен для expanded-rows.
Additive: без нового конфига поведение 1:1 как сегодня.

| Решение | Выбор |
|---|---|
| Ось «владение» | Три режима, зеркало `extendedRowCfg`: `row-click` (дефолт) / `controlled` / `manual`. Кардинальность (single/multiple) НЕ смешиваем с владением — Tier 1 только single. |
| Дом конфига | Новый `highlightCfg` владеет `mode` + `cancelable` + `styleCfg`. `clickCfg.cancelable` и `clickCfg.styleCfg` депрекейтятся (fallback + dev-warn), `clickCfg.enable` остаётся. |
| Выделенный output | `[highlightedRow]` / `(highlightedRowChange)` (single, two-way `[(highlightedRow)]`). Старый `[highlight]` + `HighlightContainer` — `@deprecated`, продолжают работать; удаление в мажор. |
| «highlight ≠ row click» | Закрывается режимом `manual`: клик НЕ подсвечивает, но `(rowClick)` всё равно летит (для действий). |
| Идентичность | Highlight остаётся reference-based по `rowSrc` (`=== row.rowSrc`), как сегодня. НЕ переводим на `trackBy` (это поведенческое изменение и scope creep). Server-reload-поведение highlight не меняется. |
| scroll-into-view | Хардкод как сегодня: программная установка `[highlightedRow]` скроллит smooth/center; клик не скроллит. Без конфиг-флага. |

## Контракт — `model/ColumnConfig.ts`

```ts
export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig<T>;
  hoverCfg?: HoverConfig<T>;
  styleCfg?: BodyStyleConfig<T>;
  highlightCfg?: HighlightConfig<T>;            // NEW
}

export interface HighlightConfig<T = any> {
  /**
   * Кто владеет состоянием подсветки.
   * 'row-click' (по умолчанию): таблица владеет, клик подсвечивает/снимает (текущее поведение).
   * 'controlled': источник правды — [highlightedRow]; клик шлёт (highlightedRowChange),
   *   контейнер применяет (см. two-way [(highlightedRow)]). _highlighted_ не мутируется кликом.
   * 'manual': состояние только из [highlightedRow]; клик НЕ подсвечивает. (rowClick всё равно летит.)
   */
  mode?: 'row-click' | 'controlled' | 'manual';

  /**
   * По умолчанию false. Повторный клик по уже подсвеченной строке:
   * false — оставляет подсветку (эмит той же строки);
   * true  — снимает подсветку (эмит null в row-click / запрос null в controlled).
   * В manual нерелевантно (клик не подсвечивает).
   */
  cancelable?: boolean;

  /** Стиль/класс подсвеченной строки (выделенный styling contract). */
  styleCfg?: HighlightStyleConfig<T>;
}

export interface HighlightStyleConfig<T = any> {
  /** CSS-класс(ы) на подсвеченном <tr>; значение или (row) => значение. */
  class?: RowValue<T, string | null>;
  /** Инлайн-стиль; StyleBuilder.Row | строка, либо (row) => то же. */
  style?: RowValue<T, StyleBuilder.Row | string>;
}
```

Депрекейты в существующем `ClickConfig` (JSDoc `@deprecated`, поля сохраняются):

```ts
export interface ClickConfig<T = any> {
  enable?: boolean;                              // без изменений — гейт интерактивности

  /** @deprecated Используйте highlightCfg.styleCfg. Работает как fallback. */
  styleCfg?: ClickStyleConfig<T>;

  /** @deprecated Используйте highlightCfg.cancelable. Работает как fallback. */
  cancelable?: boolean;
}
```

## Контракт — `ngx-aur-mat-table.component.ts`

```ts
@Input()  highlightedRow: T | null = null;
@Output() highlightedRowChange = new EventEmitter<T | null>();
```

Пара именована под two-way: `[(highlightedRow)]` работает из коробки.

Депрекейт существующего входа (сохраняется, работает):

```ts
/** @deprecated Используйте [(highlightedRow)] (controlled) или [highlightedRow] (row-click seed). */
@Input() highlight: HighlightContainer<T> | undefined;
```

## Семантика режимов

`mode = bodyRowCfg.highlightCfg?.mode ?? 'row-click'`.
`cancelable = highlightCfg?.cancelable ?? clickCfg?.cancelable ?? false` (fallback на депрекейт).

| mode | владелец `highlighted` | клик подсвечивает? | `(highlightedRowChange)` на клик | `(rowClick)` на клик |
|---|---|---|---|---|
| **row-click** (default) | таблица | да, мутирует | да — отражает новое состояние | да (legacy-семантика) |
| **controlled** | контейнер (`[highlightedRow]`) | нет (только эмит-запрос) | да — запрос, без мутации | да (legacy-семантика) |
| **manual** | контейнер (`[highlightedRow]`) | **нет** | **нет** | да — всегда эмитит строку |

- `(rowClick)` **не меняет** своей legacy-семантики в row-click/controlled (эмитит `rowSrc`,
  либо `undefined` при cancelable-toggle-off) — обратная совместимость. В `manual` toggle нет,
  поэтому `(rowClick)` всегда эмитит кликнутую строку.
- `(highlightedRowChange)` — **новый** output; эмитится только от клика (row-click/controlled),
  НЕ от эха `[highlightedRow]` (защита от циклов, как у expanded-rows).

## Обработка клика — `handleRowClick`

Переписывается с ветвлением по режиму, при сохранении legacy-семантики `(rowClick)` и
раннего гейта `clickCfg.enable === false` (`ts:966`):

```ts
handleRowClick(row: TableRow<T>) {
  if (this.tableConfig.bodyRowCfg?.clickCfg?.enable === false) return;   // без изменений

  const hl = this.tableConfig.bodyRowCfg?.highlightCfg;
  const mode = hl?.mode ?? 'row-click';
  const cancelable = hl?.cancelable ?? this.tableConfig.bodyRowCfg?.clickCfg?.cancelable ?? false;
  const src = row.rowSrc;
  const toggleOff = src === this.highlighted && cancelable;   // повторный клик по подсвеченной

  if (mode === 'manual') {
    this.rowClick.emit(src);                                  // только action-намерение
    this.handleExpandOnClick(row);
    return;                                                   // highlight не трогаем
  }

  // legacy (rowClick): row, либо undefined при cancelable-toggle-off
  this.rowClick.emit(toggleOff ? undefined : src);

  if (mode === 'controlled') {
    this.highlightedRowChange.emit(toggleOff ? null : src);  // запрос, без мутации
  } else {                                                   // row-click
    this.highlighted = toggleOff ? undefined : src;
    this.highlightedRowChange.emit(this.highlighted ?? null);
  }

  this.handleExpandOnClick(row);
}
```

Эквивалентность с текущим кодом в режиме `row-click` (доказательство back-compat для `rowClick`):

| Состояние | cancelable | сейчас (`ts:967-973`) | новый код | совпадает |
|---|---|---|---|---|
| клик по новой строке | любой | emit `src`, `highlighted=src` | toggleOff=false → emit `src`, `highlighted=src` | да |
| клик по подсвеченной | false | emit `src`, `highlighted=src` | toggleOff=false → emit `src`, `highlighted=src` | да |
| клик по подсвеченной | true | emit `undefined`, `highlighted=undefined` | toggleOff=true → emit `undefined`, `highlighted=undefined` | да |

`(highlightedRowChange)` в row-click — новый output, ранее не существовавший; добавление не
ломает потребителей (никто не слушал).

## Синк из входа — `ngOnChanges`

Зеркало `firstSeed`-логики expanded-rows (`ts:327-336`). Добавляется ветка по `highlightedRow`:

```ts
if (changes['highlightedRow']) {
  const mode = this.tableConfig.bodyRowCfg?.highlightCfg?.mode ?? 'row-click';
  const authoritative = mode === 'controlled' || mode === 'manual';
  const firstSeed = mode === 'row-click' && !!changes['highlightedRow'].firstChange;
  if (authoritative || firstSeed) {
    this.syncHighlightFromInput();
  }
}
```

```ts
private syncHighlightFromInput(): void {
  this.highlighted = this.highlightedRow ?? undefined;
  if (this.highlighted !== undefined) this.scrollHighlightedIntoView(this.highlighted);
}
```

- **controlled / manual** → `[highlightedRow]` авторитетен: синк на каждое изменение входа.
- **row-click** → seed только на `firstChange` (дальше владеет таблица), как expanded-rows.
- Депрекейтнутый `[highlight]` идёт прежним путём `handleHighlightChange` (`ts:378`) без
  изменений (toggle + scrollIntoView). `scrollHighlightedIntoView(...)` — извлечённый из него
  общий метод (findIndex по `rows` + `scrollIntoView({behavior:'smooth',block:'center',inline:'center'})`).
- **Оба входа заданы** (`[highlight]` и `[highlightedRow]`): `isDevMode()`-warn один раз,
  выигрывает `[highlightedRow]` (ветка `highlightedRow` обрабатывается после `highlight` в `ngOnChanges`).

## Стайлинг — `rowStyle` / `rowNgClass`

Источник highlight-стиля становится `highlightCfg.styleCfg ?? clickCfg.styleCfg` (fallback):

```ts
// rowStyle (ts:937-939)
if (this.highlighted === row.rowSrc) {
  const sc = this.tableConfig.bodyRowCfg?.highlightCfg?.styleCfg
          ?? this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
  acc = this.mergeStyle(acc, this.resolveRow(sc?.style, row) ?? null);
}

// rowNgClass (ts:945) — заменить источник `click`
const click = this.tableConfig.bodyRowCfg?.highlightCfg?.styleCfg
           ?? this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
```

Авто-класс `new-color` (`ts:952`), слоение base → hover → highlight (highlight побеждает),
`aria-current` (`html:468`) — без изменений.

## Депрекейт-варнинги (dev-only, один раз)

Через `isDevMode()` и булевы флаги «уже предупредили», чтобы не спамить на каждый CD:

- `clickCfg.cancelable` задан, `highlightCfg.cancelable` нет → warn: «используйте highlightCfg.cancelable».
- `clickCfg.styleCfg` задан, `highlightCfg.styleCfg` нет → warn: «используйте highlightCfg.styleCfg».
- `[highlight]` задан → warn: «используйте [(highlightedRow)]».
- `[highlight]` и `[highlightedRow]` заданы одновременно → warn о конфликте, выигрывает `[highlightedRow]`.

Резолв значений выполняется в одном месте (геттеры `resolvedHighlightCancelable()` /
`resolvedHighlightStyleCfg()`), варн внутри них под `isDevMode()` + флаг.

## Матрица поведения (доказательство совместимости)

| Конфиг | mode | клик по строке | highlight-стиль | Итог |
|---|---|---|---|---|
| нет `highlightCfg` (как у всех текущих) | row-click | подсвечивает + `(rowClick)` | из `clickCfg.styleCfg` (fallback) | визуально и по событиям как сейчас + новый `(highlightedRowChange)` |
| `highlightCfg:{mode:'controlled'}` | controlled | `(rowClick)` + `(highlightedRowChange)`, без мутации | из `highlightCfg.styleCfg` | контейнер владеет, `[(highlightedRow)]` замыкает |
| `highlightCfg:{mode:'manual'}` | manual | только `(rowClick)` | из `highlightCfg.styleCfg` | подсветка только из `[highlightedRow]`; «highlight ≠ click» |
| `clickCfg:{enable:false}` + любой highlightCfg | любой | ранний return — нет клика | — | строка неинтерактивна (19.8.1); `[highlightedRow]` в manual/controlled всё равно подсвечивает |

## Поведенческие изменения (для changelog)

Нет breaking. Единственное наблюдаемое отличие при дефолтном конфиге — добавляется эмиссия
нового `(highlightedRowChange)` на клик в режиме `row-click` (ранее output не существовал).
Депрекейты `clickCfg.cancelable` / `clickCfg.styleCfg` / `[highlight]` продолжают работать.

## Edge cases

- **`mode:'controlled'` без биндинга `[highlightedRow]`**: клик эмитит запрос, но строка не
  подсвечивается, пока контейнер не вернёт значение — корректное поведение controlled.
- **`mode:'manual'`**: клик не подсвечивает и не эмитит `(highlightedRowChange)`; `(rowClick)`
  летит. Подсветка только из `[highlightedRow]`.
- **server reload** (объекты пересозданы): highlight reference-based — подсветка схлопывается
  по смене ссылки, как сегодня (поведение НЕ меняется; trackBy в Tier 1 не вводим).
- **подсвеченная строка ушла со страницы** (пагинация/фильтр): класс/стиль не применяются (нет
  совпадения `=== rowSrc`); `[highlightedRow]` в controlled/manual продолжает держать значение.
- **`clickCfg.enable:false`**: клик не подсвечивает (ранний `return`); `[highlightedRow]` в
  controlled/manual подсвечивает (вход не зависит от клик-гейта).
- **`[highlight]` + `[highlightedRow]` вместе**: dev-warn, `[highlightedRow]` выигрывает.

## Тесты — новый `ngx-aur-mat-table-highlight.spec.ts` + дополнения

Хост с настраиваемым `bodyRowCfg.highlightCfg` и биндингом `[(highlightedRow)]`:

1. **row-click**: клик подсвечивает; клик по другой переносит подсветку; `(highlightedRowChange)`
   эмитит `rowSrc`; `(rowClick)` эмитит `rowSrc`.
2. **row-click + cancelable**: повторный клик снимает подсветку, `(highlightedRowChange)` → `null`,
   `(rowClick)` → `undefined` (legacy).
3. **controlled**: клик НЕ меняет DOM сам по себе (нет мутации) — эмитит `(highlightedRowChange)`;
   задание `[highlightedRow]` подсвечивает; `[(highlightedRow)]` end-to-end замыкает цикл.
4. **manual**: клик не подсвечивает и не эмитит `(highlightedRowChange)`; `(rowClick)` летит;
   только `[highlightedRow]` подсвечивает.
5. **fallback стайлинга**: `highlightCfg.styleCfg` побеждает `clickCfg.styleCfg`; при отсутствии
   `highlightCfg.styleCfg` применяется `clickCfg.styleCfg`.
6. **dev-warn депрекейтов**: `clickCfg.cancelable`/`clickCfg.styleCfg`/`[highlight]` → варн один раз,
   функциональность отрабатывает.
7. **back-compat `[highlight]`**: старый вход + `HighlightContainer` подсвечивает и скроллит
   (существующие highlight-спеки зелёные).
8. **`enable:false`**: клик не подсвечивает во всех режимах; `[highlightedRow]` в manual/controlled
   подсвечивает.
9. **конфликт входов**: `[highlight]` + `[highlightedRow]` → выигрывает `[highlightedRow]`, dev-warn.
10. **scroll-into-view**: программная установка `[highlightedRow]` зовёт `scrollIntoView` на строке;
    клик — не зовёт.
11. **Регрессия**: без `highlightCfg` клик подсвечивает/снимает как раньше; стиль/класс/`aria-current`
    ставятся; существующие row-style-спеки зелёные.

## Демо — `aur-demo`

Добавить секцию controlled highlight: `[(highlightedRow)]` с состоянием в контейнере +
переключатель режима (row-click / controlled / manual) и кнопка «подсветить программно».
Существующий пример с `clickCfg.styleCfg` оставить (демонстрирует back-compat + fallback).

## Документация

- JSDoc — в контрактах выше (`HighlightConfig`, депрекейты).
- README: секция highlight — таблица режимов, `highlightCfg`, пара `[(highlightedRow)]`,
  заметки про депрекейт `[highlight]` / `clickCfg.{cancelable,styleCfg}`.
- `changelog/19.15.0.md` (Keep-a-Changelog, скилл writing-changelog) — фича в «Добавлено»,
  депрекейты в «Устарело».

## Верификация

- `npm run build_lib` компилируется чисто.
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — новые + существующие
  тесты зелёные.

## Риск

Низкий-средний. Зона изменений — `handleRowClick`, ветка `ngOnChanges`, два источника стиля
в `rowStyle`/`rowNgClass`, новые input/output и поле конфига + два депрекейта с fallback.
Additive (без нового конфига — поведение прежнее). Основной риск — полнота матрицы
(3 режима × cancelable × источник состояния × fallback стайлинга), закрывается спеком из 11 групп.

## Вне рамок (Tier 2 / Tier 3)

- **Tier 2:** `[highlightedRows]` / `highlightCfg.multiple` — мультиподсветка. Конфиг намеренно
  shaped так, чтобы добавить плюрал позже без слома (как `extendedRowCfg.multiple`).
- **Tier 3:** полный разрыв click↔highlight как breaking (клик в `row-click` перестаёт неявно
  подсвечивать; удаление `[highlight]`/`HighlightContainer`/депрекейтов `clickCfg`) — в мажор.
