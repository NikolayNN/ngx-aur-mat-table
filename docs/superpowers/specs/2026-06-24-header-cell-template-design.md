# Кастомный `<ng-template>` для заголовков колонок (`ngxAurHeaderCellDef`)

**Дата:** 2026-06-24
**Статус:** Design (одобрен к реализации)
**Тип изменения:** A — аддитивная фича. Чисто additive, без ломающих изменений; контракт
`ColumnConfig` не меняется, поведение существующих потребителей (без спроецированного шаблона)
байт-в-байт прежнее. Целевой релиз — minor (например `19.11.0`; номер на момент релиза).

Прямой follow-up к `ngxAurCellDef` (19.8.0), где заголовок/итог через template был явно вынесен
«вне scope (возможный follow-up)». Это — заголовок.

---

## Проблема

`ngxAurCellDef` отдаёт произвольный `<ng-template>` только в **тело ячеек** (`<td mat-cell>`,
`html:386-399`). Заголовок жёстко рендерит `<lib-column-view [config]="columnConfig.headerView"
[value]="columnConfig.name">` (`html:370-374`) — единственная точка настройки это `name` и
`headerView` (icon/image/text). Для селектора, фильтра, toggle и сложной разметки в `<th>`
escape-hatch'а нет: приходится заводить дополнительную header-строку (`ngxAurExtraHeader*Def`) или
обходные решения.

Нужна возможность передать **произвольный `<ng-template>`** для заголовка конкретной колонки —
по тому же паттерну, что `ngxAurCellDef`.

## Решение (зафиксировано с пользователем)

| Вопрос | Решение |
|---|---|
| **Как привязывается** | Keyed-директива-проекция `<ng-template ngxAurHeaderCellDef="key">` внутри `<aur-mat-table>`. Точное зеркало `ngxAurCellDef`: ко-локация с таблицей, `ColumnConfig` остаётся чистыми данными, много колонок сразу. |
| **Что заменяет template** | Содержимое заголовка **одной data-колонки**. Побеждает `name`/`headerView`: если для `key` есть `ngxAurHeaderCellDef` — рендерится он, иначе текущая логика (`lib-column-view`). |
| **Сосуществование с сортировкой** | Настраивается **per-column**. **По умолчанию** (`keep-sort`) шаблон рендерится **внутри** `mat-sort-header` — встроенные стрелка и клик-сортировка по всей ячейке сохраняются (как `ngxAurCellDef` — чистая замена содержимого). Опциональный флаг `ownsCell` убирает `mat-sort-header`: шаблон владеет всем `<th>`, sort пересобирается из контекста. |
| **Контекст** | `{ $implicit: column, column, key, sort, filter }`, где `sort` и `filter` — **управляющие хэндлы** (state + действия). |

### Почему такой выбор по сортировке

У сортируемой колонки `[mat-sort-header]` висит на самом `<th>` (`html:342`): весь заголовок
становится кнопкой (`role="button"`, `tabindex`). Интерактив внутри (input фильтра, checkbox,
toggle) даёт вложенную интерактивность (фокусируемый элемент внутри кнопки — a11y-проблема) и
конфликт клика (клик по контролу заодно дёргает сортировку).

- **keep-sort (default)** оставлен дефолтом как минимальное отличие от текущего поведения
  сортируемых колонок и совпадение с моделью «`ngxAurCellDef` = замена содержимого». Косметические
  шаблоны (icon + текст) на сортируемой колонке сохраняют встроенную стрелку и клик.
- **ownsCell (opt-in)** для интерактивных кейсов: убирает кнопку-сортировку, отдаёт `<th>` целиком,
  а `sort.toggle()`/`sort.direction` из контекста позволяют при желании нарисовать свой триггер.

---

## Контракт

### Директива — `directive/ngx-aur-header-cell-def.directive.ts`

