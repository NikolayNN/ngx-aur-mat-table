# Несколько action-колонок (`actionCfg: ActionConfig[]` + якорное позиционирование)

**Дата:** 2026-06-24
**Статус:** Design (одобрен к реализации)
**Тип изменения:** A — аддитивная, обратносовместимая. `actionCfg` принимает и одиночный объект
(как сегодня), и массив (новое) через union-тип. Существующие потребители `actionCfg: { … }`
работают **без единой правки** и сохраняют имя колонки `tbl_actions`. Целевой релиз — minor; бамп
версии и changelog — на этапе finishing-branch (решено отложить, спека на номер не завязана).

---

## Проблема

Сейчас таблица поддерживает **ровно одну** колонку действий: `TableConfig.actionCfg?: ActionConfig<T>`
(`model/ColumnConfig.ts:54`). Одна колонка не позволяет штатно разнести разные группы действий —
например, первичные действия слева и управляющие справа. Из отзыва: «одна action-колонка не
позволяет штатно разместить разные группы действий слева и справа».

Текущая модель размещения — только `position: 'start' | 'end'` (`RowActionProvider.addActionColumn`,
`providers/RowActionProvider.ts:36-46`), и относительный порядок спец-колонок (timeline, drag,
selection, index, action) жёстко задан порядком вызовов в `prepareTableData()`
(`ngx-aur-mat-table.component.ts:590-624`). Потребитель не может декларативно сказать «поставь
колонку действий рядом с такой-то колонкой» — единственный обходной путь — полностью ручной
`[displayColumns]`.

### Требования (из отзыва)

1. Уникальный `key` каждой action-колонки.
2. Независимые `position` и `size`.
3. Независимый набор `actions`.
4. Возможность управлять порядком относительно selection / index / drag колонок.

---

## Решение (зафиксировано с пользователем)

| Вопрос | Решение |
|---|---|
| **Форма API** | Union: `actionCfg?: ActionConfig<T> \| ActionConfig<T>[]`. Внутри сразу нормализуется в массив. Обратносовместимо (не breaking) — выбрано вместо «только массив, breaking». |
| **Идентичность колонки** | Новое поле `key?: string` — **оно же** имя `matColumnDef` и публичная идентичность (для anchor и `[displayColumns]`). Опционально; по умолчанию `'tbl_actions'` (нынешнее имя) — поэтому legacy-конфиги без `key` работают как раньше. |
| **Модель порядка** | `position: 'start' \| 'end' \| { before: string } \| { after: string }` (default `'end'`). `before/after` — **якорь** на ЛЮБУЮ колонку: data-колонку (по `key`), другую action-колонку или спец-колонку через `AUR_COLUMN.*`. Переписываем **только размещение action-колонок**; модель selection/index/drag/timeline не трогаем. |
| **Разрешение порядка** | Две фазы. Фаза 1 (`start`/`end`) — как сегодня. Фаза 2 (anchor) — финальным проходом, итеративно (поддержка цепочек). Якорь не найден → деградация в `end` + `isDevMode()`-warn. `[displayColumns]` (потребитель вписал `key`) — высший приоритет (существующий `hasKey`-guard). |
| **Валидация `key`** | Дубликат `key` или коллизия с data-ключом / зарезервированным спец-именем → колонка **не добавляется** (побеждает первое определение / data-колонка), в dev пишется `console.warn`. В проде тихо. |
| **Ссылки на спец-колонки** | Публичная константа `AUR_COLUMN = { selection, index, drag, timeline }` (значения = `COLUMN_NAME` провайдеров) — чтобы не светить внутренние `tbl_*` строки в коде потребителя. |

Три уровня контроля порядка: `start/end` (просто) → `before/after` (точечно, декларативно) →
`[displayColumns]` (полностью вручную).

---

## Контракт

### Типы — `model/ColumnConfig.ts`

