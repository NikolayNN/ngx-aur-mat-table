# Кастомный `<ng-template>` для ячеек колонки

**Дата:** 2026-06-16
**Статус:** Design (одобрен к реализации)
**Тип изменения:** A — аддитивная фича. Чисто additive, без ломающих изменений; контракт
`ColumnConfig` не меняется. Целевой релиз — minor (например `19.8.0`; номер на момент релиза).

---

## Проблема

Содержимое ячейки описывается декларативно через `ColumnConfig.valueView` (`ColumnView`:
`icon` / `image` / `text`) и рендерится компонентом `lib-column-view`. Иногда колонку нельзя
выразить этим «текстовым описанием»: нужен chip статуса, прогресс-бар из нескольких полей,
инлайн-кнопка, badge, своя вёрстка. Сегодня escape-hatch'а нет — приходится либо городить
обходные пути, либо мириться с ограничениями `ColumnView`.

Нужна возможность передать **произвольный `<ng-template>`** для тела ячеек конкретной колонки.

## Решение (зафиксировано с пользователем)

| Вопрос | Решение |
|---|---|
| **Что заменяет template** | Только **тело ячеек данных**. Заголовок остаётся на `name`/`headerView`, строка «Итого» — на `totalConverter`. Заголовок/итог через template — вне scope (возможный follow-up). |
| **Значение колонки** | `valueConverter` остаётся **обязательным**. Template меняет только отрисовку; поиск, сортировка и «Итого» работают по `valueConverter` без изменений. |
| **Как привязывается** | Директива-проекция: `<ng-template ngxAurCellDef="key">` внутри `<aur-mat-table>`. Идиоматично (как `matCellDef` у Material), ко-локация с таблицей, много колонок сразу, `ColumnConfig` остаётся чистыми данными. Совпадает с существующим паттерном `subFooterRow`/`searchPrefix` через `@ContentChild`. |
| **Приоритет** | Template **побеждает** `valueView`: если для `key` найден `ngxAurCellDef` — рендерится он; иначе текущая логика (`valueView` → `lib-column-view`, иначе plain `<span>`). |
| **Контекст** | «Богатый»: `$implicit`/`value`/`row`/`rowSrc`/`index`. |

Отклонённые альтернативы:
- **Input-карта `[cellTemplates]="{ key: tpl }"`** — каждый шаблон надо завести через `#ref` и
  собрать в объект; ключ и `#ref` в двух местах; литерал карты пересоздаётся на каждый CD.
- **Поле `cellTemplate?: TemplateRef` в `ColumnConfig`** — `ColumnConfig` строится в TS, а
  `TemplateRef` живёт во view: нужен `@ViewChild` + присвоение после `ngAfterViewInit`
  (тайминг/ExpressionChanged), данные смешиваются с view-ref.

---

## Контракт

### Директива — `directive/ngx-aur-cell-def.directive.ts`

```ts
import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[ngxAurCellDef]',
  standalone: false,
})
export class NgxAurCellDefDirective {
  /** Ключ колонки (ColumnConfig.key), к телу ячеек которой применяется шаблон. */
  @Input('ngxAurCellDef') key!: string;

  constructor(public templateRef: TemplateRef<any>) {}
}
```

### Контекст — `model/AurCellContext.ts`

```ts
import { TableRow } from './TableRow';

/** Контекст, передаваемый в кастомный шаблон ячейки (ngxAurCellDef). */
export interface AurCellContext<T = any> {
  /** Значение колонки = row[key] (то же, что получает lib-column-view). */
  $implicit: any;
  /** Именованный алиас $implicit (для let-value="value"). */
  value: any;
  /** Строка таблицы: .rowSrc — исходный объект T, .id — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.id. */
  index: number;
}
```

