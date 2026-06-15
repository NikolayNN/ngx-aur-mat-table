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
- `bodyRowCfg.hoverCfg` drives a mouse-enter/leave overlay; the `#f2f2f2` hardcoded hover background is gone — configure it via `hoverCfg.styleCfg` or suppress hover entirely by omitting `hoverCfg`.
- `hoverCfg.pointer` / `hoverCfg.styleCfg.*` / `clickCfg.styleCfg.*` accept a static value **or** a `(row: TableRow<T>) => value` function — e.g. `pointer: row => !row.rowSrc.system` disables the pointer/hover for system rows while leaving others interactive.
- `totalRowCfg.styleCfg.style` / `class` can be a **static value** or a **function of `(totals: Map<string,any>, data: TableRow<T>[])`** — value-driven total styling.
- For per-row **text color** prefer a `class` over the `style` hook, since Material cells set their own `color` and can override a `color` inherited from the row.

**Tooltip position:** `icon.tooltipPosition` / `text.tooltipPosition` (and the same on action icons) set `matTooltipPosition` (`'left' | 'right' | 'above' | 'below' | 'before' | 'after'`, default `'below'`) — useful for narrow or edge columns.

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
