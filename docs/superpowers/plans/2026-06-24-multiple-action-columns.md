# Несколько action-колонок — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать таблице несколько независимых колонок действий через `actionCfg: ActionConfig | ActionConfig[]` с независимыми `key`/`position`/`size`/`actions` и якорным позиционированием (`before`/`after`).

**Architecture:** `actionCfg` нормализуется в массив; `RowActionProvider` из одной колонки превращается в мульти-колоночный (`columns: ActionColumnView[]`). Порядок собирается в две фазы: строковые `start`/`end` — как сегодня; объектные якоря (`{before}`/`{after}`) — финальным проходом после всех спец-колонок. Шаблон рендерит `*ngFor` по `columns`. Обратная совместимость полная: одиночный объект без `key` даёт прежнюю колонку `tbl_actions`.

**Tech Stack:** Angular 19.2, Angular Material 18.2, TypeScript 5.8, Karma+Jasmine. Библиотека — NgModule-based (`standalone: false`).

## Global Constraints

- **Обратная совместимость:** существующий `actionCfg: { … }` (одиночный объект) работает без правок и сохраняет имя колонки `tbl_actions`. Существующие спеки с одиночным объектом не меняются.
- **Дефолты:** `key` опционален → `'tbl_actions'`; `position` опционален → `'end'`.
- **`AUR_COLUMN`** значения ОБЯЗАНЫ совпадать с `*Provider.COLUMN_NAME`.
- **Валидация ключа:** только `isDevMode()`-`console.warn`; конфликтная/дублирующая колонка отбрасывается (побеждает первое определение / data-колонка). В проде тихо.
- **Anchor fallback:** якорь не найден → колонка в конец (`end`) + `isDevMode()`-warn. Без исключений.
- **`[displayColumns]`** — высший приоритет: если имя action-колонки уже в массиве, провайдер её не двигает (`hasKey`-guard).
- **Без бампа версии и changelog** — релиз отложен до finishing-branch.
- **Язык:** описания тестов, JSDoc, тексты `console.warn` — на русском (конвенция проекта).
- **Сборка:** `npm run build_lib` (= `ng build ngx-aur-mat-table`). **Тесты:** `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`.
- **Ветка:** `feat/multiple-action-columns` (уже создана; спека уже закоммичена).

---

## Файловая структура

| Файл | Ответственность | Действие |
|---|---|---|
| `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` | Типы: `ActionColumnPosition`, `ActionConfig.key`, union `actionCfg`; константы `AUR_COLUMN`, `DEFAULT_ACTION_COLUMN` | Modify |
| `projects/ngx-aur-mat-table/src/lib/model/aur-column.spec.ts` | Тест синхронизации `AUR_COLUMN` ↔ провайдеры | Create |
| `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.ts` | Чистая нормализация action-конфигов | Modify |
| `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.spec.ts` | Тесты нормализации | Create |
| `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts` | Мульти-колоночный провайдер: `columns[]`, `addActionColumns`, `applyAnchors`, `setView`, валидация | Modify |
| `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts` | Юнит-тесты провайдера (порядок/якоря/валидация) | Create |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` | `prepareTableData` (две фазы) + `removeWrongKeysFromDisplayColumns` whitelist | Modify |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` | Блок action-колонок → `*ngFor` по `columns` | Modify |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-multiple-action-columns.spec.ts` | Host-DOM тесты рендера/кликов/порядка | Create |
| `projects/aur-demo/src/app/table-with-multiple-actions/*` | Демо-компонент | Create |
| `projects/aur-demo/src/app/app.module.ts`, `app.component.html` | Регистрация демо | Modify |
| `projects/ngx-aur-mat-table/README.md` | Документация | Modify |

---

## Task 1: Типы, константы, `AUR_COLUMN`

Чисто аддитивно — сборка остаётся зелёной (union `actionCfg` откладывается в Task 2, чтобы не ломать старый провайдер).

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:316-321` (интерфейс `ActionConfig`)
- Create: `projects/ngx-aur-mat-table/src/lib/model/aur-column.spec.ts`

**Interfaces:**
- Produces: `ActionColumnPosition` (тип), `ActionConfig.key?: string`, `ActionConfig.position?: ActionColumnPosition`, `export const AUR_COLUMN`, `export const DEFAULT_ACTION_COLUMN = 'tbl_actions'`.

- [ ] **Step 1: Написать падающий тест синхронизации**

Create `projects/ngx-aur-mat-table/src/lib/model/aur-column.spec.ts`:

```ts
import { AUR_COLUMN, DEFAULT_ACTION_COLUMN } from './ColumnConfig';
import { SelectionProvider } from '../providers/SelectionProvider';
import { IndexProvider } from '../providers/IndexProvider';
import { TimelineProvider } from '../providers/TimelineProvider';
import { RowActionProvider } from '../providers/RowActionProvider';

describe('AUR_COLUMN', () => {
  it('значения совпадают с COLUMN_NAME спец-колонок', () => {
    expect(AUR_COLUMN.selection).toBe(SelectionProvider.COLUMN_NAME);
    expect(AUR_COLUMN.index).toBe(IndexProvider.COLUMN_NAME);
    expect(AUR_COLUMN.timeline).toBe(TimelineProvider.COLUMN_NAME);
    // DragDropProvider.COLUMN_NAME — instance-поле, сверяем с литералом
    expect(AUR_COLUMN.drag).toBe('tbl_drag_col');
  });

  it('DEFAULT_ACTION_COLUMN совпадает с RowActionProvider.COLUMN_NAME', () => {
    expect(DEFAULT_ACTION_COLUMN).toBe(RowActionProvider.COLUMN_NAME);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — компиляция падает на `AUR_COLUMN`/`DEFAULT_ACTION_COLUMN` (не экспортированы).

- [ ] **Step 3: Добавить типы и константы**

В `ColumnConfig.ts` заменить интерфейс `ActionConfig` (строки 316-321) и добавить рядом тип/константы:

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

/** Имя по умолчанию для колонки действий без явного key (историческое). */
export const DEFAULT_ACTION_COLUMN = 'tbl_actions';

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

