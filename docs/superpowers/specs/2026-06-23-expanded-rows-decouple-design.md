# Независимое управление раскрытием detail-строки (развязка от highlight)

**Дата:** 2026-06-23
**Статус:** Design (одобрен к реализации)
**Тип изменения:** новая фича + один осознанный breaking. Раскрытие detail-строки
становится самостоятельным состоянием; внешний `[highlight]` перестаёт его раскрывать.
**Релиз:** 19.9.0. **Ветка:** `feat/expanded-rows-decouple`.
**Контекст:** пункт 2 фидбэк-батча 19.7.0 «Независимое управление expanded rows».

## Проблема

Раскрытие detail-строки физически завязано на единственное поле `highlighted`.
Отдельного состояния раскрытия не существует — «раскрыто» тождественно «подсвечено».

Подтверждено в коде:

| Факт | Где |
|---|---|
| раскрытие = `element.rowSrc === highlighted` (анимация) | `ngx-aur-mat-table.component.html:477` |
| ленивый рендер контента детали по тому же условию | `ngx-aur-mat-table.component.html:486` |
| `highlighted` — скаляр `T \| undefined` (одна строка) | `ngx-aur-mat-table.component.ts:249` |
| `highlighted` ставится кликом | `handleRowClick` (`ts:807-818`) |
| `highlighted` ставится внешним `[highlight]`-инпутом | `handleHighlightChange` (`ts:330-345`) |
| `highlighted` используется и для стиля/класса/aria | `rowStyle:781`, `rowNgClass:790`, `html:464` |

Следствия (все подтверждены): раскрытие нельзя отвязать от подсветки; нельзя раскрыть
несколько строк (скаляр); нельзя выключить раскрытие по клику отдельно от highlight;
нет выделенного API управления из контейнера; смена highlight закрывает текущую деталь.

## Решение (зафиксировано с пользователем)

Чистый разрыв без переходного периода: **раскрытие — всегда самостоятельное состояние**,
один движок, без legacy-ветки `=== highlighted` в шаблоне. `highlight` возвращается к
своему истинному смыслу (подсветка + scrollIntoView) и больше не раскрывает.

| Решение              | Выбор                                                                                                                                       |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Совместимость        | Чистая развязка. Дефолт `mode: 'row-click'` визуально сохраняет клик-раскрытие. Единственный breaking — `[highlight]` больше не раскрывает. |
| Режимы               | Классические три: `row-click` (uncontrolled), `controlled` (источник правды — контейнер), `manual` (только инпуты, клик инертен).           |
| Single / multiple    | Флаг `multiple` (дефолт false). false → пара `[expandedRow]`/`(expandedRowChange)`; true → `[expandedRows]`/`(expandedRowsChange)`.         |
| Идентичность         | `tableConfig.trackBy` если задан, иначе ссылка на `rowSrc` (как highlight сейчас). Переживает серверный reload при заданном `trackBy`.      |
| Тип инпутов/аутпутов | Говорим в `rowSrc` (`T`), как `rowClick`/`highlight`, а не в `TableRow`.                                                                    |
| Включение фичи       | Наличие `[extendedRowTemplate]` (как сейчас). `extendedRowCfg` только тюнит поведение; `enable` не нужен.                                   |

## Состояние и движок

Один внутренний источник — `Map<unknown, T>` (ключ раскрытия → `rowSrc`). Map, а не Set:
membership проверяется по ключу при рендере, а наружу эмитятся `rowSrc`/`rowSrc[]`.

```ts
private _expanded = new Map<unknown, T>();              // key -> rowSrc

/** Ключ идентичности раскрытия строки — зеркало trackByRow. */
private expandKey(row: TableRow<T>): unknown {
  return this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;
}

/** Ключ по исходному значению (для синка из инпутов, где приходит rowSrc, а не TableRow). */
private keyOfSrc(src: T): unknown {
  return this.tableConfig.trackBy ? this.tableConfig.trackBy(src) : src;
}

/** Рендер-предикат detail-строки. */
isExpanded(row: TableRow<T>): boolean {
  return this._expanded.has(this.expandKey(row));
}
```

Вычислитель следующего состояния (общий для row-click и controlled):

