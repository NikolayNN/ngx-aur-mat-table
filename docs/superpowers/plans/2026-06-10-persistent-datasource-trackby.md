# Персистентный MatTableDataSource + trackBy строк — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один `MatTableDataSource` на всю жизнь компонента (обновление через `.data=`) + `[trackBy]` по `rowSrc` с опциональным бизнес-ключом `tableConfig.trackBy` — вместо полного пересоздания datasource и DOM строк на каждое обновление `tableData`.

**Architecture:** Точечная правка `NgxAurMatTableComponent` (подход A из спеки): захват дефолтного `filterPredicate` в конструкторе, `initTable()` пишет в `.data` персистентного инстанса, гварды на сеттерах `.paginator`/`.sort` (каждое присваивание пересоздаёт внутреннюю подписку), `customSortFunctions.clear()` при пересборке, метод `trackByRow` + `[trackBy]` в шаблоне. `MatTableDataSourceFactory` удаляется (мёртвый код). Побочный поведенческий фикс: фильтры/поиск переживают обновление данных.

**Tech Stack:** Angular 19, Angular Material 18 (MatTableDataSource), Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-10-persistent-datasource-trackby-design.md`

---

## Структура файлов

| Файл | Роль в фиксе |
|---|---|
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` | Конструктор (захват предиката), `initTable()`, `initPaginator()`, `initSortingDataAccessor()`, `initCustomSortFunctionsMap()`, новый `trackByRow` |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` | `[trackBy]="trackByRow"` на `<table mat-table>` |
| `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` | Новое опциональное поле `TableConfig.trackBy` |
| `projects/ngx-aur-mat-table/src/lib/factories/MatTableDataSourceFactory.ts` | **Удалить** (единственный потребитель — компонент; в public-api не экспортируется) |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-persistent-datasource.spec.ts` | **Создать**: логические тесты без TestBed (стиль `ngx-aur-mat-table-filtering.spec.ts`) |
| `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-trackby.spec.ts` | **Создать**: DOM-тест переиспользования `<tr>` через TestBed-хост (стиль `ngx-aur-mat-table-pagination.spec.ts`) |
| `projects/ngx-aur-mat-table/package.json` | bump 19.3.0 → 19.4.0 |
| `changelog/19.4.0.md` | **Создать**: запись по формату `changelog/19.3.0.md` |

Команда тестов библиотеки (одиночный прогон):

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

---

### Task 0: Ветка и базовый прогон

**Files:** нет правок.

- [ ] **Step 0.1: Создать ветку от master**

```bash
git checkout master
git pull
git checkout -b perf/persistent-datasource-trackby
```

- [ ] **Step 0.2: Базовый прогон тестов (зелёная отправная точка)**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: все существующие спеки PASS (0 failures). Если что-то красное до начала работ — остановиться и разобраться, не смешивать с фиксом.

---

### Task 1: Персистентный datasource (+ фильтры переживают данные, − MatTableDataSourceFactory)

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-persistent-datasource.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (импорты ~строка 33, конструктор ~233, `initTable()` ~423)
- Delete: `projects/ngx-aur-mat-table/src/lib/factories/MatTableDataSourceFactory.ts`

- [ ] **Step 1.1: Написать падающие тесты**

Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-persistent-datasource.spec.ts` целиком:

```ts
import {NgxAurMatTableComponent} from './ngx-aur-mat-table.component';
import {TableRow} from './model/TableRow';
import {NgxAurFilters} from './filters/NgxAurFilters';

interface TestData {
  name: string;
  age: number;
}

class AgeGreaterFilter extends NgxAurFilters.Base<TestData> {
  constructor(private minAge: number) {
    super();
  }

  filterFn(): (data: TableRow<TestData>) => boolean {
    return (data) => data['age'] > this.minAge;
  }

  equals(other: AgeGreaterFilter): boolean {
    return this.minAge === other.minAge;
  }
}

function searchEvent(value: string): Event {
  return {target: {value}} as unknown as Event;
}