(`actionCfg` в `TableConfig` пока НЕ трогаем — остаётся `ActionConfig<T>`.)

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS (новый спек зелёный, остальные не затронуты).

- [ ] **Step 5: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/model/aur-column.spec.ts
git commit -m "feat(actions): add ActionColumnPosition, ActionConfig.key, AUR_COLUMN constants"
```

---

## Task 2: Ядро мульти-колоночности (start/end)

Самая крупная задача: union-тип + утилиты + переписанный провайдер + компонент + шаблон собираются в один компилируемый блок. Якоря и валидация ключей — в Task 3/4.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:54` (union `actionCfg`)
- Modify: `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts` (полная переработка)
- Create: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:593-595, 633-636` (+ импорт утилиты)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:241-335`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-multiple-action-columns.spec.ts`

**Interfaces:**
- Consumes: `ActionConfig`, `ActionColumnPosition`, `DEFAULT_ACTION_COLUMN` (Task 1).
- Produces:
  - `NgxAurTableConfigUtil.actionConfigs(config): ActionConfig<T>[]`
  - `NgxAurTableConfigUtil.actionColumnName(cfg): string`
  - `NgxAurTableConfigUtil.actionColumnNames(config): string[]`
  - `interface ActionColumnView<T> { columnName: string; size?: ColumnSize; position: ActionColumnPosition; actionView: Map<number, Action<string>[]> }`
  - `RowActionProvider.columns: ActionColumnView<T>[]`
  - `RowActionProvider.addActionColumns(columns: string[]): RowActionProvider<T>`
  - `RowActionProvider.setView(rows): RowActionProvider<T>` (по каждой колонке)

- [ ] **Step 1: Расширить тип `actionCfg` до union**

В `ColumnConfig.ts:54`:

```ts
// было: actionCfg?: ActionConfig<T>,
actionCfg?: ActionConfig<T> | ActionConfig<T>[],
```

(Сборка временно «красная» — старый `RowActionProvider` ещё присваивает `this.config = tableConfig.actionCfg`. Чиним в этой же задаче ниже; одного этого шага не коммитим.)

- [ ] **Step 2: Написать падающие тесты утилит**

Create `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.spec.ts`:

```ts
import { NgxAurTableConfigUtil } from './ngx-aur-table-config.util';
import { TableConfig } from '../model/ColumnConfig';

function base(actionCfg: any): TableConfig<any> {
  return { columnsCfg: [{ name: 'N', key: 'name', valueConverter: (v: any) => v.name }], actionCfg };
}