```ts
private nextExpanded(row: TableRow<T>): Map<unknown, T> {
  const key = this.expandKey(row);
  const multiple = !!this.tableConfig.extendedRowCfg?.multiple;
  const next = new Map(this._expanded);
  if (next.has(key)) {
    next.delete(key);                       // повторный клик по открытой — закрыть (toggle)
  } else {
    if (!multiple) next.clear();            // single → аккордеон
    next.set(key, row.rowSrc);
  }
  return next;
}
```

## Три режима (`extendedRowCfg.mode`, дефолт `row-click`)

| mode | владелец состояния | клик по строке | инпуты `[expandedRow(s)]` | эмит `(expanded*Change)` |
|---|---|---|---|---|
| **row-click** | таблица (`_expanded`) | toggle строки | seed **один раз** (firstChange) | да, на каждый toggle |
| **controlled** | контейнер (инпут) | шлёт вычисленное состояние, `_expanded` **не** мутирует | авторитетны каждый CD | да |
| **manual** | контейнер (инпут) | **инертен** для раскрытия | авторитетны каждый CD | нет (от клика) |

`row-click` vs `controlled`: в controlled клик не мутирует `_expanded` (он синкается из
инпута каждый CD), а эмитит вычисленное `nextExpanded(...)` — контейнер обязан вернуть его
через инпут. Это классический controlled-паттерн; `[(expandedRow)]` замыкает цикл сам.

`controlled` vs `manual`: в manual клик вообще не порождает событий раскрытия — контейнер
переключает деталь своими средствами (кнопка в `ngxAurCellDef`, внешний контрол) через инпут.

## Обработка клика

Раскрытие подключается в `handleRowClick` **после** существующей логики highlight/`rowClick`
и **после** гейта `clickCfg.enable === false` (`ts:810`) — поэтому `enable:false` гасит и
клик-раскрытие в режиме `row-click`, консистентно с фичей 19.8.1 (`clickCfg.enable`).

```ts
handleRowClick(row: TableRow<T>) {
  if (this.tableConfig.bodyRowCfg?.clickCfg?.enable === false) return;
  // ... существующая логика rowClick + highlight без изменений ...
  this.handleExpandOnClick(row);                       // NEW
}

private handleExpandOnClick(row: TableRow<T>): void {
  const mode = this.tableConfig.extendedRowCfg?.mode ?? 'row-click';
  if (mode === 'manual') return;                       // клик инертен
  if (mode === 'controlled') {
    this.emitExpanded(this.nextExpanded(row));         // только эмит, без мутации
    return;
  }
  this._expanded = this.nextExpanded(row);             // row-click: мутируем + эмитим
  this.emitExpanded(this._expanded);
}
```

Эмиссия выбирает пару по `multiple`:

```ts
private emitExpanded(map: Map<unknown, T>): void {
  if (this.tableConfig.extendedRowCfg?.multiple) {
    this.expandedRowsChange.emit([...map.values()]);
  } else {
    this.expandedRowChange.emit([...map.values()][0] ?? null);
  }
}
```

## Синк из инпутов (`ngOnChanges`)

```ts
// в ngOnChanges, после существующих веток
const mode = this.tableConfig.extendedRowCfg?.mode ?? 'row-click';
const multiple = !!this.tableConfig.extendedRowCfg?.multiple;

if (changes['expandedRow'] || changes['expandedRows']) {
  const authoritative = mode === 'controlled' || mode === 'manual';
  const firstSeed = mode === 'row-click'
    && (changes['expandedRow']?.firstChange || changes['expandedRows']?.firstChange);
  if (authoritative || firstSeed) {
    this.syncExpandedFromInputs(multiple);
  }
}
```

`syncExpandedFromInputs` перестраивает `_expanded` из активного инпута:

```ts
private syncExpandedFromInputs(multiple: boolean): void {
  const next = new Map<unknown, T>();
  if (multiple) {
    (this.expandedRows ?? []).forEach(src => next.set(this.keyOfSrc(src), src));
    if (isDevMode() && this.expandedRow != null) {
      console.warn('[aur-mat-table] multiple:true — используйте [expandedRows], [expandedRow] игнорируется.');
    }
  } else {
    if (this.expandedRow != null) next.set(this.keyOfSrc(this.expandedRow), this.expandedRow);
    if (isDevMode() && this.expandedRows?.length) {
      console.warn('[aur-mat-table] multiple:false — используйте [expandedRow], [expandedRows] игнорируется.');
    }
  }
  this._expanded = next;
}
```