describe('NgxAurMatTableComponent persistent datasource', () => {
  let component: NgxAurMatTableComponent<TestData>;

  beforeEach(() => {
    component = new NgxAurMatTableComponent<TestData>(
      {} as any,
      {markForCheck: () => {}} as any
    );

    component.tableConfig = {
      columnsCfg: [
        {name: 'Name', key: 'name', valueConverter: (v) => v.name},
        {name: 'Age', key: 'age', valueConverter: (v) => v.age},
      ]
    };

    component.tableData = [
      {name: 'Alice', age: 30},
      {name: 'Bob', age: 25},
      {name: 'Charlie', age: 35},
    ];

    component.refreshTable();
  });

  function filteredNames(): string[] {
    return component.tableDataSource.filteredData.map(r => r.rowSrc.name);
  }

  it('keeps the same MatTableDataSource instance across data updates', () => {
    const ds = component.tableDataSource;

    component.tableData = [{name: 'Dave', age: 40}];
    component.refreshTable();

    expect(component.tableDataSource).toBe(ds);
    expect(component.tableDataSource.data.map(r => r.rowSrc.name)).toEqual(['Dave']);
  });

  it('keeps programmatic filters applied after data update', () => {
    component.applyFilter('age', new AgeGreaterFilter(26));
    expect(filteredNames()).toEqual(['Alice', 'Charlie']);

    component.tableData = [
      {name: 'Dave', age: 20},
      {name: 'Eve', age: 50},
    ];
    component.refreshTable();

    expect(filteredNames()).toEqual(['Eve']);
  });

  it('keeps search filter applied after data update', () => {
    component.applySearchFilter(searchEvent('ali'));
    expect(filteredNames()).toEqual(['Alice']);

    component.tableData = [
      {name: 'Alina', age: 20},
      {name: 'Bob', age: 50},
    ];
    component.refreshTable();

    expect(filteredNames()).toEqual(['Alina']);
  });

  it('emits filtered (not full) rows in filterChange after data update', () => {
    component.applyFilter('age', new AgeGreaterFilter(26));

    const emitted: TestData[][] = [];
    component.filterChange.subscribe(rows => emitted.push(rows));

    component.tableData = [
      {name: 'Dave', age: 20},
      {name: 'Eve', age: 50},
    ];
    component.refreshTable();

    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[emitted.length - 1].map(r => r.name)).toEqual(['Eve']);
  });
});
```

- [ ] **Step 1.2: Убедиться, что тесты падают**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: 4 новых теста FAIL —
`keeps the same MatTableDataSource instance...` (инстанс пересоздаётся),
`keeps programmatic filters...` / `keeps search filter...` / `emits filtered...` (фильтрация сбрасывается, приходит полный список). Существующие спеки — PASS.

- [ ] **Step 1.3: Реализация — компонент**

В `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`:

1. Импорт (строка ~33): заменить

```ts
import {MatTableDataSourceFactory} from "./factories/MatTableDataSourceFactory";
```

на

```ts
import {TableRowsFactory} from "./factories/TableRowsFactory";
```

2. Конструктор (~строка 233): добавить захват дефолтного предиката (поле `tableDataSource` уже инициализировано к моменту тела конструктора):

```ts
constructor(private viewContainerRef: ViewContainerRef,
            private cdr: ChangeDetectorRef) {
  // дефолтный предикат персистентного инстанса — захватывается один раз на жизнь компонента
  this._defaultFilterPredicate = this.tableDataSource.filterPredicate;
}
```

3. `initTable()` (~строка 423): заменить пересоздание datasource на запись в `.data`
(сеттер `data` НЕ пересоздаёт внутреннюю подписку — только пушит в пайплайн)
и убрать строку захвата предиката:

```ts
private initTable() {
  this._tableName = this.tableConfig.name ?? 'unknown-table-name';
  this.tableDataSource.data = TableRowsFactory.convert(this.tableData, this.tableConfig.columnsCfg);
  this.tableView = TableViewFactory.toView(this.tableDataSource.data, this.tableConfig)
  this.rowStyles = RowStyleFactory.toRowStyles(this.tableDataSource.data, this.tableConfig)
  this._headerStyle = this.toCss(this.tableConfig.headerRowCfg?.styleCfg?.style);
  this._headerClass = this.tableConfig.headerRowCfg?.styleCfg?.class ?? null;
  if (!this._customDisplayColumnsEnabled) {
    this._displayColumns = DisplayColumnsFactory.create(this.tableConfig);
  }
}
```

- [ ] **Step 1.4: Удалить мёртвую фабрику**

```bash
git rm projects/ngx-aur-mat-table/src/lib/factories/MatTableDataSourceFactory.ts
```

(Перед удалением подстраховка: поиск `MatTableDataSourceFactory` по `projects/` — например, `rg -n "MatTableDataSourceFactory" projects/` или Grep-инструментом — должен показать 0 совпадений после правки импорта из Step 1.3.)

- [ ] **Step 1.5: Прогнать тесты**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: все PASS, включая 4 новых и существующий `ngx-aur-mat-table-filtering.spec.ts`.

- [ ] **Step 1.6: Commit**

```bash
git add -A projects/ngx-aur-mat-table/src/lib
git commit -m "perf(core): persistent MatTableDataSource across data updates