```ts
import { booleanAttribute, Directive, Input, TemplateRef } from '@angular/core';
import { AurHeaderCellContext } from '../model/AurHeaderCellContext';

/**
 * Кастомный шаблон заголовка одной колонки.
 * Ставится на <ng-template>, спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurHeaderCellDef="status" let-column let-sort="sort">…</ng-template>
 * Значение атрибута — ColumnConfig.key колонки, к заголовку которой применяется шаблон.
 */
@Directive({
  selector: '[ngxAurHeaderCellDef]',
  standalone: false,
})
export class NgxAurHeaderCellDefDirective {
  /** Ключ колонки (ColumnConfig.key). */
  @Input('ngxAurHeaderCellDef') key!: string;

  /**
   * true — шаблон занимает весь <th> без mat-sort-header (sort пересобирается из контекста).
   * По умолчанию false: шаблон рендерится внутри mat-sort-header (встроенные стрелка и клик
   * сохраняются). Действует только на сортируемых колонках; на несортируемой — no-op.
   */
  @Input({ transform: booleanAttribute }) ownsCell = false;

  constructor(public templateRef: TemplateRef<AurHeaderCellContext>) {}
}
```

> Имя инпута `ownsCell` — рабочее. При желании защититься от коллизий атрибутов можно
> занеймспейсить (`ngxAurHeaderCellDefOwnsCell`). Решается на ревью; на архитектуру не влияет.

### Контекст — `model/AurHeaderCellContext.ts`

```ts
import { ColumnConfig } from './ColumnConfig';
import { NgxAurFilters } from '../filters/NgxAurFilters';

/** Хэндл сортировки колонки в контексте header-шаблона. */
export interface AurHeaderSortHandle {
  /** Колонка сконфигурирована сортируемой (ColumnConfig.sort активен). */
  sortable: boolean;
  /** Эта колонка — текущая активная сортировка. */
  active: boolean;
  /** Текущее направление: 'asc' | 'desc' | '' ('' когда колонка не активна). */
  direction: 'asc' | 'desc' | '';
  /** Переключить сортировку по этой колонке (asc → desc → clear → …). */
  toggle: () => void;
}

/** Хэндл фильтра колонки (обёртка над публичным applyFilter/removeFilter, name = column.key). */
export interface AurHeaderFilterHandle<T = any> {
  /** Применить фильтр к этой колонке (filterName = column.key). */
  apply: (filter: NgxAurFilters.Base<T>) => void;
  /** Снять фильтр этой колонки. */
  remove: () => void;
  /** Активен ли сейчас фильтр этой колонки (filterStorage.has(key)). */
  active: boolean;
}

/** Контекст, передаваемый в кастомный шаблон заголовка (ngxAurHeaderCellDef). */
export interface AurHeaderCellContext<T = any> {
  /** Конфиг колонки (для let-column). */
  $implicit: ColumnConfig<T>;
  /** Именованный алиас $implicit. */
  column: ColumnConfig<T>;
  /** Ключ колонки (ColumnConfig.key). */
  key: string;
  /** Хэндл сортировки колонки. */
  sort: AurHeaderSortHandle;
  /** Хэндл фильтра колонки. */
  filter: AurHeaderFilterHandle<T>;
}
```

### Использование (потребитель)

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">

  <!-- keep-sort (по умолчанию): кастомная разметка + встроенная стрелка/клик-сортировка -->
  <ng-template ngxAurHeaderCellDef="amount" let-column let-sort="sort">
    <b>{{ column.name }}</b>
    <small *ngIf="sort.active">{{ sort.direction }}</small>
  </ng-template>

  <!-- ownsCell: шаблон владеет ячейкой; sort/filter — из контекста -->
  <ng-template ngxAurHeaderCellDef="status" ownsCell let-key="key" let-filter="filter">
    <input (input)="filter.apply(buildStatusFilter($event))" placeholder="фильтр статуса">
    <button *ngIf="filter.active" (click)="filter.remove()">✕</button>
  </ng-template>

</aur-mat-table>
```

---

## Реализация

### 1. Сбор шаблонов — `ngx-aur-mat-table.component.ts`

Зеркало механизма `cellDefs`, но в Map складываем **директиву** целиком (нужны и `templateRef`,
и флаг `ownsCell`):

```ts
@ContentChildren(NgxAurHeaderCellDefDirective, { descendants: true })
headerCellDefs!: QueryList<NgxAurHeaderCellDefDirective>;

