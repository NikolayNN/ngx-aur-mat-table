# NgxAurMatTable

NgxAurMatTable - это компонент-обертка над mat-table в Angular, который может быть использован для построения таблиц на
основе конфигурации, переданной пользователем.

примеры https://nikolaynn.github.io/ngx-aur-mat-table/

## Установка

Для установки библиотеки, выполните следующую команду:

```
npm i ngx-aur-mat-table
```

## Использование

Необходимо импортировать его в модуль вашего приложения:
```agsl
import { NgModule } from '@angular/core';
import { ВашаБиблиотекаModule } from '@ваша-библиотека';

@NgModule({
  declarations: [AppComponent],
  imports: [NgxAurMatTableModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

После импорта модуля библиотеки, вы можете использовать его компоненты в вашем шаблоне:
```
<aur-mat-table
[tableData]="tableData"
[tableConfig]="tableConfig"
>
</aur-mat-table>
```

* tableData - данные для таблицы
* tableConfig - конфигурация таблицы

Реализация для простой таблицы
```agsl

export interface Customer {
  name: string;
  age: number;
}

@Component({
  selector: 'app-simple-table',
  templateUrl: './simple-table.component.html',
  styleUrls: ['./simple-table.component.scss']
})
export class SimpleTableComponent {

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      {
        name: 'customers name',
        key: 'name',
        valueConverter: v => v.name
      },
      {
        name: 'customers age',
        key: 'age',
        valueConverter: v => v.age
      }
    ]
  }
  
  tableData: Customer[] = [
    new Customer('Steave', 30),
    new Customer('Jack', 22)
  ];
}


```

больше примеров: в проекте aur-demo

## Кастомный шаблон ячейки (`ngxAurCellDef`)

Когда декларативного `valueView` (icon/image/text) мало, тело ячеек колонки можно отрисовать
произвольным `<ng-template>`. Положите его внутрь `<aur-mat-table>` и привяжите к колонке по её
`key` через директиву `ngxAurCellDef`:

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurCellDef="status" let-value let-row="row" let-i="index">
    <span class="chip" [class.on]="row.rowSrc.active">{{ value }} (#{{ i }})</span>
  </ng-template>
</aur-mat-table>
```

Контекст шаблона: `$implicit`/`value` — значение колонки (`valueConverter`), `row` — `TableRow`
(`row.rowSrc` — исходный объект, `row.id` — индекс), `rowSrc` — алиас `row.rowSrc`, `index` — индекс
строки. Шаблон заменяет только тело ячеек данных и имеет приоритет над `valueView`; `valueConverter`
остаётся обязательным, поэтому поиск, сортировка и строка «Итого» работают как обычно. «Итого» через
шаблон не настраивается (используйте `totalConverter`); заголовок настраивается отдельной директивой
`ngxAurHeaderCellDef` (см. ниже).

## Кастомный шаблон заголовка (`ngxAurHeaderCellDef`)

Когда заголовок колонки не описать через `name`/`headerView` (нужны селектор, фильтр-инпут, toggle,
своя вёрстка), `<th>` колонки можно отрисовать произвольным `<ng-template>`. Положите его внутрь
`<aur-mat-table>` и привяжите к колонке по её `key` через директиву `ngxAurHeaderCellDef`:

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">

  <!-- по умолчанию: своя разметка внутри mat-sort-header (стрелка и клик-сортировка сохраняются) -->
  <ng-template ngxAurHeaderCellDef="amount" let-column let-sort="sort">
    <b>{{ column.name }}</b> <small *ngIf="sort.active">{{ sort.direction }}</small>
  </ng-template>

  <!-- ownsCell: шаблон владеет всем <th> (без mat-sort-header); sort/filter — из контекста -->
  <ng-template ngxAurHeaderCellDef="status" ownsCell let-filter="filter">
    <input (input)="filter.apply(buildFilter($event))" placeholder="фильтр">
    <button *ngIf="filter.active" (click)="filter.remove()">✕</button>
  </ng-template>