На смене `tableData` (внутри пути `refreshTable`/`prepareTableData`): пройти по `_expanded`,
заменить `rowSrc` на свежий объект из новых данных по совпадающему ключу, выкинуть ключи,
которых больше нет. Это держит идентичность раскрытия через серверный reload и не даёт
эмитить устаревшие `rowSrc` в режиме `row-click`. (В controlled/manual инпут и так
пересинкается, но обновление Map делает membership корректным до прихода нового инпута.)

## Контракт — `model/ColumnConfig.ts`

```ts
export interface ExtendedRowConfig {
  /**
   * Как управляется раскрытие detail-строки.
   * 'row-click' (по умолчанию): таблица владеет состоянием, клик раскрывает/сворачивает.
   * 'controlled': источник правды — [expandedRow]/[expandedRows]; клик шлёт
   *   (expandedRowChange)/(expandedRowsChange), контейнер применяет (см. [(expandedRow)]).
   * 'manual': состояние только из инпутов; клик не влияет на раскрытие.
   */
  mode?: 'row-click' | 'controlled' | 'manual';

  /**
   * Разрешить раскрытие нескольких строк одновременно.
   * false (по умолчанию): одна строка (аккордеон) — пара [expandedRow]/(expandedRowChange).
   * true: несколько — пара [expandedRows]/(expandedRowsChange).
   */
  multiple?: boolean;
}

// В TableConfig<T> добавляется поле:
//   extendedRowCfg?: ExtendedRowConfig;
```

## Контракт — `ngx-aur-mat-table.component.ts`

```ts
@Input()  expandedRow:  T | null = null;
@Output() expandedRowChange  = new EventEmitter<T | null>();

@Input()  expandedRows: T[] = [];
@Output() expandedRowsChange = new EventEmitter<T[]>();
```

Пары `@Input()/@Output()` именованы под two-way: `[(expandedRow)]` и `[(expandedRows)]`
работают из коробки.

## Точки изменения в шаблоне — `ngx-aur-mat-table.component.html`

- `:477` `[@detailExpand]="element.rowSrc === highlighted ? ..."` → `"isExpanded(element) ? EXPANDED : COLLAPSED"`
- `:486` `*ngIf="element.rowSrc === highlighted"` → `*ngIf="isExpanded(element)"`
- `:39` `[multiTemplateDataRows]="extendedRowTemplate !== null"` — **без изменений**; несколько
  одновременно раскрытых строк рендерятся штатно (у каждой свой `expandedRow` detail-ряд).
- `handleHighlightChange` (`ts:330`), `rowStyle` (`ts:781`), `rowNgClass` (`ts:790`),
  `aria-current` (`html:464`) — **без изменений**: highlight живёт как был.

## Матрица поведения (доказательство совместимости)

| Конфиг | mode | клик по строке | `[highlight]` | Итог |
|---|---|---|---|---|
| нет `extendedRowCfg` (как у всех текущих) | row-click | раскрывает/сворачивает | **не раскрывает** (новое) | визуально как сейчас по клику; программное раскрытие через `[highlight]` отвалилось |
| `extendedRowCfg:{mode:'controlled'}` | controlled | эмит запроса | не раскрывает | контейнер владеет |
| `extendedRowCfg:{mode:'manual'}` | manual | инертен | не раскрывает | только инпуты |
| `extendedRowCfg:{multiple:true}` | row-click | toggle (несколько) | не раскрывает | мультираскрытие |
| `clickCfg:{enable:false}` + любой extendedRowCfg | row-click | не раскрывает | не раскрывает | строка неинтерактивна (19.8.1) |

## Поведенческие изменения (для changelog / migration)

1. **`[highlight]` больше не раскрывает detail-строку** — только подсветка + scrollIntoView.
   Программное раскрытие переезжает на `[expandedRow]` / `[expandedRows]`. *Единственный
   осознанный breaking; затрагивает редкий и концептуально-неверный сценарий.*