```ts
/** Позиция колонки действий. По умолчанию 'end'. */
export type ActionColumnPosition =
  | 'start'
  | 'end'
  | { before: string }   // вставить непосредственно ПЕРЕД колонкой с этим ключом
  | { after: string };   // ...или ПОСЛЕ

export interface ActionConfig<T> {
  /**
   * Уникальный ключ колонки действий. ОН ЖЕ имя matColumnDef и публичная идентичность
   * (используется в anchor before/after и в [displayColumns]).
   * Не задан → 'tbl_actions' (историческое имя; сохраняет обратную совместимость одиночной колонки).
   * Для нескольких колонок key обязателен и должен быть уникален.
   */
  key?: string;
  enable?: boolean;
  actions: Action<(value: T) => string>[];
  /** По умолчанию 'end'. */
  position?: ActionColumnPosition;
  size?: ColumnSize;
}

/**
 * Публичные ссылки на спец-колонки для anchor (before/after), чтобы не хардкодить внутренние tbl_*.
 * Значения ОБЯЗАНЫ совпадать с *Provider.COLUMN_NAME (есть тест синхронизации).
 */
export const AUR_COLUMN = {
  selection: 'tbl_selects',
  index:     'tbl_index',
  drag:      'tbl_drag_col',
  timeline:  'tbl_timeline',
} as const;
```

`TableConfig.actionCfg` (`:54`) меняет тип:

```ts
// было:  actionCfg?: ActionConfig<T>;
actionCfg?: ActionConfig<T> | ActionConfig<T>[];
```

`Action<T>`, `MenuItem<T>`, `IconView<T>`, `ColumnSize` — **без изменений**.

### Представление колонки — `providers/RowActionProvider.ts`

```ts
/** Разрешённое представление одной колонки действий (одна на каждый ActionConfig). */
export interface ActionColumnView<T> {
  /** Имя matColumnDef (= key или 'tbl_actions'). */
  columnName: string;
  size?: ColumnSize;
  position: ActionColumnPosition;        // нормализованная (default 'end')
  /** ключ — rowId; значение — разрешённые действия строки (как сегодня actionView). */
  actionView: Map<number, Action<string>[]>;
}
```

### Использование (потребитель)

```ts
import { AUR_COLUMN, TableConfig } from 'ngx-aur-mat-table';

tableConfig: TableConfig<Customer> = {
  columnsCfg: [ /* name, email, … */ ],
  selectionCfg: { multiple: true },

  // одиночный объект (как раньше) — тоже валиден, колонка получит имя 'tbl_actions':
  // actionCfg: { position: 'end', actions: [ … ] },

  actionCfg: [
    {
      key: 'primary-actions',
      position: 'start',                       // слева
      actions: [ /* edit, delete */ ],
    },
    {
      key: 'row-tools',
      position: { after: 'email' },            // сразу после data-колонки email
      size: { fit: true },
      actions: [ /* copy */ ],
    },
    {
      key: 'management-actions',
      position: { before: AUR_COLUMN.selection }, // слева от чекбокса
      actions: [ /* archive (menu) */ ],
    },
  ],
};
```

---

## Реализация

### 1. Нормализация конфигов — `utils/ngx-aur-table-config.util.ts`

Чистые (без сайд-эффектов) хелперы, переиспользуемые провайдером и фильтром displayColumns:

```ts
/** actionCfg (объект | массив | undefined) → массив включённых конфигов (enable !== false). */
static actionConfigs<T>(config: TableConfig<T>): ActionConfig<T>[] {
  const raw = config.actionCfg;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter(cfg => cfg && cfg.enable !== false);
}

/** Имя колонки для конфига: key или историческое 'tbl_actions'. */
static actionColumnName<T>(cfg: ActionConfig<T>): string {
  return cfg.key ?? RowActionProvider.COLUMN_NAME;   // 'tbl_actions'
}

/** Уникальные имена включённых action-колонок (для whitelist в removeWrongKeys). Дедуп через Set. */
static actionColumnNames<T>(config: TableConfig<T>): string[] {
  return [...new Set(this.actionConfigs(config).map(c => this.actionColumnName(c)))];
}
```

Эти функции **не** делают `console.warn` — валидация/предупреждения сосредоточены в одном месте
(провайдер, см. ниже), чтобы не дублировать warn при многократном вызове.