</aur-mat-table>
```

Шаблон имеет приоритет над `name`/`headerView` и заменяет содержимое заголовка одной data-колонки.

**Сортировка.** По умолчанию шаблон рендерится **внутри** `mat-sort-header` — встроенные стрелка и
клик-сортировка по всей ячейке сохраняются (подходит для косметических заголовков). Для
интерактивного содержимого (input/checkbox/toggle) добавьте атрибут `ownsCell`: он убирает
`mat-sort-header`, отдаёт `<th>` шаблону целиком и снимает конфликт клика; сортировку при
необходимости пересоберите через хэндл `sort` из контекста.

**Контекст шаблона:**

| Поле | Значение |
|---|---|
| `$implicit` / `column` | `ColumnConfig` колонки (`let-column`) |
| `key` | ключ колонки (`ColumnConfig.key`) |
| `sort` | `{ sortable, active, direction: 'asc' \| 'desc' \| '', toggle() }` |
| `filter` | `{ apply(filter), remove(), active }` — обёртка над `applyFilter`/`removeFilter`, имя фильтра = `key` |

Заголовки спец-колонок (выбор/индекс/действия) и шаблон строки «Итого» — вне scope (используйте их
встроенные настройки и `totalConverter`).

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

## Detail-row expansion (`ngxAurExpandedRowDef`)

Разместите `<ng-template ngxAurExpandedRowDef>` внутри `<aur-mat-table>`, чтобы
таблица показывала detail-строку под каждой раскрытой строкой:

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurExpandedRowDef let-rowSrc>
    <div class="detail">{{ rowSrc | json }}</div>
  </ng-template>
</aur-mat-table>
```

Контекст шаблона: `$implicit`/`rowSrc` — исходный объект `T`; `row` — полная
обёртка `TableRow<T>` (`row.rowSrc`, `row.id`); `index` — индекс строки.
Для доступа к обёртке используйте именованную привязку `let-row="row"`.

### Управление раскрытием (`extendedRowCfg`)

Раскрытие detail-строки — самостоятельное состояние, не связанное с подсветкой (`highlight`).

| Поле | Значения | По умолчанию | Смысл |
|---|---|---|---|
| `mode` | `'row-click'` \| `'controlled'` \| `'manual'` | `'row-click'` | кто владеет состоянием раскрытия |
| `multiple` | `boolean` | `false` | разрешить несколько раскрытых строк |

Режимы:
- **row-click** — таблица сама раскрывает/сворачивает по клику.
- **controlled** — источник правды контейнер: `[(expandedRow)]` (или `[(expandedRows)]` при `multiple`). Клик шлёт `(expandedRowChange)`/`(expandedRowsChange)`.
- **manual** — состояние только из инпутов; клик не раскрывает.

Single (`multiple:false`) → `[expandedRow]`/`(expandedRowChange)` (`T | null`).
Multiple (`multiple:true`) → `[expandedRows]`/`(expandedRowsChange)` (`T[]`).

```html
<!-- single -->
<aur-mat-table [tableConfig]="cfg" [(expandedRow)]="openRow" ...>
  <ng-template ngxAurExpandedRowDef let-rowSrc>
    <div class="detail">{{ rowSrc | json }}</div>
  </ng-template>
</aur-mat-table>

<!-- multiple: задайте extendedRowCfg: { mode: 'controlled', multiple: true } в tableConfig -->
<aur-mat-table [tableConfig]="cfg" [(expandedRows)]="openRows" ...>
  <ng-template ngxAurExpandedRowDef let-rowSrc>
    <div class="detail">{{ rowSrc | json }}</div>
  </ng-template>
</aur-mat-table>
```

Идентичность раскрытой строки определяется `tableConfig.trackBy` (иначе ссылкой на объект), поэтому раскрытие переживает серверный reload при заданном `trackBy`.