2. **Повторный клик по уже раскрытой строке сворачивает её** в режиме `row-click`
   (естественный toggle), **независимо от `clickCfg.cancelable`**. Раньше без `cancelable`
   строка оставалась раскрытой. `cancelable` теперь относится только к highlight/`rowClick`.

Всё остальное без изменений: дефолтное клик-раскрытие, аккордеон (single), подсветка,
hover, серверный режим, timeline-continuation внутри детали.

## Edge cases

- **`multiple` ↔ инпут не совпадают**: активна пара по `multiple`; несоответствующий инпут
  игнорируется с `isDevMode()`-варнингом.
- **`mode:'controlled'` без биндинга инпута**: строки не раскрываются (контейнер обязан
  связать) — корректное поведение controlled.
- **server reload** (объекты пересозданы): при заданном `trackBy` раскрытие сохраняется по
  ключу; без `trackBy` (сравнение по ссылке) — схлопывается, как и highlight сегодня.
- **раскрытая строка ушла со страницы** (пагинация/фильтр): деталь не рендерится (нет
  совпадающей строки); при возврате строки — рендерится снова (ключ совпал).
- **`clickCfg.enable:false`**: клик не раскрывает (ранний `return` в `handleRowClick`);
  раскрытие через инпуты в controlled/manual продолжает работать.
- **timeline + раскрытие**: `aur-timeline-continuation` внутри детали (`html:479-484`) сейчас
  завязан на `timelineProvider.isEnabled`, не на highlight — не затрагивается.

## Тесты — новый `ngx-aur-mat-table-expanded-rows.spec.ts`

Хост с `[extendedRowTemplate]` и настраиваемым `extendedRowCfg`:

1. **row-click single**: клик раскрывает; клик по другой строке закрывает первую (аккордеон);
   клик по открытой — сворачивает; `(expandedRowChange)` эмитит `rowSrc`/`null`.
2. **row-click multiple**: `multiple:true` — две строки раскрыты одновременно;
   `(expandedRowsChange)` эмитит массив `rowSrc`.
3. **controlled**: клик НЕ меняет DOM сам по себе (нет echo) — эмитит запрос; задание
   `[expandedRow]`/`[expandedRows]` раскрывает; клик по открытой эмитит `null`/массив без неё.
4. **manual**: клик не раскрывает и не эмитит событий раскрытия; только инпут раскрывает.
5. **развязка от highlight**: highlight одной строки, раскрытие другой → смена `[highlight]`
   НЕ закрывает раскрытую деталь; `[highlight]` сам по себе НЕ раскрывает.
6. **trackBy-идентичность**: `trackBy` задан, объекты пересозданы (эмуляция reload) →
   раскрытая строка остаётся раскрытой.
7. **clickCfg.enable:false**: клик не раскрывает (row-click); инпут раскрывает (controlled).
8. **dev-warning**: `multiple:false` + `[expandedRows]` (и наоборот) → консольный варн,
   активная пара отрабатывает корректно.
9. **Регрессия**: без `extendedRowCfg` клик раскрывает как раньше; highlight-стиль/класс/
   `aria-current` продолжают ставиться по клику; существующие highlight-спеки зелёные.

## Демо — `aur-demo/.../table-expanding-row`

Добавить секции: controlled (`[(expandedRow)]` с состоянием в контейнере) и multiple
(`multiple:true` + `[expandedRows]`). Существующий дефолтный пример оставить — он
демонстрирует неизменное row-click-поведение.

## Документация

- JSDoc — в контрактах выше.
- README: секция expanded-row — таблица режимов, `multiple`, пары инпутов/аутпутов,
  заметка про `[(expandedRow)]`.
- `changelog/19.9.0.md` (формат Keep-a-Changelog, скилл writing-changelog) — фича + оба
  поведенческих изменения в «Изменено»/«Удалено».
- Заметка в migration-доках про break #1 (`[highlight]` → `[expandedRow]`).

## Верификация

- `npm run build_lib` компилируется чисто.
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — новые + существующие
  тесты зелёные.

## Риск

Средний. Зона изменений — две строки detail-шаблона, `handleRowClick`, `ngOnChanges`, новые
инпуты/аутпуты и поле конфига; highlight/стили/a11y/hover/server не задеваются. Основной
риск — полнота матрицы режимов (3 × single/multiple × источник состояния), закрывается
спеком из 9 групп.