tableData updates now go through dataSource.data= instead of recreating
the datasource. Side effect (by design): active filters/search survive
data updates. Removes dead MatTableDataSourceFactory."
```

---

### Task 2: Гварды `.paginator` / `.sort` — без пересоздания пайплайна на refresh

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`initPaginator()` ~325, `initSortingDataAccessor()` ~338)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-persistent-datasource.spec.ts` (добавить тест)

- [ ] **Step 2.1: Написать падающий тест**

Добавить в `describe('NgxAurMatTableComponent persistent datasource', ...)`:

```ts
it('does not rebuild the datasource pipeline on repeated refreshes', () => {
  // _updateChangeSubscription дёргается сеттерами .paginator/.sort —
  // на повторных refresh с теми же значениями вызовов быть не должно
  const rebuildSpy = spyOn(component.tableDataSource as any, '_updateChangeSubscription').and.callThrough();

  component.refreshTable();
  component.refreshTable();

  expect(rebuildSpy).not.toHaveBeenCalled();
});
```

Примечание: spyOn на метод прототипа работает (jasmine ставит own-property поверх);
`spyOnProperty` для accessor-а из прототипа НЕ работает — поэтому шпионим именно за
`_updateChangeSubscription`.

- [ ] **Step 2.2: Убедиться, что тест падает**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: новый тест FAIL (`_updateChangeSubscription` вызывается присваиваниями `.paginator`/`.sort` в каждом refresh). Остальные PASS.

- [ ] **Step 2.3: Реализация — гварды**

Заменить оба метода целиком:

```ts
private initPaginator(): void {
  // В серверном режиме держим null — MatTableDataSource вызвал бы
  // _updatePaginator(filteredDataLength) и перезаписал бы длину, присланную сервером.
  // ?? null нормализует undefined (пагинатор не отрендерен), чтобы гвард был точным.
  const target = this.isServerMode() ? null : (this.activePaginator ?? null);
  if (this.tableDataSource.paginator !== target) {
    // сеттер пересоздаёт внутреннюю подписку — присваиваем только при реальном изменении
    this.tableDataSource.paginator = target;
  }
}

private initSortingDataAccessor(): void {
  const sort = this.matSort ?? null;
  if (this.tableDataSource.sort !== sort) {
    // тот же гвард: сеттер .sort тоже пересоздаёт подписку
    this.tableDataSource.sort = sort;
  }
  // обычное свойство, подписку не трогает — присваиваем без гварда
  this.tableDataSource.sortingDataAccessor = (data, key) => {
    const customSortFunction = this.customSortFunctions.get(key);
    return customSortFunction ? customSortFunction(data, key) : data[key];
  };
}
```

- [ ] **Step 2.4: Прогнать тесты**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: все PASS. Особо смотреть на `ngx-aur-mat-table-pagination.spec.ts` —
тест `binds the external paginator to the data source...` (attach внешнего пагинатора
через `ngOnChanges` → `initPaginator()`) должен остаться зелёным: гвард пропускает
присваивание, потому что значение реально меняется.

- [ ] **Step 2.5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib
git commit -m "perf(core): guard paginator/sort reassignment on refresh