describe('NgxAurTableConfigUtil — action helpers', () => {
  it('actionConfigs: undefined → []', () => {
    expect(NgxAurTableConfigUtil.actionConfigs(base(undefined))).toEqual([]);
  });

  it('actionConfigs: одиночный объект → [объект]', () => {
    const cfg = { actions: [] };
    expect(NgxAurTableConfigUtil.actionConfigs(base(cfg))).toEqual([cfg as any]);
  });

  it('actionConfigs: массив, отфильтровывает enable:false', () => {
    const a = { key: 'a', actions: [] };
    const b = { key: 'b', enable: false, actions: [] };
    expect(NgxAurTableConfigUtil.actionConfigs(base([a, b]))).toEqual([a as any]);
  });

  it('actionColumnName: key или дефолт tbl_actions', () => {
    expect(NgxAurTableConfigUtil.actionColumnName({ actions: [] })).toBe('tbl_actions');
    expect(NgxAurTableConfigUtil.actionColumnName({ key: 'x', actions: [] })).toBe('x');
  });

  it('actionColumnNames: уникальные имена включённых колонок', () => {
    expect(NgxAurTableConfigUtil.actionColumnNames(base([
      { key: 'a', actions: [] }, { key: 'b', actions: [] },
    ]))).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Реализовать утилиты нормализации**

Заменить содержимое `utils/ngx-aur-table-config.util.ts` (удалить мёртвые импорты провайдеров, добавить хелперы):

```ts
import { ActionConfig, ColumnConfig, DEFAULT_ACTION_COLUMN, TableConfig } from "../model/ColumnConfig";

export class NgxAurTableConfigUtil {

  public static keys(config: TableConfig<any>): string[] {
    return this.columnCfgs(config).map(c => c.key);
  }

  private static columnCfgs(config: TableConfig<any>): ColumnConfig<any>[] {
    return config.columnsCfg;
  }

  /**
   * @return Map, где ключ — это 'key', а значение — это 'name'
   */
  public static keyNameMap(config: TableConfig<any>): Map<string, string> {
    return new Map(this.columnCfgs(config).map(cfg => [cfg.key, cfg.name]));
  }

  /** actionCfg (объект | массив | undefined) → массив включённых конфигов (enable !== false). */
  public static actionConfigs<T>(config: TableConfig<T>): ActionConfig<T>[] {
    const raw = config.actionCfg;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.filter(cfg => !!cfg && cfg.enable !== false);
  }

  /** Имя колонки для конфига: key или историческое 'tbl_actions'. */
  public static actionColumnName(cfg: ActionConfig<any>): string {
    return cfg.key ?? DEFAULT_ACTION_COLUMN;
  }

  /** Уникальные имена включённых action-колонок (для whitelist в removeWrongKeys). */
  public static actionColumnNames(config: TableConfig<any>): string[] {
    return [...new Set(this.actionConfigs(config).map(c => this.actionColumnName(c)))];
  }
}
```

- [ ] **Step 4: Написать падающие юнит-тесты провайдера**

Create `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts`:

```ts
import { RowActionProvider } from './RowActionProvider';
import { TableConfig } from '../model/ColumnConfig';
import { TableRow } from '../model/TableRow';

interface Row { name: string; }

function cfgOf(actionCfg: any): TableConfig<Row> {
  return { columnsCfg: [{ name: 'N', key: 'name', valueConverter: r => r.name }], actionCfg };
}

describe('RowActionProvider — мульти-колоночный (start/end)', () => {
  it('create → Dummy, когда actionCfg нет', () => {
    const p = RowActionProvider.create(cfgOf(undefined));
    expect(p.isEnabled).toBeFalse();
    expect(p.columns.length).toBe(0);
  });

  it('одиночный объект → одна колонка с именем tbl_actions', () => {
    const p = RowActionProvider.create(cfgOf({ actions: [] }));
    expect(p.columns.map(c => c.columnName)).toEqual(['tbl_actions']);
  });

  it('addActionColumns: end в порядке массива (справа)', () => {
    const p = RowActionProvider.create(cfgOf([
      { key: 'a', position: 'end', actions: [] },
      { key: 'b', position: 'end', actions: [] },
    ]));
    const cols = ['name'];
    p.addActionColumns(cols);
    expect(cols).toEqual(['name', 'a', 'b']);
  });

  it('addActionColumns: start группой в порядке массива (слева)', () => {
    const p = RowActionProvider.create(cfgOf([
      { key: 'a', position: 'start', actions: [] },
      { key: 'b', position: 'start', actions: [] },
    ]));
    const cols = ['name'];
    p.addActionColumns(cols);
    expect(cols).toEqual(['a', 'b', 'name']);
  });

  it('addActionColumns: не дублирует уже присутствующий ключ ([displayColumns])', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'a', position: 'end', actions: [] }]));
    const cols = ['a', 'name'];
    p.addActionColumns(cols);
    expect(cols).toEqual(['a', 'name']);
  });

  it('setView: actionView по rowId на каждую колонку', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'a', actions: [
      { action: () => 'edit', icon: { name: () => 'edit' } },
    ] }]));
    const rows = [{ id: 0, rowSrc: { name: 'x' } } as unknown as TableRow<Row>];
    p.setView(rows);
    expect(p.columns[0].actionView.get(0)!.length).toBe(1);
    expect(p.columns[0].actionView.get(0)![0].action).toBe('edit');
  });
});
```

- [ ] **Step 5: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — компиляция (нет `columns`/`addActionColumns`; старый провайдер/компонент/шаблон рассинхронизированы с union-типом).

- [ ] **Step 6: Переписать `RowActionProvider` на мульти-колоночный**

Заменить содержимое `providers/RowActionProvider.ts`:

```ts
import { Action, ActionColumnPosition, ActionConfig, ColumnSize, DEFAULT_ACTION_COLUMN, TableConfig } from "../model/ColumnConfig";
import { TableRow } from "../model/TableRow";
import { ActionViewFactory } from "../factories/ActionViewFactory";
import { EmptyValue } from "../model/EmptyValue";
import { AbstractProvider } from "./AbstractProvider";
import { NgxAurTableConfigUtil } from "../utils/ngx-aur-table-config.util";

export interface ActionEvent<T> {
  action: string;
  value: T;
}

/** Разрешённое представление одной колонки действий (одна на каждый ActionConfig). */
export interface ActionColumnView<T> {
  /** Имя matColumnDef (= key или 'tbl_actions'). */
  columnName: string;
  size?: ColumnSize;
  position: ActionColumnPosition;
  /** ключ — rowId; значение — разрешённые действия строки. */
  actionView: Map<number, Action<string>[]>;
}

export class RowActionProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = DEFAULT_ACTION_COLUMN;
  public readonly isEnabled: boolean = true;

  /** По одному элементу на каждую валидную action-колонку. Пусто → колонок нет. */
  public columns: ActionColumnView<T>[] = [];

  /** Нормализованные конфиги, выровнены 1:1 с columns. */
  protected readonly configs: ActionConfig<T>[];

  constructor(tableConfig: TableConfig<T>) {
    super();
    this.configs = NgxAurTableConfigUtil.actionConfigs(tableConfig);
    this.columns = this.configs.map(cfg => ({
      columnName: NgxAurTableConfigUtil.actionColumnName(cfg),
      size: cfg.size,
      position: cfg.position ?? 'end',
      actionView: new Map<number, Action<string>[]>(),
    }));
  }

  /** Фаза 1: вставка колонок со строковым position ('start'/'end'). */
  public addActionColumns(columns: string[]): RowActionProvider<T> {
    const startNames: string[] = [];
    for (const col of this.columns) {
      if (this.hasKey(col.columnName, columns)) continue;   // вписан в [displayColumns]
      if (col.position === 'start') {
        startNames.push(col.columnName);
      } else if (col.position === 'end') {
        columns.push(col.columnName);
      }
      // объектные (anchor) позиции — фаза 2 (applyAnchors), см. Task 3
    }
    if (startNames.length) columns.unshift(...startNames);
    return this;
  }

  /** Строит actionView для КАЖДОЙ колонки (ActionViewFactory переиспользуется per-config). */
  public setView(rows: TableRow<T>[]): RowActionProvider<T> {
    this.columns.forEach((col, i) => {
      col.actionView = ActionViewFactory.create(rows, this.configs[i]);
    });
    return this;
  }

  private static canEnabled<T>(tableConfig: TableConfig<T>): boolean {
    return NgxAurTableConfigUtil.actionConfigs(tableConfig).length > 0;
  }

  public static create<T>(tableConfig: TableConfig<T>): RowActionProvider<T> {
    if (RowActionProvider.canEnabled(tableConfig)) {
      return new RowActionProvider<T>(tableConfig);
    }
    return new RowActionProviderDummy<T>();
  }
}

export class RowActionProviderDummy<T> extends RowActionProvider<T> {
  public override readonly isEnabled = false;

  constructor() {
    super(EmptyValue.TABLE_CONFIG);
  }

  public override addActionColumns(columns: string[]): RowActionProviderDummy<T> {
    return this;
  }

  public override setView(rows: TableRow<T>[]): RowActionProvider<T> {
    return this;
  }
}
```

- [ ] **Step 7: Обновить `prepareTableData` и `removeWrongKeysFromDisplayColumns`**

В `ngx-aur-mat-table.component.ts`:

(a) Добавить импорт рядом с прочими (около строки 30):

```ts
import { NgxAurTableConfigUtil } from './utils/ngx-aur-table-config.util';
```

(b) Заменить строки 593-595:

```ts
this.rowActionsProvider = RowActionProvider.create(this.tableConfig)
  .addActionColumns(this._displayColumns)
  .setView(this.tableDataSource.data);
```

(c) Заменить `removeWrongKeysFromDisplayColumns` (633-636):

```ts
private removeWrongKeysFromDisplayColumns() {
  const whiteKeys = new Set<string>([
    ...this.tableConfig.columnsCfg.map(cfg => cfg.key),
    ...NgxAurTableConfigUtil.actionColumnNames(this.tableConfig),
  ]);
  this._displayColumns = this._displayColumns.filter(actual => whiteKeys.has(actual) || actual.startsWith('tbl_'));
}
```

- [ ] **Step 8: Переписать блок action-колонок в шаблоне на `*ngFor`**

В `ngx-aur-mat-table.component.html` заменить весь блок 241-335 (`<!-- action column -->` … закрывающий `</ng-container>`) на:

```html
<!-- action columns (одна или несколько) -->
<ng-container *ngFor="let col of rowActionsProvider.columns" [matColumnDef]="col.columnName">
  <th mat-header-cell *matHeaderCellDef
      [style.width]="col.size?.width"
      [style.min-width]="col.size?.minWidth"
      [style.max-width]="col.size?.maxWidth"
      [class.aur-col-fit]="col.size?.fit"
      [style.--aur-cell-padding-left]="col.size?.paddingLeft"
      [style.--aur-cell-padding-right]="col.size?.paddingRight"></th>
  <td mat-cell *matCellDef="let element" (click)="$event.stopPropagation()" style="cursor: default"
      [style.width]="col.size?.width"
      [style.min-width]="col.size?.minWidth"
      [style.max-width]="col.size?.maxWidth"
      [class.aur-col-fit]="col.size?.fit"
      [style.--aur-cell-padding-left]="col.size?.paddingLeft"
      [style.--aur-cell-padding-right]="col.size?.paddingRight">
    <ng-container *ngFor="let action of col.actionView.get(element.id)">
      <!-- action with dropdown menu -->
      <ng-container *ngIf="action.menu; else directAction">
        <ng-container *ngIf="action.visible !== false">
          <mat-menu #actionMenu="matMenu">
            <ng-container *ngFor="let item of action.menu">
              <button mat-menu-item
                      *ngIf="item.visible !== false"
                      [disabled]="item.disabled === true"
                      (click)="emitMenuAction(item.action, element.rowSrc)">
                <mat-icon *ngIf="item.icon" [style.color]="item.icon.color">
                  {{ item.icon.name }}
                </mat-icon>
                <span>{{ item.text }}</span>
              </button>
            </ng-container>
          </mat-menu>
          <span *ngIf="action.icon.tooltip; else menuBtnPlain"
                [matTooltip]="action.icon.tooltip"
                [matTooltipClass]="action.icon.tooltipClass || ''"
                [matTooltipPosition]="action.icon.tooltipPosition || 'below'">
            <button mat-icon-button
                    [matMenuTriggerFor]="actionMenu"
                    [disabled]="action.disabled === true">
              <mat-icon [style.color]="action.icon.color">
                {{ action.icon.name }}
              </mat-icon>
            </button>
          </span>
          <ng-template #menuBtnPlain>
            <button mat-icon-button [matMenuTriggerFor]="actionMenu"
                    [disabled]="action.disabled === true">
              <mat-icon [style.color]="action.icon.color">
                {{ action.icon.name }}
              </mat-icon>
            </button>
          </ng-template>
        </ng-container>
      </ng-container>

      <!-- direct action (existing behavior) -->
      <ng-template #directAction>
        <ng-container *ngIf="action.visible !== false">
          <span *ngIf="action.icon.tooltip; else directBtnPlain"
                [matTooltip]="action.icon.tooltip"
                [matTooltipClass]="action.icon.tooltipClass || ''"
                [matTooltipPosition]="action.icon.tooltipPosition || 'below'">
            <button mat-icon-button
                    [disabled]="action.disabled === true"
                    (click)="emitRowAction(action.action, element.rowSrc, $event)">
              <mat-icon [style.color]="action.icon.color">
                {{ action.icon.name }}
              </mat-icon>
            </button>
          </span>
          <ng-template #directBtnPlain>
            <button mat-icon-button
                    [disabled]="action.disabled === true"
                    (click)="emitRowAction(action.action, element.rowSrc, $event)">
              <mat-icon [style.color]="action.icon.color">
                {{ action.icon.name }}
              </mat-icon>
            </button>
          </ng-template>
        </ng-container>
      </ng-template>
    </ng-container>
  </td>

  <td mat-footer-cell *matFooterCellDef
      [style.width]="col.size?.width"
      [style.min-width]="col.size?.minWidth"
      [style.max-width]="col.size?.maxWidth"
      [class.aur-col-fit]="col.size?.fit"
      [style.--aur-cell-padding-left]="col.size?.paddingLeft"
      [style.--aur-cell-padding-right]="col.size?.paddingRight">
    {{ totalRowProvider.totals.get(col.columnName) ?? '' }}
  </td>
</ng-container>
```

- [ ] **Step 9: Запустить юнит-тесты провайдера + утилит — зелёные**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — `RowActionProvider.spec`, `ngx-aur-table-config.util.spec` зелёные; существующие action-спеки (одиночный объект) тоже зелёные (back-compat).

- [ ] **Step 10: Проверить сборку библиотеки**

Run: `npm run build_lib`
Expected: компиляция без ошибок (AOT-шаблон валиден).

- [ ] **Step 11: Написать host-DOM спек (рендер/клик/порядок/totals/size/disabled/[displayColumns])**

Create `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-multiple-action-columns.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Кнопки действий первой строки тела. */
function row0Buttons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  const tr = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;
  return Array.from(tr.querySelectorAll('button')) as HTMLButtonElement[];
}

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                            (rowAction)="events.push($event)"></aur-mat-table>`,
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  events: any[] = [];
  cfg: TableConfig<Row> = { columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }] };
  data: Row[] = [{ name: 'a' }];
}

describe('NgxAurMatTable — несколько action-колонок', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('back-compat: одиночный объект → одна колонка, клик эмитит', () => {
    host.cfg = { ...host.cfg, actionCfg: { actions: [
      { action: () => 'edit', icon: { name: () => 'edit' } },
    ] } } as any;
    fixture.detectChanges();
    const btns = row0Buttons(fixture);
    expect(btns.length).toBe(1);
    btns[0].click();
    expect(host.events).toEqual([{ action: 'edit', value: { name: 'a' } }]);
  });

  it('массив start+end → две колонки; обе кликаются', () => {
    host.cfg = { ...host.cfg, actionCfg: [
      { key: 'p', position: 'start', actions: [{ action: () => 'edit', icon: { name: () => 'edit' } }] },
      { key: 'm', position: 'end', actions: [{ action: () => 'del', icon: { name: () => 'delete' } }] },
    ] } as any;
    fixture.detectChanges();
    const btns = row0Buttons(fixture);
    expect(btns.length).toBe(2);
    expect(host.table._displayColumns).toEqual(['p', 'name', 'm']);
    btns.forEach(b => b.click());
    expect(host.events.map(e => e.action).sort()).toEqual(['del', 'edit']);
  });

  it('disabled-колонка (enable:false) не рендерится', () => {
    host.cfg = { ...host.cfg, actionCfg: [
      { key: 'p', position: 'end', actions: [{ action: () => 'edit', icon: { name: () => 'edit' } }] },
      { key: 'm', enable: false, position: 'end', actions: [{ action: () => 'del', icon: { name: () => 'delete' } }] },
    ] } as any;
    fixture.detectChanges();
    expect(host.table._displayColumns).toEqual(['name', 'p']);
    expect(row0Buttons(fixture).length).toBe(1);
  });

  it('независимый size: ширина применяется на нужную колонку', () => {
    host.cfg = { ...host.cfg, actionCfg: [
      { key: 'p', position: 'end', size: { width: '123px' }, actions: [{ action: () => 'e', icon: { name: () => 'edit' } }] },
    ] } as any;
    fixture.detectChanges();
    const th = fixture.nativeElement.querySelector('th.mat-column-p') as HTMLElement;
    expect(th.style.width).toBe('123px');
  });

  // Unit-стиль (как display-columns.spec): displayColumns задаётся ДО первого CD,
  // поэтому работаем с компонентом напрямую, а не через @ViewChild (он ещё не разрешён).
  it('[displayColumns] с action-ключом → позиция ручная (провайдер не двигает)', () => {
    const c = new NgxAurMatTableComponent<Row>({} as any, { markForCheck: () => {} } as any);
    c.tableConfig = {
      columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
      actionCfg: [{ key: 'p', position: 'end', actions: [{ action: () => 'e', icon: { name: () => 'edit' } }] }],
    } as any;
    c.tableData = [{ name: 'a' }];
    c.displayColumns = ['p', 'name'];
    c.refreshTable();
    expect(c._displayColumns).toEqual(['p', 'name']);
  });
});
```

- [ ] **Step 12: Запустить — зелёные**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS (новый host-DOM спек + все прежние).

- [ ] **Step 13: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.ts \
        projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.spec.ts \
        projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-multiple-action-columns.spec.ts
git commit -m "feat(actions): multi-column action support (actionCfg array, start/end)"
```

