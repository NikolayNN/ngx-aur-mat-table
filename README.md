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

## Per-row styling (`rowStyleCfg`)

Decorate body rows (`<tr mat-row>`) as a function of their data — e.g. bold subtotal rows.

```ts
tableConfig: TableConfig<ReportRow> = {
  columnsCfg: [ /* ... */ ],
  clickCfg: { pointer: true },
  rowStyleCfg: {
    // inline + typed; bold needs no stylesheet (DecorStyles.fontWeight)
    style: row => row.rowSrc.bold ? { fontWeight: 'bold' } : {},
    // CSS class(es) you own; here, suppress hover on those rows
    class: row => row.rowSrc.bold ? 'not-hover' : null,
  },
};
```

- `style` returns `DecorStyles` (`color`, `background`, `border`, `fontWeight`). `background`/`border`/`fontWeight` style the whole `<tr>`; for per-row **text color** prefer a `class`, since Material cells set their own `color` and can override a `color` inherited from the row.
- `class` returns one or more space-separated class names, or `null`.
- On the clicked/highlighted row, `clickCfg.highlightClicked` overrides only the properties it sets; everything else falls through to `rowStyleCfg`.
- The hooks run once per data refresh (OnPush-friendly).

> **CSS scope:** classes from `class` are applied to the table's own `<tr>`, which lives inside the library component's encapsulated view. Define their styles in **global** styles, or pierce encapsulation with `::ng-deep`:
>
> ```scss
> :host ::ng-deep tr.not-hover:hover { background-color: inherit !important; cursor: default; }
> ```