> **Миграция с ≤19.9.x:** `[extendedRowTemplate]`, `[timelineMarkerTemplate]`, `[extraHeaderCellTopTemplate]`, `[extraHeaderCellBottomTemplate]` удалены. Используйте директивы `ngxAurExpandedRowDef`, `ngxAurRowMarkerDef`, `ngxAurExtraHeaderTopDef`, `ngxAurExtraHeaderBottomDef` внутри `<aur-mat-table>`. См. `docs/MIGRATION-19.10.0.md`.

> **Миграция с ≤19.8.x:** `[highlight]` больше не раскрывает detail-строку (только подсветка/скролл). Для программного раскрытия используйте `[expandedRow]`/`[expandedRows]`.

### Template directives and context types

Четыре директивы для передачи шаблонов через проекцию контента:

| Директива | Описание | Контекст |
|---|---|---|
| `ngxAurExpandedRowDef` | Detail-строка под раскрытой строкой | `AurRowContext<T>` |
| `ngxAurRowMarkerDef` | Маркер строки в timeline-режиме | `AurRowContext<T>` |
| `ngxAurExtraHeaderTopDef` | Дополнительная ячейка верхнего заголовка | `AurExtraHeaderContext` |
| `ngxAurExtraHeaderBottomDef` | Дополнительная ячейка нижнего заголовка | `AurExtraHeaderContext` |

```ts
// Контекст строковых директив (ngxAurExpandedRowDef, ngxAurRowMarkerDef)
interface AurRowContext<T> {
  $implicit: T;       // исходный объект (rowSrc) — позиционная привязка let-x
  row: TableRow<T>;   // полная обёртка — let-x="row"
  rowSrc: T;          // псевдоним $implicit — let-x="rowSrc"
  index: number;      // индекс строки — let-i="index"
}

// Контекст extra-header директив
interface AurExtraHeaderContext {
  key: string;        // ключ колонки — let-key="key"
  index: number;      // порядковый индекс — let-i="index"
}
```

## Server pagination via `pageSource` (recommended)

Provide a typed loader; the table performs the initial load and refetches on page/sort changes itself.

```ts
pageableCfg = { enable: true, size: 20, mode: 'server' };

// svc.page(...) returns Observable<Page<Customer>> (Spring Data shape) — assignable as-is
loadPage: AurPageSource<Customer> = req =>
  this.svc.page(req.pageIndex, req.pageSize);
```
```html
<aur-mat-table #table [tableConfig]="cfg" [pageSource]="loadPage"
               (loadingChange)="loading = $event"></aur-mat-table>
```

When an **external filter** changes, rebuild your filter state and call `table.reload()` (resets to page 0):

```ts
@ViewChild('table') table!: NgxAurMatTableComponent<Customer>;
onFilterChange() { this.rebuildFilters(); this.table.reload(); }
```

`AurPage<T>` requires `content` + `totalElements` (+ optional `number`), matching Spring Data `Page<T>`, so a backend `Page<T>` is returned with no mapping.

**Sorting:** a click on a sortable header issues a new `pageSource` request (`req.sort = { active, direction }`, page reset to 0). The page is rendered exactly in the order the server returned it — the table never re-sorts a server page locally, and `ColumnConfig.sort.customSort` is ignored in server mode. **Initial state:** `sortCfg: { active: 'name', direction: 'desc' }` in the table config lights the header arrow immediately and makes the first `pageSource` request carry this sort.

**Page data for the host:** `(pageLoaded)` emits `{ content, totalElements, pageIndex }` after each successfully applied page — handy for header counters and charts. `loadingChange` and `pageError` cover the rest of the load lifecycle.

**First/last buttons:** `paginationCfg.showFirstLastButtons: false` hides the built-in paginator's jump-to-first/last buttons (default shown). Bound straight to the config, so swapping the `tableConfig` reference at runtime (e.g. on a breakpoint) toggles them without rebuilding data.