---

## Task 3: Якорное позиционирование (`before`/`after`)

Аддитивно к Task 2: новый метод `applyAnchors` + один вызов в компоненте.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts` (+ метод `applyAnchors`, импорт `isDevMode`)
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts` (+ тесты якорей)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:624` (вызов `applyAnchors`)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-multiple-action-columns.spec.ts` (+ DOM-тест порядка)

**Interfaces:**
- Consumes: `RowActionProvider.columns` (Task 2).
- Produces: `RowActionProvider.applyAnchors(columns: string[]): RowActionProvider<T>`.

- [ ] **Step 1: Написать падающие тесты якорей (провайдер)**

Добавить в `providers/RowActionProvider.spec.ts` новый describe:

```ts
describe('RowActionProvider — якоря (before/after)', () => {
  it('after вставляет после якоря (data-колонка)', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 't', position: { after: 'name' }, actions: [] }]));
    const cols = ['name', 'age'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 't', 'age']);
  });

  it('before вставляет перед якорём (спец-колонка)', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'm', position: { before: 'tbl_selects' }, actions: [] }]));
    const cols = ['name', 'tbl_selects'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 'm', 'tbl_selects']);
  });

  it('цепочка: B after A, A after name', () => {
    const p = RowActionProvider.create(cfgOf([
      { key: 'A', position: { after: 'name' }, actions: [] },
      { key: 'B', position: { after: 'A' }, actions: [] },
    ]));
    const cols = ['name'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 'A', 'B']);
  });

  it('якорь не найден → в конец + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([{ key: 'x', position: { after: 'missing' }, actions: [] }]));
    const cols = ['name'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['name', 'x']);
    expect(warn).toHaveBeenCalled();
  });

  it('не дублирует уже присутствующий ключ ([displayColumns])', () => {
    const p = RowActionProvider.create(cfgOf([{ key: 'x', position: { after: 'name' }, actions: [] }]));
    const cols = ['x', 'name'];
    p.applyAnchors(cols);
    expect(cols).toEqual(['x', 'name']);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `applyAnchors` не существует (ошибка компиляции).

- [ ] **Step 3: Реализовать `applyAnchors`**

В `providers/RowActionProvider.ts` добавить импорт `isDevMode`:

```ts
import { isDevMode } from "@angular/core";
```

и метод в класс `RowActionProvider` (после `addActionColumns`):

```ts
/** Фаза 2: вставка колонок с ЯКОРНЫМ position ({before}/{after}); итеративно для цепочек. */
public applyAnchors(columns: string[]): RowActionProvider<T> {
  const pending = this.columns.filter(c =>
    typeof c.position === 'object' && !this.hasKey(c.columnName, columns));

  let progress = true;
  while (pending.length && progress) {
    progress = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const col = pending[i];
      const pos = col.position as { before?: string; after?: string };
      const anchor = pos.before ?? pos.after!;
      const idx = columns.indexOf(anchor);
      if (idx === -1) continue;                       // якорь ещё не на месте — позже
      const at = pos.before !== undefined ? idx : idx + 1;
      columns.splice(at, 0, col.columnName);
      pending.splice(i, 1);
      progress = true;
    }
  }

  // неразрешённые (якорь не найден/выключен) — в конец + dev-warn
  for (const col of pending) {
    columns.push(col.columnName);
    if (isDevMode()) {
      const pos = col.position as { before?: string; after?: string };
      console.warn(`[aur-mat-table] action-колонка "${col.columnName}": якорь "${pos.before ?? pos.after}" не найден — колонка добавлена в конец.`);
    }
  }
  return this;
}
```

Добавить override-no-op в `RowActionProviderDummy`:

```ts
public override applyAnchors(columns: string[]): RowActionProviderDummy<T> {
  return this;
}
```

- [ ] **Step 4: Вызвать `applyAnchors` в компоненте**

В `ngx-aur-mat-table.component.ts`, сразу после блока timeline (строка 624, перед `this.emitFilteredValues();`):

```ts
// Timeline ПОСЛЕДНИМ — unshift гарантирует позицию 0 после всех остальных провайдеров
this.timelineProvider = TimelineProvider.create(this.tableConfig)
  .addTimelineColumn(this._displayColumns);