/** key → деф header-ячейки (templateRef + ownsCell). */
_headerCellDefs = new Map<string, NgxAurHeaderCellDefDirective>();
private headerCellDefsSub?: Subscription;

ngAfterContentInit(): void {
  // …существующее (rebuildCellTemplates и пр.)…
  this.rebuildHeaderCellTemplates();
  this.headerCellDefsSub = this.headerCellDefs.changes.subscribe(() => {
    this.rebuildHeaderCellTemplates();
    this.cdr.markForCheck();            // таблица OnPush
  });
}

private rebuildHeaderCellTemplates(): void {
  this._headerCellDefs.clear();
  const keys = new Set(this.tableConfig.columnsCfg.map(c => c.key));
  this.headerCellDefs.forEach(def => {
    this._headerCellDefs.set(def.key, def);   // дубль ключа → побеждает последний
    if (isDevMode() && !keys.has(def.key)) {
      console.warn(`[aur-mat-table] ngxAurHeaderCellDef="${def.key}" не соответствует ни одной колонке.`);
    }
  });
}

ngOnDestroy(): void {
  // …существующее…
  this.headerCellDefsSub?.unsubscribe();
}

/** Шаблон заголовка для колонки (или null). */
headerTpl(key: string): TemplateRef<AurHeaderCellContext<T>> | null {
  return this._headerCellDefs.get(key)?.templateRef ?? null;
}

private headerOwnsCell(key: string): boolean {
  return !!this._headerCellDefs.get(key)?.ownsCell;
}

/** Рендерить mat-sort-header, если колонка сортируема И шаблон не забрал ячейку (ownsCell). */
isHeaderSortHeader(col: ColumnConfig<T>): boolean {
  return isFeatureEnabledFn(col.sort) && !this.headerOwnsCell(col.key);
}

/** Контекст header-шаблона (пересобирается в CD, как cellCtx). */
headerCtx(col: ColumnConfig<T>): AurHeaderCellContext<T> {
  const key = col.key;
  const active = this.matSort?.active === key;
  return {
    $implicit: col,
    column: col,
    key,
    sort: {
      sortable: isFeatureEnabledFn(col.sort),
      active,
      direction: active ? this.matSort.direction : '',
      toggle: () => this.matSort?.sort({ id: key, start: 'asc', disableClear: false }),
    },
    filter: {
      apply: (f: NgxAurFilters.Base<T>) => this.applyFilter(key, f),
      remove: () => this.removeFilter(key),
      active: this.filterStorage.has(key),
    },
  };
}
```

Заметки:
- `headerCtx` пересобирает контекст в цикле change detection — намеренно повторяет паттерн `cellCtx`.
  Заголовков мало (по одному на колонку), не горячий путь.
- `sort.toggle()` работает через `matSort.sort()` **даже в режиме `ownsCell`**, где для колонки нет
  зарегистрированного `MatSortHeader`: `MatSort` хранит `active`/`direction` и эмитит `matSortChange`
  независимо от наличия header-директивы. `MatSortHeader` нужен лишь для отрисовки стрелки и клика.
  Эмит `matSortChange` идёт в существующий `sortTable()` → в клиентском режиме dataSource
  пересортируется (`tableDataSource.sort` привязан), в серверном — `serverPageController.onSort`.
- `filterStorage` — приватное поле компонента; `headerCtx` — метод того же класса, доступ корректен.

### 2. Изменение HTML — `ngx-aur-mat-table.component.html` (блок 338–374)

Меняются только **условие ветки сортируемости** и тело `#headerValue`. Обёртки `<th>`
(size/min/max-width, fit, padding, align) **не трогаются** — шаблон заполняет только содержимое:

```html
<ng-container *ngFor="let columnConfig of tableConfig.columnsCfg" [matColumnDef]="columnConfig.key">

  <!-- было: *ngIf="isFeatureEnabled(columnConfig.sort); else notSortable" -->
  <ng-container *ngIf="isHeaderSortHeader(columnConfig); else notSortable">
    <th mat-header-cell *matHeaderCellDef [mat-sort-header]="columnConfig.key"
        [arrowPosition]="columnConfig.sort?.position === 'start' ? 'before' : 'after'"
        …обёртки size/padding/align без изменений…>
      <ng-container *ngTemplateOutlet="headerValue"></ng-container>
    </th>
  </ng-container>

  <ng-template #notSortable>
    <th mat-header-cell *matHeaderCellDef …обёртки size/padding/align без изменений…>
      <ng-container *ngTemplateOutlet="headerValue"></ng-container>
    </th>
  </ng-template>

  <!-- header value: кастомный шаблон (ngxAurHeaderCellDef) имеет приоритет над name/headerView -->
  <ng-template #headerValue>
    <ng-container *ngIf="headerTpl(columnConfig.key) as hTpl; else builtinHeader">
      <ng-container *ngTemplateOutlet="hTpl; context: headerCtx(columnConfig)"></ng-container>
    </ng-container>
    <ng-template #builtinHeader>
      <lib-column-view [config]="columnConfig.headerView" [value]="columnConfig.name"></lib-column-view>
    </ng-template>
  </ng-template>

  <!-- …td mat-cell / td mat-footer-cell без изменений… -->
</ng-container>
```

Матрица поведения:

| колонка | спроецирован шаблон | результат |
|---|---|---|
| сортируемая | нет | `<th mat-sort-header>` + `lib-column-view` (как сейчас) |
| сортируемая | да, без `ownsCell` | `<th mat-sort-header>` + шаблон внутри (стрелка/клик сохранены) |
| сортируемая | да, `ownsCell` | plain `<th>` (без `mat-sort-header`) + шаблон владеет |
| несортируемая | нет | plain `<th>` + `lib-column-view` (как сейчас) |
| несортируемая | да (любой флаг) | plain `<th>` + шаблон (флаг `ownsCell` — no-op) |

Когда шаблон не спроецирован: `headerTpl()` → `null` → `builtinHeader`; `isHeaderSortHeader()` ===
`isFeatureEnabled(sort)`. **Поведение существующих потребителей не меняется.**

### 3. Регистрация

- `ngx-aur-mat-table.module.ts`: добавить `NgxAurHeaderCellDefDirective` в `declarations` и `exports`.
- `public-api.ts`: экспортировать `directive/ngx-aur-header-cell-def.directive` и
  `model/AurHeaderCellContext` (вместе с `AurHeaderSortHandle` / `AurHeaderFilterHandle`).

---

## Edge cases

- **Ключ не совпадает ни с одной колонкой** — шаблон не используется (no-op, нет `matColumnDef` с
  таким key), в dev — `console.warn`.
- **Несколько `ngxAurHeaderCellDef` с одним ключом** — побеждает последний (`map.set`).
- **`ownsCell` на несортируемой колонке** — no-op (нет `mat-sort-header`, который надо убрать).
- **keep-sort + интерактив внутри** — клик по контролу всплывает в `mat-sort-header` и дёргает
  сортировку; для интерактивных заголовков используйте `ownsCell` (или `$event.stopPropagation()`).
- **Динамика** — появление/исчезновение `<ng-template>` через `*ngIf` потребителя ловится
  `QueryList.changes` → пересборка карты + `markForCheck`.
- **Серверный режим** — `filter.apply` использует существующий клиентский filter-механизм (как и
  публичный `applyFilter` сегодня): на серверную выборку он не влияет, серверная фильтрация остаётся
  ответственностью хоста. Не регресс. `sort.toggle()` в серверном режиме корректно идёт через
  `serverPageController.onSort`.
- **size / align / sticky / fit / padding** — на `<th>`, не трогаются, работают как прежде.
- **SSR** — прямого DOM-доступа нет; `matSort?.`, `filterStorage` (in-memory Map), `isDevMode`,
  `console.warn`, `ngTemplateOutlet` безопасны.

---

## Тесты

Новый `ngx-aur-mat-table-header-cell-template.spec.ts` (host-компонент с `<ng-template
ngxAurHeaderCellDef="…">` внутри таблицы):