**Row index across pages:** with `indexCfg` in server mode the index column shows the absolute row number (`pageIndex * pageSize + position`), so page 2 continues 21, 22, … rather than restarting at 1. Client-mode pagination is unaffected (the index already spans the full dataset).

> The legacy manual wiring (`[paginatorState]` + `(pageChange)` + `NgxAurTablePageEventUtils.createEmpty`) still works but is deprecated in favour of `pageSource`.

### Using an external paginator (`externalPaginator`)

Bind a host-owned `<mat-paginator>` so the table uses it instead of its built-in one. Works with both client and server data:

```html
<aur-mat-table [tableConfig]="cfg" [tableData]="data" [externalPaginator]="pg"></aur-mat-table>
<mat-paginator #pg [pageSizeOptions]="[5,10,20]"></mat-paginator>
```

| | data: client | data: server (`pageSource`) |
|---|---|---|
| **built-in paginator** | default | `mode: 'server'` + `pageSource` |
| **external paginator** | `externalPaginator` | `externalPaginator` + `pageSource` |

> **Note (external + server with an OnPush host):** the table sets the external paginator's `length`/`pageIndex` imperatively and marks itself for check. If your host component uses `ChangeDetectionStrategy.OnPush` and the external paginator is a sibling, you may need to trigger change detection in the host (e.g. inject `ChangeDetectorRef` and call `markForCheck()` after the page loads) for the paginator's range label to refresh. The built-in paginator and client-data cases are unaffected.

Публикация новой версии
run publish.bat

## Row config & styling

Style header, body, and total rows independently via a uniform trio, each with a `styleCfg`.
All `style` fields accept a `StyleBuilder.Row` (typed builder) **or** a raw CSS string.

```ts
tableConfig: TableConfig<ReportRow> = {
  columnsCfg: [ /* ... */ ],

  // header row — static style/class
  headerRowCfg: {
    styleCfg: { style: StyleBuilder.Row.builder().background('#eee'), class: 'my-header' },
  },

  // body rows — per-row style/class hooks + click highlight + configurable hover overlay
  bodyRowCfg: {
    clickCfg: {
      styleCfg: { style: StyleBuilder.Row.builder().background('blue').color('red') },
      cancelable: true,           // second click deselects
    },
    hoverCfg: {
      pointer: true,              // cursor: pointer on body rows
      styleCfg: { style: StyleBuilder.Row.builder().background('#f5f5f5') },
    },
    styleCfg: {
      // StyleBuilder.Row or raw CSS string; '' means no override
      style: row => row.rowSrc.bold ? StyleBuilder.Row.builder().fontWeight(StyleBuilder.FontWeight.BOLD) : '',
      // CSS class(es); space-separated allowed
      class: row => row.rowSrc.bold ? 'subtotal not-hover' : null,
    },
  },

  // total/footer row — static value or (totals, data) => value  (value-driven)
  totalRowCfg: {
    enable: true,
    styleCfg: {
      style: totals => StyleBuilder.Row.builder().color(totals.get('age') < 100 ? 'red' : 'blue'),
      class: totals => totals.get('age') < 100 ? 'few' : 'many',
    },
  },
};
```

- `bodyRowCfg.styleCfg.style` / `class` are per-row hooks called once per data refresh (OnPush-friendly).
- `bodyRowCfg.clickCfg.styleCfg.style` задаёт стиль подсветки кликнутой строки; `styleCfg.class` задаёт CSS-класс подсвеченной строки; `overrideWith` merges builder fields so base styles survive.
- `bodyRowCfg.clickCfg.enable: false` makes rows fully non-interactive — no `rowClick`, no internal highlight, no auto-expand of the detail row, and no `tabindex`/keyboard activation. The default (rows interactive) is unchanged.
- `bodyRowCfg.hoverCfg` drives a mouse-enter/leave overlay; the `#f2f2f2` hardcoded hover background is gone — configure it via `hoverCfg.styleCfg` or suppress hover entirely by omitting `hoverCfg`.
- `hoverCfg.pointer` / `hoverCfg.styleCfg.*` / `clickCfg.styleCfg.*` accept a static value **or** a `(row: TableRow<T>) => value` function — e.g. `pointer: row => !row.rowSrc.system` disables the pointer/hover for system rows while leaving others interactive.
- `totalRowCfg.styleCfg.style` / `class` can be a **static value** or a **function of `(totals: Map<string,any>, data: TableRow<T>[])`** — value-driven total styling.
- For per-row **text color** prefer a `class` over the `style` hook, since Material cells set their own `color` and can override a `color` inherited from the row.