// Фаза 2: anchor before/after — все возможные якоря (data, спец, action-start/end) уже на местах.
// До построения extra-header/detail-ремапа (ниже), чтобы они охватили финальный порядок.
this.rowActionsProvider.applyAnchors(this._displayColumns);
```

- [ ] **Step 5: Запустить юнит-тесты — зелёные**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS (тесты якорей зелёные).

- [ ] **Step 6: Добавить DOM-тест сквозного порядка с якорем**

Добавить в `ngx-aur-mat-table-multiple-action-columns.spec.ts` (внутрь основного describe):

```ts
it('якорь {after:name} ставит колонку сразу после data-колонки (сквозь refreshTable)', () => {
  host.cfg = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },
      { key: 'age', name: 'Age', valueConverter: (v: any) => v.age },
    ],
    actionCfg: [
      { key: 't', position: { after: 'name' }, actions: [{ action: () => 'e', icon: { name: () => 'edit' } }] },
    ],
  } as any;
  fixture.detectChanges();
  expect(host.table._displayColumns).toEqual(['name', 't', 'age']);
});
```

- [ ] **Step 7: Запустить — зелёные**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 8: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-multiple-action-columns.spec.ts
git commit -m "feat(actions): anchor positioning (before/after) for action columns"
```

---

## Task 4: Валидация ключей (dev-warn)