Each MatTableDataSource .paginator/.sort setter call rebuilds the internal
render subscription and emits an extra render pass. Assign only on change:
refresh is now a single render pass from .data="
```

---

### Task 3: Очистка стейл-функций кастомной сортировки

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`initCustomSortFunctionsMap()` ~417)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-persistent-datasource.spec.ts` (добавить тест)

- [ ] **Step 3.1: Написать падающий тест**

Добавить в тот же `describe`:

```ts
it('drops stale custom sort functions when config changes', () => {
  component.tableConfig = {
    columnsCfg: [
      {
        name: 'Name', key: 'name', valueConverter: (v) => v.name,
        sort: {enable: true, customSort: () => 0}
      },
      {name: 'Age', key: 'age', valueConverter: (v) => v.age},
    ]
  };
  component.refreshTable();
  const rowAlice = component.tableDataSource.data[0];
  expect(component.tableDataSource.sortingDataAccessor(rowAlice, 'name')).toBe(0);

  // конфиг без customSort: старая функция не должна применяться
  component.tableConfig = {
    columnsCfg: [
      {name: 'Name', key: 'name', valueConverter: (v) => v.name},
      {name: 'Age', key: 'age', valueConverter: (v) => v.age},
    ]
  };
  component.refreshTable();
  expect(component.tableDataSource.sortingDataAccessor(rowAlice, 'name')).toBe('Alice');
});
```

- [ ] **Step 3.2: Убедиться, что тест падает**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: новый тест FAIL на втором expect (стейл `customSort` возвращает `0` вместо `'Alice'`). Остальные PASS.

- [ ] **Step 3.3: Реализация**

```ts
private initCustomSortFunctionsMap() {
  this.customSortFunctions.clear();
  this.tableConfig.columnsCfg
    .filter(c => c.sort != null && isFeatureEnabledFn(c.sort) && c.sort.customSort)
    .forEach(c => this.customSortFunctions.set(c.key, c.sort!.customSort!))
}
```

- [ ] **Step 3.4: Прогнать тесты**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: все PASS.

- [ ] **Step 3.5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib
git commit -m "fix(core): clear stale custom sort functions on config refresh"
```

---

### Task 4: trackBy — поле конфига, метод, шаблон, DOM-тест переиспользования

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (интерфейс `TableConfig`, ~строка 13)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (новый метод рядом с `castSrc`, ~строка 587)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (открывающий тег `<table>`, строка 35)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-persistent-datasource.spec.ts` (юнит-тесты `trackByRow`)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-trackby.spec.ts` (DOM-тест)

- [ ] **Step 4.1: Написать падающие юнит-тесты**

Добавить в `describe` из `ngx-aur-mat-table-persistent-datasource.spec.ts`:

```ts
it('trackByRow returns rowSrc by default', () => {
  const row = component.tableDataSource.data[0];
  expect(component.trackByRow(0, row)).toBe(row.rowSrc);
});

it('trackByRow uses tableConfig.trackBy when provided', () => {
  component.tableConfig = {
    trackBy: item => item.name,
    columnsCfg: [
      {name: 'Name', key: 'name', valueConverter: (v) => v.name},
      {name: 'Age', key: 'age', valueConverter: (v) => v.age},
    ]
  };
  component.refreshTable();

  const row = component.tableDataSource.data[0];
  expect(component.trackByRow(0, row)).toBe('Alice');
});
```

- [ ] **Step 4.2: Написать падающий DOM-тест**

Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-trackby.spec.ts` целиком:

```ts
import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgxAurMatTableModule} from './ngx-aur-mat-table.module';
import {TableConfig} from './model/ColumnConfig';

interface Row {
  name: string;
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`
})
class TrackByHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{key: 'name', name: 'Name', valueConverter: v => v.name}],
  };
  data: Row[] = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
}