1. **Рендер**: колонка с `ngxAurHeaderCellDef` показывает в `<th>` разметку шаблона (не
   `lib-column-view`/`name`).
2. **Контекст**: шаблон получает `column`/`key`; `sort` (`sortable`/`active`/`direction`) и `filter`
   (`active`) отражают состояние (проверка через отрисованный вывод).
3. **Fallback**: колонка без header-дефа → `lib-column-view` с `headerView`/`name`.
4. **Template побеждает name/headerView**: колонка с обоими — рендерится шаблон.
5. **keep-sort (default)**: сортируемая колонка + шаблон без `ownsCell` → `<th>` имеет
   `mat-sort-header` (стрелка присутствует, клик по ячейке сортирует), шаблон отрисован внутри.
6. **ownsCell**: сортируемая колонка + шаблон + `ownsCell` → `<th>` БЕЗ `mat-sort-header` (нет
   стрелки, клик по ячейке не сортирует), шаблон владеет ячейкой.
7. **`sort.toggle()`**: вызов из шаблона эмитит `matSortChange` / меняет порядок (клиентский режим).
8. **`filter.apply()` / `remove()` / `active`**: применение `Base<T>` фильтрует строки; `remove`
   восстанавливает; `active` отражает `filterStorage.has(key)`.
9. **Динамика**: переключение `*ngIf` у `<ng-template>` добавляет/убирает кастомный заголовок (путь
   `QueryList.changes`).
10. **Dev-warning**: `ngxAurHeaderCellDef="не-существует"` → `console.warn` (spy).
11. **Обёртка `<th>`**: классы align/size/padding сохраняются вокруг шаблона в обоих режимах.

Полный прогон остаётся зелёным (фича аддитивна, существующие заголовки не затронуты).

---

## Демо

Новая вкладка «Шаблон заголовка» → компонент `app-table-with-header-cell-template`
(`projects/aur-demo/src/app/table-with-header-cell-template/`), 3 реалистичных примера:

1. **Фильтр-инпут в заголовке** (`ownsCell` + `filter.apply`/`remove`/`active`).
2. **Селектор-чекбокс в data-колонке** (`ownsCell`, своя логика выбора).
3. **Кастомная сортировка** через `ownsCell` + `sort.toggle()`/`sort.direction`, и отдельно
   косметический шаблон на сортируемой колонке в режиме keep-sort (стрелка сохранена).

Регистрируется в app-модуле и добавляется в `app.component.html` (mat-tab). Не путать с вкладкой
«Шаблон ячейки» (`ngxAurCellDef`, тело) — отдельный label.

## Документация

- JSDoc — в контрактах выше (директива, `AurHeaderCellContext` и хэндлы).
- README: короткая секция «Шаблон заголовка колонки» с примерами обоих режимов и таблицей контекста.
- Changelog-запись — при бампе версии (feat), скилл `writing-changelog` (RU).

---

## Scope

**В scope:** обычные data-колонки (по `ColumnConfig.key`).

**Вне scope (возможные follow-up):**
- Заголовки спец-колонок (selection / index / action / drag / timeline) — у них свои
  `COLUMN_NAME` и встроенная разметка.
- Шаблон строки «Итого» (footer) — отдельная фича, как и было отмечено в спеке `ngxAurCellDef` 19.8.0.

## Отклонённые альтернативы

(Те же, что для `ngxAurCellDef` — переносятся дословно.)

- **Input-карта `[headerTemplates]="{ key: tpl }"`** — каждый шаблон надо завести через `#ref` и
  собрать в объект; ключ и `#ref` в двух местах; литерал карты пересоздаётся на каждый CD.
- **Поле `headerTemplate?: TemplateRef` в `ColumnConfig`** — `ColumnConfig` строится в TS, а
  `TemplateRef` живёт во view: нужен `@ViewChild` + присвоение после `ngAfterViewInit`
  (тайминг/ExpressionChanged), данные смешиваются с view-ref.

Директива-проекция (как `ngxAurCellDef`) — единственный вариант, держащий `ColumnConfig` чистыми
данными и ко-локацию шаблона с таблицей.