Аддитивно: вынести построение `configs` в `resolveConfigs` с дедупликацией и проверкой коллизий.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts` (конструктор → `resolveConfigs`, импорт `AUR_COLUMN`)
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts` (+ тесты валидации)

**Interfaces:**
- Consumes: `NgxAurTableConfigUtil.actionConfigs/actionColumnName`, `AUR_COLUMN`.
- Produces: внутреннее `resolveConfigs` (поведение: отбрасывает дубли/коллизии, dev-warn).

- [ ] **Step 1: Написать падающие тесты валидации**

Добавить в `providers/RowActionProvider.spec.ts` новый describe:

```ts
describe('RowActionProvider — валидация ключей (dev-warn)', () => {
  it('дубль key → одна колонка + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([
      { key: 'a', actions: [] }, { key: 'a', actions: [] },
    ]));
    expect(p.columns.map(c => c.columnName)).toEqual(['a']);
    expect(warn).toHaveBeenCalled();
  });

  it('коллизия с data-ключом → колонка отброшена + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([{ key: 'name', actions: [] }]));
    expect(p.columns.length).toBe(0);
    expect(warn).toHaveBeenCalled();
  });

  it('коллизия с зарезервированным спец-именем (tbl_selects) → отброшена + warn', () => {
    const warn = spyOn(console, 'warn');
    const p = RowActionProvider.create(cfgOf([{ key: 'tbl_selects', actions: [] }]));
    expect(p.columns.length).toBe(0);
    expect(warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — сейчас дубль/коллизия не отбрасываются (две колонки `a`, либо колонка `name`).

- [ ] **Step 3: Реализовать `resolveConfigs`**

В `providers/RowActionProvider.ts` добавить `AUR_COLUMN` в импорт из `ColumnConfig`:

```ts
import { Action, ActionColumnPosition, ActionConfig, AUR_COLUMN, ColumnSize, DEFAULT_ACTION_COLUMN, TableConfig } from "../model/ColumnConfig";
```

Заменить тело конструктора и добавить приватный метод:

```ts
constructor(tableConfig: TableConfig<T>) {
  super();
  this.configs = this.resolveConfigs(tableConfig);
  this.columns = this.configs.map(cfg => ({
    columnName: NgxAurTableConfigUtil.actionColumnName(cfg),
    size: cfg.size,
    position: cfg.position ?? 'end',
    actionView: new Map<number, Action<string>[]>(),
  }));
}

