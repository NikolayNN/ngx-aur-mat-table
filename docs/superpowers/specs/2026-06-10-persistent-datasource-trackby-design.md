# Персистентный MatTableDataSource + trackBy строк

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** оптимизация производительности + поведенческий фикс. API расширяется
одним опциональным полем (`TableConfig.trackBy`), ничего не ломается. Побочный
поведенческий сдвиг: активные фильтры/поиск теперь **переживают** обновление `tableData`
(раньше визуально сбрасывались при сохранённом тексте в поле — рассинхрон). Проверено по
демо: ни один пример не совмещает фильтры с динамическим обновлением данных, на сброс
никто не опирается. Выпуск как **minor** (19.4.0) с заметкой в changelog.

## Проблема

Каждое изменение `tableData` (и каждый `refreshTable()`, в т.ч. на каждую страницу в
серверном режиме) полностью пересоздаёт datasource и весь DOM строк.

**Подтверждение в коде** (`ngx-aur-mat-table.component.ts:423-434`):

```ts
private initTable() {
  this._tableName = this.tableConfig.name ?? 'unknown-table-name';
  this.tableDataSource = MatTableDataSourceFactory.convert(this.tableData, this.tableConfig.columnsCfg); // новый инстанс
  this._defaultFilterPredicate = this.tableDataSource.filterPredicate;
  ...
}
```

Последствия:

1. **До трёх проходов рендера на один refresh.** Новый `MatTableDataSource` подписывает
   внутренний пайплайн в конструкторе; затем `initPaginator()` присваивает `.paginator`,
   а `initSortingDataAccessor()` — `.sort`. Каждый из этих сеттеров вызывает
   `_updateChangeSubscription()` → пересоздание подписки → лишняя эмиссия `_renderData`.
2. **Полное перестроение DOM строк.** У `<table mat-table>` нет `[trackBy]`, а все строки
   заворачиваются в новые `TableRow` — дифферу не за что зацепиться, он уничтожает и
   создаёт заново все `<tr>`. Строки дорогие: каждая ячейка — `lib-column-view` +
   вложенный `lib-icon-view` + `MatTooltip` (таблица 50×10 ≈ 1500 инстансов
   компонентов/директив). Видимые эффекты: мигание, потеря скролла/hover/тултипов,
   GC-паузы при частых обновлениях (polling, серверная пагинация).
3. **Рассинхрон фильтров.** Свежий datasource имеет пустой `filter` и дефолтный
   `filterPredicate`, при этом `filterStorage` и `_searchText` компонента сохраняются:
   после обновления данных таблица показывает всё, хотя в поле поиска остался текст.
   Следующее нажатие клавиши «внезапно» возвращает фильтрацию.
4. **Стейл кастомных сортировок.** `customSortFunctions` не очищается между refresh
   (`initCustomSortFunctionsMap`, `ngx-aur-mat-table.component.ts:417-421`) — при смене
   `columnsCfg` с удалением `customSort` старая функция продолжает применяться.

## Решение

Один `MatTableDataSource` на всю жизнь компонента; обновление данных — через
`dataSource.data = rows` (сеттер `data` НЕ пересоздаёт подписку, только пушит в
существующий пайплайн). Переиспользование DOM — через `[trackBy]` по ссылке `rowSrc`
с опциональным бизнес-ключом в конфиге.

### 1. Контракт — `model/ColumnConfig.ts`

В `TableConfig<T>` добавляется одно опциональное поле:

```ts
export interface TableConfig<T> {
  ...
  /**
   * Ключ идентичности строки для переиспользования DOM (trackBy).
   * По умолчанию строки сравниваются по ссылке на исходный объект (rowSrc):
   * этого достаточно, когда объекты стабильны (пересортировка, точечная замена).
   * Задайте бизнес-ключ (например, item => item.id), если объекты пересоздаются
   * при каждой загрузке (типичный HTTP-ответ) — тогда DOM строк переиспользуется
   * и для «свежих» объектов. Ключ должен быть уникален в пределах данных.
   */
  trackBy?: (item: T) => unknown;
}
```

### 2. Жизненный цикл datasource — `ngx-aur-mat-table.component.ts`

Поле остаётся единственным инстансом на всю жизнь компонента
(`public tableDataSource = new MatTableDataSource<TableRow<T>>([])`, строка 90).

```ts
constructor(private viewContainerRef: ViewContainerRef,
            private cdr: ChangeDetectorRef) {
  // дефолтный предикат персистентного инстанса; раньше захватывался на каждый refresh
  this._defaultFilterPredicate = this.tableDataSource.filterPredicate;
}

private initTable() {
  this._tableName = this.tableConfig.name ?? 'unknown-table-name';
  this.tableDataSource.data = TableRowsFactory.convert(this.tableData, this.tableConfig.columnsCfg);
  // строки this.tableDataSource = MatTableDataSourceFactory.convert(...) и
  // this._defaultFilterPredicate = ... отсюда удаляются; остальное без изменений
  ...
}

private initPaginator(): void {
  // null в серверном режиме — иначе MatTableDataSource перезаписал бы длину, присланную сервером
  const target = this.isServerMode() ? null : this.activePaginator;
  if (this.tableDataSource.paginator !== target) {  // сеттер пересоздаёт подписку — присваиваем только при изменении
    this.tableDataSource.paginator = target;
  }
}

private initSortingDataAccessor(): void {
  if (this.tableDataSource.sort !== this.matSort) {  // тот же гвард для .sort
    this.tableDataSource.sort = this.matSort;
  }
  this.tableDataSource.sortingDataAccessor = ...;    // обычное свойство, подписку не трогает — без гварда
}

private initCustomSortFunctionsMap() {
  this.customSortFunctions.clear();                  // фикс стейла при смене конфига
  this.tableConfig.columnsCfg...
}
```