### Использование (потребитель)

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurCellDef="status" let-value let-row="row" let-i="index">
    <span class="chip" [class.on]="row.rowSrc.active">{{ value }} (#{{ i }})</span>
  </ng-template>
</aur-mat-table>
```

---

## Реализация

### 1. Сбор шаблонов — `ngx-aur-mat-table.component.ts`

```ts
@ContentChildren(NgxAurCellDefDirective, { descendants: true })
cellDefs!: QueryList<NgxAurCellDefDirective>;

_cellTemplates = new Map<string, TemplateRef<any>>();
private cellDefsSub?: Subscription;

ngAfterContentInit(): void {
  this.rebuildCellTemplates();
  this.cellDefsSub = this.cellDefs.changes.subscribe(() => {
    this.rebuildCellTemplates();
    this.cdr.markForCheck();            // таблица OnPush
  });
}

private rebuildCellTemplates(): void {
  this._cellTemplates.clear();
  const keys = new Set(this.tableConfig.columnsCfg.map(c => c.key));
  this.cellDefs.forEach(def => {
    this._cellTemplates.set(def.key, def.templateRef);   // дубль ключа → побеждает последний
    if (isDevMode() && !keys.has(def.key)) {
      console.warn(`[aur-mat-table] ngxAurCellDef="${def.key}" не соответствует ни одной колонке.`);
    }
  });
}

ngOnDestroy(): void {
  // ...существующее...
  this.cellDefsSub?.unsubscribe();
}

/** Контекст кастомного шаблона ячейки. */
cellCtx(element: TableRow<T>, key: string): AurCellContext<T> {
  const value = element[key];
  return { $implicit: value, value, row: element, rowSrc: element.rowSrc, index: element.id };
}
```

- `descendants: true` — чтобы шаблон можно было обернуть в собственный `<ng-container>`/`*ngIf`
  потребителя.
- `cellCtx` пересобирает контекст в цикле change detection — намеренно повторяет существующий
  паттерн `extendedRowTemplate` (`context: {$implicit: element}` инлайном). Для OnPush-таблицы это
  не горячий путь (CD идёт на смену данных/сортировку/страницу, как и перерисовка строк MatTable).
  При необходимости позже кэшируем по аналогии с `tableView` — сейчас YAGNI.

### 2. Изменение ячейки — `ngx-aur-mat-table.component.html`

Блок `<td mat-cell *matCellDef>` (текущие строки 378–394). Добавляется ветка с наивысшим
приоритетом; обёртка `<td>` со всеми size/padding/align-классами **не меняется** — шаблон
заполняет только содержимое ячейки:

```html
<td mat-cell *matCellDef="let element;"
    [style.width]="columnConfig.size?.width"
    ...существующие обёртки size/padding...
    [ngClass]="_alignClass[columnConfig.key]">
  <ng-container *ngIf="_cellTemplates.get(columnConfig.key) as tpl; else builtinCell">
    <ng-container *ngTemplateOutlet="tpl; context: cellCtx(element, columnConfig.key)"></ng-container>
  </ng-container>
  <ng-template #builtinCell>
    <!-- текущая логика без изменений -->
    <lib-column-view *ngIf="columnConfig.valueView; else plainCell"
                     [config]="tableView[element.id]?.get(columnConfig.key)"
                     [value]="element | dataPropertyGetter: columnConfig.key">
    </lib-column-view>
    <ng-template #plainCell>
      <span class="aur-plain-cell">{{ element | dataPropertyGetter: columnConfig.key }}</span>
    </ng-template>
  </ng-template>
</td>
```

### 3. Регистрация

- `ngx-aur-mat-table.module.ts`: добавить `NgxAurCellDefDirective` в `declarations` и `exports`.
- `public-api.ts`: экспортировать `directive/ngx-aur-cell-def.directive` и `model/AurCellContext`.

---

## Edge cases

- **Ключ не совпадает ни с одной колонкой** — шаблон просто не используется (no-op), в dev —
  `console.warn`.
- **Несколько `ngxAurCellDef` с одним ключом** — побеждает последний (`map.set`).
- **Колонка без `ngxAurCellDef`** — рендер как сегодня (`lib-column-view` при `valueView`, иначе
  plain `<span>`).
- **`valueView` + template на одной колонке** — побеждает template, `valueView` игнорируется.
- **Динамика** — появление/исчезновение шаблона (через `*ngIf` потребителя) ловится
  `QueryList.changes` → пересборка карты + `markForCheck`.
- **size / align / sticky / fit / padding** — работают как прежде (на `<td>`, не трогаются).
- **SSR** — нет прямого DOM-доступа; `ngTemplateOutlet`, `isDevMode`, `console.warn` безопасны.
- **Поиск/сортировка/Итого** по такой колонке — без изменений (по `valueConverter`/`totalConverter`).

---

## Тесты

Новый `ngx-aur-mat-table-custom-cell-template.spec.ts` (host-компонент с `<ng-template
ngxAurCellDef="...">` внутри таблицы):

1. **Рендер кастомного шаблона**: для колонки с `ngxAurCellDef` в ячейке появляется разметка
   шаблона (не `lib-column-view`/plain span).
2. **Контекст**: шаблон получает `value=row[key]`, `rowSrc`=исходный объект, `index=row.id`
   (проверка через отрисованный вывод).
3. **Fallback**: колонка без `ngxAurCellDef` с `valueView` → `lib-column-view`; без `valueView` →
   `span.aur-plain-cell`.
4. **Template побеждает valueView**: колонка с обоими — рендерится шаблон.
5. **Поиск**: фильтр по строке поиска отбирает строки по `valueConverter`-значению колонки с
   шаблоном.
6. **Сортировка**: сортировка по колонке с шаблоном упорядочивает по значению.
7. **Итого**: футер колонки с шаблоном показывает `totalConverter` (не затронут).
8. **Динамика**: переключение `*ngIf` у `<ng-template>` добавляет/убирает кастомный рендер
   (путь `QueryList.changes`).
9. **Dev-warning**: `ngxAurCellDef="не-существует"` → `console.warn` (spy).
10. **Обёртка `<td>`**: классы align/size/padding сохраняются вокруг шаблона.

---

## Демо

Новая вкладка «Шаблон ячейки» → компонент `app-table-with-cell-template`
(`projects/aur-demo/src/app/table-with-cell-template/`), 2–3 реалистичных примера: цветной chip
статуса, прогресс-бар из двух полей, инлайн-кнопка. Регистрируется в app-модуле и добавляется
в `app.component.html` (mat-tab). Существующая вкладка «CustomColumns» — про show/hide колонок,
не путать, поэтому отдельный label.

## Документация

- JSDoc — в контрактах выше (директива, `AurCellContext`).
- README: короткая секция «Кастомный шаблон ячейки» с примером `ngxAurCellDef`.
- Changelog-запись — при бампе версии (feat), скилл writing-changelog (RU).