/** Нормализация + отбрасывание дублей/коллизий ключей (dev-warn). Возвращает выровненный с columns список. */
private resolveConfigs(tableConfig: TableConfig<T>): ActionConfig<T>[] {
  const reserved = new Set<string>([
    ...tableConfig.columnsCfg.map(c => c.key),
    AUR_COLUMN.selection, AUR_COLUMN.index, AUR_COLUMN.drag, AUR_COLUMN.timeline,
  ]);
  const taken = new Set<string>();
  const kept: ActionConfig<T>[] = [];
  for (const cfg of NgxAurTableConfigUtil.actionConfigs(tableConfig)) {
    const name = NgxAurTableConfigUtil.actionColumnName(cfg);
    if (taken.has(name) || reserved.has(name)) {
      if (isDevMode()) {
        console.warn(`[aur-mat-table] action key "${name}" дублируется или конфликтует с другой колонкой — колонка пропущена.`);
      }
      continue;
    }
    taken.add(name);
    kept.push(cfg);
  }
  return kept;
}
```

(`isDevMode` уже импортирован в Task 3.)

- [ ] **Step 4: Запустить — зелёные**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS (тесты валидации + все прежние).

- [ ] **Step 5: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.spec.ts
git commit -m "feat(actions): validate action keys (drop duplicates/collisions, dev-warn)"
```

---

## Task 5: Демо

Новая вкладка с массивом `actionCfg`: start + anchor-after + before-selection (меню). Существующие демо не трогаем (back-compat).

**Files:**
- Create: `projects/aur-demo/src/app/table-with-multiple-actions/table-with-multiple-actions.component.ts`
- Create: `projects/aur-demo/src/app/table-with-multiple-actions/table-with-multiple-actions.component.html`
- Modify: `projects/aur-demo/src/app/app.module.ts` (импорт + declarations)
- Modify: `projects/aur-demo/src/app/app.component.html` (mat-tab)

**Interfaces:**
- Consumes: публичный API (`TableConfig`, `ActionEvent`, `AUR_COLUMN`).

- [ ] **Step 1: Создать компонент демо (TS)**

Create `projects/aur-demo/src/app/table-with-multiple-actions/table-with-multiple-actions.component.ts`:

```ts
import { Component } from '@angular/core';
import { ActionEvent, AUR_COLUMN, TableConfig } from 'ngx-aur-mat-table';
import { Customer } from '../shared/model/customer';
import { CustomerGenerator } from '../shared/generator/CustomerGenerator';

@Component({
  selector: 'app-table-with-multiple-actions',
  templateUrl: './table-with-multiple-actions.component.html',
  standalone: false,
})
export class TableWithMultipleActionsComponent {

  tableConfig: TableConfig<Customer> = {
    selectionCfg: { multiple: true },
    columnsCfg: [
      { name: 'Имя', key: 'name', valueConverter: v => v.name },
      { name: 'Возраст', key: 'age', valueConverter: v => v.age },
    ],
    actionCfg: [
      {
        key: 'primary-actions',
        position: 'start',
        actions: [
          { action: () => 'edit', icon: { name: () => 'edit', tooltip: () => 'редактировать', color: () => 'blue' } },
        ],
      },
      {
        key: 'row-tools',
        position: { after: 'age' },
        size: { fit: true },
        actions: [
          { action: () => 'copy', icon: { name: () => 'content_copy', tooltip: () => 'копировать' } },
        ],
      },
      {
        key: 'management-actions',
        position: { before: AUR_COLUMN.selection },
        actions: [
          {
            action: () => 'more',
            icon: { name: () => 'more_vert' },
            menu: [
              { action: () => 'archive', text: () => 'В архив', icon: { name: () => 'archive' } },
              { action: () => 'delete', text: () => 'Удалить', icon: { name: () => 'delete' } },
            ],
          },
        ],
      },
    ],
  };

  tableData: Customer[] = CustomerGenerator.generate(8);

  onRowAction($event: ActionEvent<Customer>) {
    alert($event.action + ': ' + $event.value.name);
  }
}
```

- [ ] **Step 2: Создать шаблон демо (HTML)**

Create `projects/aur-demo/src/app/table-with-multiple-actions/table-with-multiple-actions.component.html`:

```html
<h3>Несколько action-колонок: start + anchor(after age) + before-selection (меню)</h3>
<aur-mat-table [tableConfig]="tableConfig"
               [tableData]="tableData"
               (rowAction)="onRowAction($event)"></aur-mat-table>
```