Порядок в `prepareTableData()`: `initCustomSortFunctionsMap()` вызывается ДО `initTable()` —
sorting accessor читает карту синхронно во время sort-прохода, который запускает `.data=`
(выяснено на код-ревью Task 2: раньше окно маскировалось лишним присваиванием `.sort=`).

Фильтры при обновлении данных: **ничего дополнительно не делаем**. На персистентном
инстансе `filter` и `filterPredicate` сохраняются, поэтому `.data = rows` синхронно
прогоняет новые данные через активные фильтры (пайплайн на BehaviorSubject —
`filteredData` обновлён уже к моменту `emitFilteredValues()`).

### 3. trackBy — компонент + шаблон

```ts
trackByRow = (_: number, row: TableRow<T>): unknown =>
  this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;
```

```html
<table #table mat-table matSort [trackBy]="trackByRow" ...>
```

`trackBy` у mat-table один на таблицу — действует на все строковые дефы, включая
expanded-строку (`multiTemplateDataRows`). Дубликаты ключей CDK-диффер переживает
(переиспользование по порядку следования), требование уникальности фиксируется в JSDoc.

### 4. Удаление мёртвого кода

`factories/MatTableDataSourceFactory.ts` удаляется: единственный потребитель — компонент
(строка 425), в `public-api.ts` не экспортируется. Компонент переходит на прямой вызов
`TableRowsFactory.convert(...)`.

## Поведение по кейсам

| Кейс                                                  | Результат                                                                                             |
|-------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Смена `tableData` при активном поиске/`applyFilter`   | Фильтры продолжают применяться к новым данным (раньше — визуальный сброс при сохранённом тексте)      |
| `filterChange` после смены данных                     | Эмитит отфильтрованный список (раньше — полный)                                                       |
| Master-чекбокс/счётчик выделения после смены данных   | Работают по отфильтрованному множеству — консистентно с новой семантикой                              |
| Пересортировка/точечная замена при стабильных ссылках | DOM строк переиспользуется, обновляются только изменившиеся привязки                                  |
| Полностью новые объекты, `trackBy` не задан           | Полное перестроение как раньше, но один проход рендера вместо трёх                                    |
| Новые объекты + `trackBy: item => item.id`            | DOM переиспользуется по бизнес-ключу                                                                  |
| Серверный режим (`pageSource`)                        | `paginator` остаётся `null` (гвард держит стабильно); `onResult` → `.data=` — один проход на страницу |
| `externalPaginator` подключён/отключён                | `initPaginator()` с гвардом, семантика `ngOnChanges` прежняя                                          |
| Клампинг `pageIndex` при уменьшении данных            | Без изменений — `_updatePaginator` вызывается из пайплайна при `.data=`                               |
| Сортировка после refresh                              | Без изменений — `MatSort` живёт в директиве, `.sort` уже привязан                                     |
| Ссылка `tableDataSource` через `@ViewChild`           | Стабильна на всю жизнь компонента (раньше протухала после каждого обновления)                         |
| Смена `columnsCfg` с удалением `customSort`           | Стейл-функция больше не применяется (`clear()`)                                                       |

## Тестирование (TDD)

1. **Персистентность:** ссылка на `tableDataSource` не меняется после смены `tableData`.
2. **Фильтры переживают данные:** `applyFilter` → смена `tableData` → `filteredData`
   отфильтрован, `filterChange` эмитит отфильтрованное.
3. **Поиск переживает данные:** `applySearchFilter` → смена `tableData` → фильтрация
   по строке поиска действует.
4. **`trackByRow` по умолчанию** возвращает `rowSrc`; с `tableConfig.trackBy` — бизнес-ключ.
5. **Переиспользование DOM:** пересортировка того же массива объектов не пересоздаёт
   `<tr>` (сравнение DOM-элементов по identity до/после).
6. **Очистка кастомных сортировок:** смена конфига убирает старую `customSort`-функцию.
7. **Регрессии:** существующие спеки (selection preserve при refresh, pagination,
   filtering, total row) проходят без правок ожиданий, кроме мест, где старые тесты
   фиксировали сброс фильтра (если такие есть — обновить под новую семантику).

## Затронутые файлы

- `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — поле `trackBy`.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — конструктор
  (захват предиката), `initTable()`, `initPaginator()`, `initSortingDataAccessor()`,
  `initCustomSortFunctionsMap()`, метод `trackByRow`, импорты
  (−`MatTableDataSourceFactory`, +`TableRowsFactory`).
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — `[trackBy]`
  на `<table mat-table>`.
- `projects/ngx-aur-mat-table/src/lib/factories/MatTableDataSourceFactory.ts` — удалить.
- Спеки: новые тесты (см. выше) + ревизия существующих на предмет фиксации старого
  поведения фильтров.
- `projects/ngx-aur-mat-table/package.json` — bump 19.3.0 → 19.4.0.
- Changelog — оптимизация рендера + поле `trackBy` + заметка о новой семантике фильтров.

## Использование (после реализации)

Ничего настраивать не нужно — выигрыш автоматический. Для серверных данных
(новые объекты на каждый фетч) можно добавить бизнес-ключ:

```ts
tableConfig: TableConfig<Customer> = {
  trackBy: c => c.id,
  columnsCfg: [...]
}
```