### 2. `RowActionProvider` — из одной колонки в N

Класс перестаёт быть «одна колонка / static `COLUMN_NAME`» и держит массив колонок:

```ts
export class RowActionProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = 'tbl_actions';   // дефолтное имя (keyless / legacy)
  public readonly isEnabled: boolean = true;

  /** По одному элементу на каждую валидную action-колонку. Пусто → колонок нет (как Dummy). */
  public columns: ActionColumnView<T>[] = [];

  /** Нормализованные и провалидированные конфиги (источник для columns). */
  private readonly configs: ActionConfig<T>[];

  constructor(tableConfig: TableConfig<T>) {
    super();
    this.configs = this.resolveConfigs(tableConfig);   // нормализация + валидация ключей (dev-warn)
    this.columns = this.configs.map(cfg => ({
      columnName: NgxAurTableConfigUtil.actionColumnName(cfg),
      size: cfg.size,
      position: cfg.position ?? 'end',
      actionView: new Map(),
    }));
  }

  /** Фаза 1: вставка колонок со СТРОКОВЫМ position ('start'/'end'). */
  public addActionColumns(columns: string[]): this { … }

  /** Фаза 2: вставка колонок с ЯКОРНЫМ position ({before}/{after}); итеративно. */
  public applyAnchors(columns: string[]): this { … }

  /** Строит actionView для КАЖДОЙ колонки (ActionViewFactory переиспользуется per-config). */
  public setView(rows: TableRow<T>[]): this { … }
}
```

**`resolveConfigs` (валидация ключей, dev-warn):**

- Берёт `NgxAurTableConfigUtil.actionConfigs(tableConfig)`.
- Множество зарезервированных имён: data-ключи (`columnsCfg[].key`) ∪ значения `AUR_COLUMN` ∪
  имена прочих спец-колонок.
- Для каждого конфига вычисляет `columnName`; если оно уже занято (дубль среди action-колонок) или
  коллизирует с data-ключом / зарезервированным спец-именем — конфиг **отбрасывается**, в
  `isDevMode()` → `console.warn('[aur-mat-table] action key "…" дублируется/конфликтует — колонка пропущена')`.
  Первое определение / data-колонка побеждают.

**`addActionColumns` (фаза 1)** — сохраняет нынешнее поведение одной колонки:

- `end`-колонки: `push` в порядке массива → `[…, A, B]` (A левее B).
- `start`-колонки: вставка группой в начало в порядке массива — `columns.splice(0, 0, ...startNames)`
  (или один `unshift(...startNames)`), чтобы порядок массива читался слева-направо.
- Колонки с **якорным** position на этой фазе пропускаются (обрабатываются в фазе 2).
- `hasKey`-guard: если `columnName` уже в `columns` (потребитель вписал в `[displayColumns]`) — пропуск.

**`applyAnchors` (фаза 2)** — вызывается **последним**, когда все остальные колонки уже на местах:

- Итеративный проход по anchor-колонкам: для каждой найти индекс якоря в `columns`, вставить
  `before`/`after`. Колонки, чей якорь ещё не появился (цепочка `after: другая-action`),
  откладываются на следующий проход.
- Проход без прогресса завершает цикл; оставшиеся (якорь не найден / выключен / опечатка) →
  `push` в конец (`end`) + `isDevMode()`-warn.
- `hasKey`-guard: уже присутствующее имя (вписано в `[displayColumns]`) не вставляется повторно.

**`setView`** — как сегодня, но по каждой колонке:
`col.actionView = ActionViewFactory.create(rows, configForCol)` для каждого `col`/`config`.
`ActionViewFactory` (`factories/ActionViewFactory.ts`) **не меняется** — переиспользуется per-config.

**`create` / `canEnabled`:** `canEnabled` теперь = «есть хотя бы одна включённая колонка» —
`NgxAurTableConfigUtil.actionConfigs(tableConfig).length > 0` (нынешний `isFeatureEnabled(actionCfg)`
не работает для массива: у массива нет `.enable`). При отсутствии включённых колонок `create`
возвращает `RowActionProviderDummy` (как сегодня).