- [ ] **Step 3: Зарегистрировать в app.module**

В `projects/aur-demo/src/app/app.module.ts` добавить импорт после строки 78 (после `TableWithHeaderCellTemplateComponent`):

```ts
import {
  TableWithMultipleActionsComponent
} from "./table-with-multiple-actions/table-with-multiple-actions.component";
```

и добавить в массив `declarations` после `TableWithHeaderCellTemplateComponent` (строка 121 — добавить запятую после него):

```ts
    TableWithHeaderCellTemplateComponent,
    TableWithMultipleActionsComponent
```

- [ ] **Step 4: Добавить вкладку в app.component.html**

В `projects/aur-demo/src/app/app.component.html` перед закрывающим `</mat-tab-group>` (строка 212) добавить:

```html
  <mat-tab label="Несколько действий">
    <ng-template matTabContent>
      <app-table-with-multiple-actions></app-table-with-multiple-actions>
    </ng-template>
  </mat-tab>
```

- [ ] **Step 5: Собрать демо**

Run: `npm run build_lib && ng build aur-demo`
Expected: компиляция демо успешна (предсуществующий warning бюджета бандла, если есть, не относится к задаче).

- [ ] **Step 6: Коммит**

```bash
git add projects/aur-demo/src/app/table-with-multiple-actions/ \
        projects/aur-demo/src/app/app.module.ts \
        projects/aur-demo/src/app/app.component.html
git commit -m "docs(demo): multiple action columns demo tab"
```

---

## Task 6: README

**Files:**
- Modify: `projects/ngx-aur-mat-table/README.md`

- [ ] **Step 1: Добавить секцию в README**

Дописать в `projects/ngx-aur-mat-table/README.md` секцию (после существующей секции про действия, либо в конец, сохраняя стиль файла):

```markdown
## Несколько action-колонок

`actionCfg` принимает один объект (как раньше) или массив объектов — по одной колонке действий
на элемент. Каждая колонка независима.

| Поле | Назначение |
|---|---|
| `key` | Уникальный ключ = имя колонки (для `[displayColumns]` и anchor). Без `key` → `tbl_actions`. |
| `position` | `'start'` \| `'end'` (по умолчанию) \| `{ before: ключ }` \| `{ after: ключ }`. |
| `size` | Независимый размер колонки. |
| `actions` | Независимый набор действий/меню. |

Anchor `before`/`after` ссылается на любой ключ: data-колонку, другую action-колонку или
спец-колонку через `AUR_COLUMN` (`selection`/`index`/`drag`/`timeline`):

```ts
import { AUR_COLUMN } from 'ngx-aur-mat-table';

actionCfg: [
  { key: 'primary', position: 'start', actions: [ /* … */ ] },
  { key: 'tools', position: { after: 'email' }, actions: [ /* … */ ] },
  { key: 'manage', position: { before: AUR_COLUMN.selection }, actions: [ /* … */ ] },
]
```

Якорь не найден → колонка уходит в конец (в dev — предупреждение в консоль). Дубликат/конфликт
`key` → колонка пропускается (dev-warn). Полный ручной контроль порядка — через `[displayColumns]`
(имена action-колонок = их `key`), он имеет наивысший приоритет.
```

- [ ] **Step 2: Коммит**

```bash
git add projects/ngx-aur-mat-table/README.md
git commit -m "docs(readme): document multiple action columns"
```

---

## Финальная проверка

- [ ] **Полный прогон тестов:** `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — всё зелёное.
- [ ] **Сборка библиотеки:** `npm run build_lib` — без ошибок.
- [ ] **Сборка демо:** `ng build aur-demo` — без новых ошибок.
- [ ] Релиз (версия + changelog) — НЕ в этом плане: на этапе finishing-branch.

---

## Self-Review (выполнено при написании плана)

**Покрытие спеки:**
- Union `actionCfg` → Task 2 Step 1. ✓
- `key` (default `tbl_actions`), `ActionColumnPosition`, `AUR_COLUMN` → Task 1. ✓
- Нормализация (`actionConfigs`/`actionColumnName`/`actionColumnNames`) → Task 2 Step 3. ✓
- Мульти-колоночный провайдер `columns[]`/`addActionColumns`/`setView`/`create`/Dummy → Task 2 Step 6. ✓
- Фаза-1 порядок (start группой, end push, `hasKey`-guard) → Task 2 Step 6 + тесты Step 4. ✓
- Фаза-2 anchor (`applyAnchors`, цепочки, fallback+warn) → Task 3. ✓
- `[displayColumns]` приоритет → Task 2 Step 11 + Task 3 Step 1. ✓
- Валидация ключей (дубль/коллизия, dev-warn) → Task 4. ✓
- `removeWrongKeysFromDisplayColumns` whitelist → Task 2 Step 7. ✓
- Шаблон `*ngFor` (header/cell/footer, totals per column, size per column) → Task 2 Step 8 + тесты Step 11. ✓
- Порядок вызова `applyAnchors` до extra-header → Task 3 Step 4. ✓
- Демо → Task 5. README → Task 6. ✓
- Back-compat (одиночный объект, прежние спеки не трогаются) → Task 2 Steps 9/11. ✓

**Сканирование плейсхолдеров:** код приведён полностью в каждом шаге; «похоже на Task N» не используется. ✓

**Консистентность имён/типов:** `addActionColumns` (не `addActionColumn`), `applyAnchors`, `setView`, `columns`, `ActionColumnView`, `actionConfigs`/`actionColumnName`/`actionColumnNames`, `DEFAULT_ACTION_COLUMN`, `AUR_COLUMN` — согласованы между задачами и со спекой. `configs` выровнен 1:1 с `columns` (Task 2 map → Task 4 `resolveConfigs` сохраняет выравнивание). ✓