describe('NgxAurMatTable trackBy DOM reuse', () => {
  let fixture: ComponentFixture<TrackByHostComponent>;
  let host: TrackByHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TrackByHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TrackByHostComponent);
    host = fixture.componentInstance;
  });

  function bodyRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
  }

  it('reuses <tr> elements when the same objects are reordered', () => {
    fixture.detectChanges();
    const rowsBefore = bodyRows();
    expect(rowsBefore.map(tr => tr.textContent!.trim())).toEqual(['a', 'b', 'c']);
    const elementByText = new Map(rowsBefore.map(tr => [tr.textContent!.trim(), tr]));

    // те же ОБЪЕКТЫ, новый порядок и новая ссылка на массив (триггерит ngOnChanges)
    host.data = [host.data[2], host.data[0], host.data[1]];
    fixture.detectChanges();

    const rowsAfter = bodyRows();
    expect(rowsAfter.map(tr => tr.textContent!.trim())).toEqual(['c', 'a', 'b']);
    rowsAfter.forEach(tr => {
      expect(elementByText.get(tr.textContent!.trim()))
        .withContext(`<tr> "${tr.textContent!.trim()}" должен быть тем же DOM-узлом`)
        .toBe(tr);
    });
  });
});
```

- [ ] **Step 4.3: Убедиться, что тесты падают**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: прогон падает на компиляции юнит-тестов (`trackByRow` и `trackBy` не существуют) — это «красная» фаза. (DOM-тест дойдёт до выполнения после Step 4.4 и должен падать на identity до Step 4.5.)

- [ ] **Step 4.4: Реализация — конфиг + метод**

1. `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — в интерфейс `TableConfig<T>` после поля `name` добавить:

```ts
  /**
   * Ключ идентичности строки для переиспользования DOM (trackBy).
   * По умолчанию строки сравниваются по ссылке на исходный объект (rowSrc):
   * этого достаточно, когда объекты стабильны (пересортировка, точечная замена).
   * Задайте бизнес-ключ (например, item => item.id), если объекты пересоздаются
   * при каждой загрузке (типичный HTTP-ответ) — тогда DOM строк переиспользуется
   * и для «свежих» объектов. Ключ должен быть уникален в пределах данных.
   */
  trackBy?: (item: T) => unknown,
```

2. `ngx-aur-mat-table.component.ts` — рядом с `castSrc` (~строка 587) добавить:

```ts
  /** trackBy для всех строковых дефов таблицы: бизнес-ключ из конфига или ссылка на rowSrc. */
  trackByRow = (_: number, row: TableRow<T>): unknown =>
    this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;
```

- [ ] **Step 4.5: Реализация — шаблон**

`ngx-aur-mat-table.component.html`, строка 35: добавить `[trackBy]` в открывающий тег таблицы:

```html
      <table #table mat-table matSort
             [trackBy]="trackByRow"
             [multiTemplateDataRows]="extendedRowTemplate !== null"
             [dataSource]="tableDataSource"
             (matSortChange)="sortTable($event)"
             [style.height]="tableConfig.tableViewCfg?.height"
             [style.max-height]="tableConfig.tableViewCfg?.maxHeight"
             [style.min-height]="tableConfig.tableViewCfg?.minHeight"
             [ngClass]="{'hide-table-body': isTableBodyHide}">
```

- [ ] **Step 4.6: Прогнать тесты**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: все PASS, включая оба юнит-теста `trackByRow` и DOM-тест переиспользования `<tr>`.

- [ ] **Step 4.7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib
git commit -m "feat(core): row trackBy with optional business key (tableConfig.trackBy)