`RowActionProviderDummy` остаётся для disabled/пусто: `columns = []`, `addActionColumns`/`applyAnchors`/
`setView` — no-op (override-методы переименовать вслед за базой). Его `super(EmptyValue.TABLE_CONFIG)`
безопасен: `actionCfg` там `{ enable:false, … }` → `actionConfigs()` отфильтрует → `columns = []`.

### 3. Порядок колонок — `ngx-aur-mat-table.component.ts` (`prepareTableData`, `:578-631`)

Минимальная перестройка: фаза 1 остаётся на нынешнем месте; добавляется финальный anchor-проход.

```ts
// фаза 1 — на нынешнем месте (между index и selection), поведение одной колонки идентично:
this.rowActionsProvider = RowActionProvider.create(this.tableConfig)
  .addActionColumns(this._displayColumns)   // было addActionColumn (start/end)
  .setView(this.tableDataSource.data);

// … selection, pagination, totals, dragDrop …

// timeline ПОСЛЕДНИМ — unshift гарантирует позицию 0
this.timelineProvider = TimelineProvider.create(this.tableConfig)
  .addTimelineColumn(this._displayColumns);

// ФАЗА 2 — anchor-проход в самом конце: все возможные якоря (data, спец, action-start/end) уже на местах
this.rowActionsProvider.applyAnchors(this._displayColumns);
```

> Важно: `applyAnchors` вызывается после `timeline`, но **до** построения
> `_displayExtraHeaderTopCell`/`_displayExtraHeaderBottomCell` (`:628-629`) и `remapExpandedToData()`
> (`:630`) — чтобы extra-header-суффиксы и detail-ремап охватили финальный порядок, включая
> anchor-колонки.

### 4. `removeWrongKeysFromDisplayColumns` (`:633-636`)

Whitelist расширяется именами action-колонок (теперь они произвольные, напр. `'primary-actions'`,
и иначе вырезались бы из кастомного `[displayColumns]`):

```ts
private removeWrongKeysFromDisplayColumns() {
  const whiteKeys = new Set([
    ...this.tableConfig.columnsCfg.map(c => c.key),
    ...NgxAurTableConfigUtil.actionColumnNames(this.tableConfig),   // ← новое
  ]);
  this._displayColumns = this._displayColumns.filter(a => whiteKeys.has(a) || a.startsWith('tbl_'));
}
```

(Keyless `'tbl_actions'` и так проходит по `startsWith('tbl_')`; новая строка нужна для произвольных `key`.)

### 5. Шаблон — `ngx-aur-mat-table.component.html` (блок `241-335`)

Один статический `<ng-container [matColumnDef]="rowActionsProvider.COLUMN_NAME">` → `*ngFor` по
колонкам. Внутренняя разметка (direct / menu / tooltip / footer) переезжает **без изменений**,
читая `col.*` вместо `rowActionsProvider.*`:

```html
<ng-container *ngFor="let col of rowActionsProvider.columns" [matColumnDef]="col.columnName">
  <th mat-header-cell *matHeaderCellDef
      [style.width]="col.size?.width" [style.min-width]="col.size?.minWidth"
      [style.max-width]="col.size?.maxWidth" [class.aur-col-fit]="col.size?.fit"
      [style.--aur-cell-padding-left]="col.size?.paddingLeft"
      [style.--aur-cell-padding-right]="col.size?.paddingRight"></th>

  <td mat-cell *matCellDef="let element" (click)="$event.stopPropagation()" style="cursor: default"
      …те же обёртки size…>
    <ng-container *ngFor="let action of col.actionView.get(element.id)">
      <!-- direct / menu / tooltip — БЕЗ изменений -->
    </ng-container>
  </td>

  <td mat-footer-cell *matFooterCellDef …те же обёртки size…>
    {{ totalRowProvider.totals.get(col.columnName) ?? '' }}
  </td>
</ng-container>
```

