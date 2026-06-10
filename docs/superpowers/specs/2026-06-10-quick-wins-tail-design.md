# Хвост квик-винов: условные дефы, ранний выход TableViewFactory, SSR-safe ResizeObserver

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** оптимизации производительности/легковесности, не ломающие. Квик-вины
№8, №10, №13 и хвост №7 из обзора производительности, одной веткой. Релизный носитель — 19.5.0.

## №8 — колонко-дефы опциональных фич регистрируются всегда

**Проблема.** В шаблоне таблицы безусловно зарегистрированы:
- `*ngFor` по `_displayExtraHeaderTopCell` / `_displayExtraHeaderBottomCell` — по 2 лишних
  `MatColumnDef`-дерева НА КАЖДУЮ колонку, даже когда `extraHeaderCellTopTemplate`/`BottomTemplate`
  не переданы (строки-дефы при этом уже под `*ngIf`);
- колонко-деф `expandedRow` — даже без `extendedRowTemplate`;
- колонко-деф `subFooterRow` — даже без `subFooterRowTemplate`.

Для обычной таблицы 10 колонок это ~22 лишних дефа (директивы, регистрация в MatTable) при
каждой инициализации.

**Решение.** Обернуть каждый блок в `<ng-container *ngIf="<соответствующий template>">`.
Консистентность гарантирована: эти колонки ссылаются ТОЛЬКО из строк-дефов, которые уже
под тем же условием — деф и строка появляются/исчезают в одном CD-проходе.

**Известный CDK-нюанс** (из спеки 19.3.0): динамическое добавление/удаление row-дефов после
первого рендера может не перерисовать outlet. Этот риск существует УЖЕ СЕЙЧАС (строки-дефы
условные), наше изменение его не расширяет: шаблоны передаются статически при инициализации.

## №10 — TableViewFactory создаёт пустые Map на каждую строку

**Проблема.** `TableViewFactory.toView` при отсутствии колонок с `valueView` всё равно
выполняет `rows.map(...)` и создаёт пустую `Map` на каждую строку — O(n) мусора на каждый
refresh (после №3 эти Map ещё и никем не читаются).

**Решение.** Ранний выход: пустой `columnViewMap` → `return []`. Компонент читает через
`tableView[element.id]?.get(...)` — undefined-безопасно (и только в view-колонках).

## №13 — статический `new ResizeObserver()` ломает SSR на импорте

**Проблема.** `EmptyValue.RESIZE_OBSERVER = new ResizeObserver(() => {})` выполняется при
вычислении класса → в Node/SSR `ResizeObserver` не определён → библиотека падает на импорте.
Плюс бессмысленный глобальный объект в браузере.

**Решение.**
- Удалить статик из `EmptyValue` (наружу не экспортируется, единственный потребитель — компонент).
- Поле компонента: `private resizeColumnOffsetsObserver?: ResizeObserver;` (уходит и `@ts-ignore`).
- `ngAfterViewInit`: создание обёрнуто в `if (typeof ResizeObserver !== 'undefined')` —
  SSR проходит и рендер-фазу (lifecycle-хуки на сервере выполняются).
- `ngOnDestroy`: `this.resizeColumnOffsetsObserver?.disconnect();`.

## Хвост №7 — двойной `querySelectorAll('th')` и всегда-истинный гвард

**Проблема.** `updateColumnOffsets()`: условие `if (this.table?.nativeElement?.querySelectorAll('th'))`
всегда truthy (NodeList), а внутри `querySelectorAll` вызывается второй раз.

**Решение.**

```ts
private updateColumnOffsets() {
  const tableEl: HTMLElement | undefined = this.table?.nativeElement;
  if (!tableEl) {
    return;
  }
  const offsets: ColumnOffset[] = Array.from(tableEl.querySelectorAll('th'))
    .slice(0, this._displayColumns.length)
    .map((c) => (c as HTMLElement))
    .map((c, index) => ({
      left: c.offsetLeft,
      width: c.offsetWidth,
      key: this._displayColumns[index]
    }));
  if (OffsetUtil.areNotEqual(this.prevColumnOffsets, offsets)) {
    this.prevColumnOffsets = offsets;
    this.columnOffsets.emit(offsets);
  }
}
```

## Тестирование

- **№10 (классический TDD):** новый `model/TableViewFactory.spec.ts` — без `valueView`
  возвращается `[]` (red на текущем коде); с `valueView` — Map на строку с подготовленными
  значениями (пин).
- **№8 (регрессионные пины, зелёные до и после):** новый `ngx-aur-mat-table-conditional-defs.spec.ts`:
  (a) с `extraHeaderCellTopTemplate` рендерится `tr.extra-header-top-row` с контентом шаблона;
  (b) без него строки нет; (c) с `extendedRowTemplate` клик по строке раскрывает детали
  (заодно закрывает известный пробел покрытия multiTemplateDataRows); (d) без него
  `tr.expanded-row` отсутствуют.
- **№7/№13:** существующий `ngx-aur-mat-table-column-offsets.spec.ts` (стаб совместим с
  одинарным вызовом) + новый пин: `table` undefined → нет эмиссии и нет краша.
- Полный прогон (95 + новые), `build_lib`, демо.

## Затронутые файлы

- `ngx-aur-mat-table.component.html` — №8 (4 обёртки *ngIf).
- `ngx-aur-mat-table.component.ts` — №13 (поле, ngAfterViewInit, ngOnDestroy), №7 (updateColumnOffsets).
- `model/EmptyValue.ts` — №13 (удалить RESIZE_OBSERVER).
- `model/TableViewFactory.ts` — №10 (ранний выход).
- Создать: `model/TableViewFactory.spec.ts`, `ngx-aur-mat-table-conditional-defs.spec.ts`;
  дополнить `ngx-aur-mat-table-column-offsets.spec.ts`.
- Changelog: запись при выпуске 19.5.0.