**Tooltip position:** `icon.tooltipPosition` / `text.tooltipPosition` (and the same on action icons) set `matTooltipPosition` (`'left' | 'right' | 'above' | 'below' | 'before' | 'after'`, default `'below'`) — useful for narrow or edge columns.

**Default alignment:** `tableViewCfg.align` (`'left' | 'center' | 'right'`) sets the default for all data columns and the index column at once; a per-column `ColumnConfig.align` / `IndexConfig.align` overrides it. Without it columns stay left-aligned as before.

### Row type markers (CSS hooks)

Every rendered `<tr>` carries a stable, namespaced marker class, so the three row
types are explicitly distinguishable from your own (global / `::ng-deep`) CSS:

| Row type | Marker class |
|---|---|
| data row | `aur-data-row` |
| detail / expanded row (`ngxAurExpandedRowDef`) | `aur-expanded-row` |
| total / footer row | `aur-total-row` |

The library attaches no styling of its own to these classes — they are pure hooks.
The detail row also keeps its legacy `expanded-row` class for backward compatibility.

```css
/* neutralize the hover your app/theme applies to the detail row */
tr.aur-expanded-row:hover { background: none; }

/* give the detail "drawer" a background and drop its own bottom border */
tr.aur-expanded-row { background: #fafafa; }
tr.aur-expanded-row td.expanded-cell { border-bottom: none; }

/* emphasize the total row */
tr.aur-total-row { font-weight: 600; }
```

> A collapsed detail row has `height: 0`, so its `:hover` never triggers — the marker
> targets the expanded one. Merging a detail row visually with its parent (removing the
> separator *between* them) is the parent data row's cell `border-bottom`, and is out of
> scope here.

### Migration from pre-19.1.0

```ts
// before
clickCfg: { pointer: true, highlightClicked: { background: 'blue', color: 'red' }, cancelable: true },
rowStyleCfg: { style: r => r.rowSrc.bold ? { fontWeight: 'bold' } : {} },
totalRowCfg: { enable: true, totalRowView: { style: StyleBuilder.Row.builder().color('blue').build() } },

// after
bodyRowCfg: {
  clickCfg: { styleCfg: { style: StyleBuilder.Row.builder().background('blue').color('red') }, cancelable: true },
  hoverCfg: { pointer: true },
  styleCfg: { style: r => r.rowSrc.bold ? StyleBuilder.Row.builder().fontWeight(StyleBuilder.FontWeight.BOLD) : '' },
},
totalRowCfg: { enable: true, styleCfg: { style: StyleBuilder.Row.builder().color('blue') } },
```

> **CSS scope:** classes from `bodyRowCfg.styleCfg.class` are applied to the table's own `<tr>`, which lives inside the library component's encapsulated view. Define their styles in **global** styles, or pierce encapsulation with `::ng-deep`:
>
> ```scss
> :host ::ng-deep tr.not-hover:hover { background-color: inherit !important; cursor: default; }
> ```

**Disabled actions:** `actionCfg.actions[].disabled: row => boolean` keeps a row action visible but greyed out — for both direct actions and menu triggers. When `icon.tooltip` is set, the tooltip is rendered on a wrapper element so it still shows on the disabled button, which is handy for explaining why the action is unavailable.