Default tracks by rowSrc reference; tableConfig.trackBy lets consumers
supply a business key so row DOM is reused even when the server returns
fresh object instances each fetch."
```

---

### Task 5: Полная верификация (тесты + сборки)

**Files:** нет правок (или точечные фиксы по результатам).

- [ ] **Step 5.1: Полный прогон спеков библиотеки**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: 0 failures. Зоны особого внимания (могли закодировать старое поведение):
- `ngx-aur-mat-table-filtering.spec.ts` — не обновляет данные после фильтров, должен пройти без правок;
- `ngx-aur-mat-table-pagination.spec.ts` — attach внешнего пагинатора и server-режим (`paginator === null` держится гвардом);
- `SelectionProvider.spec.ts` / `ngx-aur-mat-table-total-row-visibility.spec.ts` — без изменений семантики.
Если какой-то существующий тест зафиксировал именно сброс фильтра после смены данных — обновить его ожидание под новую семантику и отметить это в коммит-месседже.

- [ ] **Step 5.2: Сборка библиотеки (AOT-гейт для шаблона)**

Run: `npm run build_lib`
Expected: успешная сборка без ошибок шаблона (`[trackBy]` существует у mat-table).

- [ ] **Step 5.3: Сборка демо (компиляция потребителя)**

Run: `npx ng build aur-demo`
Expected: успешная сборка — демо-приложение компилируется против изменённой библиотеки.

- [ ] **Step 5.4: Commit (только если были точечные фиксы тестов)**

```bash
git add -A
git commit -m "test(core): align expectations with persistent-datasource semantics"
```

---

### Task 6: Версия 19.4.0 + changelog

**Files:**
- Modify: `projects/ngx-aur-mat-table/package.json` (строка 3)
- Create: `changelog/19.4.0.md`

- [ ] **Step 6.1: Bump версии**

`projects/ngx-aur-mat-table/package.json`: `"version": "19.3.0"` → `"version": "19.4.0"`.

- [ ] **Step 6.2: Запись changelog**

Создать `changelog/19.4.0.md` (формат по образцу `changelog/19.3.0.md`):

````markdown
# 19.4.0

## Performance: persistent MatTableDataSource + row trackBy

The table now keeps a single `MatTableDataSource` instance for the whole
component lifetime and pushes updates via `data = rows` instead of recreating
the datasource on every `tableData` change. Together with a new `trackBy` on
the mat-table this stops tearing down and rebuilding the row DOM:

- one render pass per refresh instead of up to three (datasource recreation
  plus `.paginator`/`.sort` reassignment each rebuilt the internal pipeline);
- `<tr>` elements are reused when row object references are stable
  (reordering, single-item replacement) — no flicker, scroll/hover state survives;
- new optional `tableConfig.trackBy: (item: T) => unknown` provides a business
  key (e.g. `item => item.id`) so row DOM is reused even when every fetch
  returns fresh object instances. Keys must be unique within the data.

```ts
tableConfig: TableConfig<Customer> = {
  trackBy: c => c.id,
  columnsCfg: [...]
}
```

## Behavior change: filters survive data updates

Previously every `tableData` update silently dropped active filtering: the
search field kept its text while the table showed all rows (desync). With the
persistent datasource, programmatic filters (`applyFilter`) and the search box
keep filtering after a data update:

- `filterChange` emits the filtered (not full) list after a data update;
- the selection master checkbox and counters operate on the filtered set.

## Fix: stale custom sort functions

Changing `columnsCfg` no longer leaves previously registered `customSort`
functions active for removed or changed columns.
````

- [ ] **Step 6.3: Commit**

```bash
git add projects/ngx-aur-mat-table/package.json changelog/19.4.0.md
git commit -m "chore(release): bump to 19.4.0 + changelog"
```

---

### Task 7: Завершение ветки

- [ ] **Step 7.1: Финальный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless && npm run build_lib`
Expected: 0 failures, успешная сборка.

- [ ] **Step 7.2: Завершить ветку**

REQUIRED SUB-SKILL: `superpowers:finishing-a-development-branch` — выбор merge в master / PR / иное за пользователем.

---

## Самопроверка покрытия спеки

| Требование спеки | Где в плане |
|---|---|
| §1 Контракт: `TableConfig.trackBy` | Task 4, Step 4.4 |
| §2 Конструктор: захват `_defaultFilterPredicate` | Task 1, Step 1.3 |
| §2 `initTable()` → `.data=` через `TableRowsFactory` | Task 1, Step 1.3 |
| §2 Гвард `.paginator` (server → null) | Task 2, Step 2.3 |
| §2 Гвард `.sort` | Task 2, Step 2.3 |
| §2 `customSortFunctions.clear()` | Task 3 |
| §2 Фильтры переживают данные (ничего не сбрасываем) | Task 1 (тесты Step 1.1) |
| §3 `trackByRow` + `[trackBy]` в шаблоне | Task 4, Steps 4.4–4.5 |
| §4 Удаление `MatTableDataSourceFactory` | Task 1, Step 1.4 |
| Тесты 1–7 из спеки | Tasks 1–5 (персистентность, фильтры, поиск, trackBy unit, DOM reuse, stale sort, регрессии) |
| bump 19.4.0 + changelog | Task 6 |