Динамический `[matColumnDef]` внутри `*ngFor` — штатный приём (так же рендерятся data-колонки:
`*ngFor="let columnConfig of tableConfig.columnsCfg" [matColumnDef]="columnConfig.key"`).
Внешний `*ngIf="isEnabled"` больше не нужен: пустой `columns` (disabled/нет конфигов) ничего не рендерит.

### 6. `EmptyValue` / экспорт

- `EmptyValue.ACTION_CONFIG` (`model/EmptyValue.ts:11-14`) — оставить как одиночный `{ enable:false, actions:[] }`;
  `actionConfigs()` отфильтрует его по `enable:false` → `columns = []`. Правок не требует.
- **Экспорт:** `ActionColumnPosition` и `AUR_COLUMN` живут в `model/ColumnConfig.ts`, который уже
  реэкспортируется (`public-api.ts:12`) — отдельная строка не нужна. `ActionColumnView` — в
  `RowActionProvider.ts` (уже реэкспортируется, `:13`). **`*.module.ts` не трогаем** — новых
  declarable-сущностей (директив/компонентов) нет.

---

## Edge cases

- **`actionCfg` undefined / `[]` / все `enable:false`** → `columns = []`, ничего не рендерится (как сейчас Dummy).
- **Одиночный объект без `key` (legacy)** → `columnName = 'tbl_actions'`, раскладка и поведение байт-в-байт прежние.
- **Несколько колонок без `key`** → все схлопываются в `'tbl_actions'` → дубль: остаётся первая, остальные отброшены + dev-warn.
- **Коллизия `key` с data-ключом или `tbl_*`-спец-именем** → колонка отброшена + dev-warn (data/спец побеждает).
- **Якорь не найден / выключен / опечатка** → колонка уходит в `end` + dev-warn. Без падений.
- **Цепочка якорей** (`B after A`, `A after email`) → итеративное разрешение фазы 2.
- **Якорь — выключенная спец-колонка** (напр. `before: AUR_COLUMN.selection`, но selection нет) → имени нет в `columns` → fallback `end` + warn.
- **`[displayColumns]` содержит action-`key`** → провайдер не двигает колонку (`hasKey`-guard); позиция полностью ручная (высший приоритет).
- **Несколько колонок одной стороны** → порядок массива = слева-направо (`start` группой в начало, `end` — push по порядку).
- **`size` независим на колонку** (требование #2); **`actions`/`menu` независимы** (требование #3); footer/totals — по `col.columnName`.
- **OnPush / динамика данных** — `columns` и `actionView` пересобираются в `prepareTableData` на смену `[tableData]`/`[displayColumns]` (как сегодня actionView); горячего пути нет.
- **align у action-колонки** — как сегодня отсутствует (вне scope).
- **drag&drop** — action-колонки не draggable (как сегодня).
- **SSR** — `isDevMode`, `console.warn`, in-memory Map, `*ngFor`/`*ngTemplateOutlet` безопасны; прямого DOM-доступа нет.

---

## Тесты

**Обратная совместимость (важно):** существующие спеки используют `actionCfg: { … }` (одиночный
объект) — при union они остаются валидными и **не меняются**, служа регресс-тестом back-compat:
`ngx-aur-mat-table-action-disabled.spec.ts`, `ngx-aur-mat-table-menu-action.spec.ts`,
`ngx-aur-mat-table-tooltip.spec.ts`, `ngx-aur-mat-table-tooltip-position.spec.ts`,
`factories/ActionViewFactory.spec.ts`.

**Новый** `ngx-aur-mat-table-multiple-action-columns.spec.ts` (host-компонент с массивом `actionCfg`):

1. **Legacy-объект** → одна колонка `tbl_actions`, рендер и позиция как раньше.
2. **Массив start+end** → две колонки на нужных сторонах; обе работают (клик эмитит rowAction).
3. **Порядок массива одной стороны** → две `end` (и две `start`) идут слева-направо в порядке массива.
4. **`{ after: dataKey }`** → колонка ровно после data-колонки.
5. **`{ before: AUR_COLUMN.selection }`** → колонка слева от чекбокса.
6. **Цепочка якорей** (`B after A`, `A after data`) → корректный итоговый порядок.
7. **Якорь не найден** → колонка в конце + `console.warn` (spy, dev).
8. **Дубль `key`** → одна колонка + warn; **коллизия с data-key** → колонка отброшена + warn (data остаётся).
9. **`[displayColumns]` с action-`key`** → позиция ручная, провайдер не двигает.
10. **Независимый `size`** на колонку (ширина/fit применяются раздельно).
11. **Независимые `actions`/`menu`** — у каждой колонки свой набор и своё меню.
12. **Totals/footer** — `totals.get(col.columnName)` на каждую колонку.
13. **`enable:false`** колонка не рендерится; смесь enabled/disabled даёт только включённые.
14. **Синхронизация `AUR_COLUMN`** ↔ `*Provider.COLUMN_NAME` (значения совпадают).

Затронуть при необходимости: `ngx-aur-mat-table-display-columns.spec.ts` /
`-display-columns-dom.spec.ts` (порядок с action-колонками). Полный `ng test` остаётся зелёным.

---

## Демо

Существующие 5 demo-компонентов с `actionCfg: { … }` **не трогаем** (back-compat — служат живой
проверкой). Новая вкладка «Несколько action-колонок» → компонент
`projects/aur-demo/src/app/table-with-multiple-actions/`:

- `primary-actions` (`position: 'start'`) — edit/delete;
- `row-tools` (`position: { after: 'email' }`, `size: { fit: true }`) — copy;
- `management-actions` (`position: { before: AUR_COLUMN.selection }`) — archive через `menu`.

Демонстрирует независимые position/size/actions и три способа размещения. Регистрируется в
app-модуле + mat-tab в `app.component.html`.

---

## Документация

- JSDoc — в контрактах выше (`ActionConfig.key`, `ActionColumnPosition`, `AUR_COLUMN`, `ActionColumnView`).
- README: секция «Несколько action-колонок» — union-форма, `key`, `position` (start/end/anchor),
  `AUR_COLUMN`, приоритет `[displayColumns]`.
- Changelog — при бампе версии (feat, RU, скилл `writing-changelog`); миграция не требуется
  (одиночная форма остаётся), но упомянуть массив + anchor как новую возможность.

---

## Scope

**В scope:** несколько колонок действий; `key` как публичная идентичность; независимые
`position` (start/end/`{before}`/`{after}`)/`size`/`actions`; `AUR_COLUMN`; валидация ключей (dev-warn);
расширение whitelist в `removeWrongKeysFromDisplayColumns`; шаблон `*ngFor`; тесты, демо, README.

**Вне scope (возможные follow-up):**
- Переупорядочивание **самих** selection/index/drag/timeline относительно друг друга — их модель не трогаем.
- Anchor-позиционирование для не-action спец-колонок (единый layout-resolver для всех колонок).
- `align` для action-колонок; шаблон футера; per-колоночные template-директивы для действий.

---

## Отклонённые альтернативы

- **Только массив, breaking major** (`actionCfg?: ActionConfig<T>[]`) — рассматривалось и
  первоначально выбиралось; отклонено в пользу union: union не требует миграции существующих
  потребителей (5 demo + внешний locator-front) и выпускается обычным additive-minor.
- **Числовой `order`-вес** на все спец-колонки — вводит глобальную модель порядка, требует
  присвоить и задокументировать веса всем существующим спец-колонкам, конфликтует с текущим
  `position`. Избыточно (YAGNI) для «несколько action-колонок».
- **Единый декларативный layout-resolver для ВСЕХ колонок** — максимально гибко, но крупный
  рефакторинг ядра с риском регрессий во всех спец-колонках; шире задачи. Оставлено как возможный
  follow-up.
- **Префиксованные внутренние имена** (`tbl_action_${key}`) вместо «key = имя колонки» — потребитель
  тогда знает в `actionCfg` одно имя, а в `[displayColumns]`/anchor — другое (производное).
  «`key` = публичная идентичность» проще: одно имя везде.
