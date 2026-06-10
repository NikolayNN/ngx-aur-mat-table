# Пакет «корректность»: предикат поиска, имя индекс-колонки, стиль .circle

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** три баг-фикса корректности, патч **19.5.1**. Поведение поиска меняется
в сторону правильного (исчезают ложные совпадения) — заметка в changelog.

## 1. Поиск матчит служебные поля (`id`, `rowSrc`)

**Проблема.** `_defaultFilterPredicate` захватывается из MatTableDataSource — его дефолт
конкатенирует ВСЕ собственные ключи объекта строки. Внутренняя обёртка `TableRow` несёт
`id` (порядковый индекс) и `rowSrc` (исходный объект → `"[object Object]"`). Итог: поиск
«1» матчит строку с внутренним id=1; поиск «object» матчит все строки.

**Решение.** Свой предикат по значениям сконфигурированных колонок (та же семантика
«поиск по всем колонкам», тот же разделитель `◬`, что у Material):

```ts
constructor(...) {
  // поиск только по значениям колонок (valueConverter), не по служебным id/rowSrc
  this._defaultFilterPredicate = (data, filter) => this.searchPredicate(data, filter);
}

private searchPredicate(data: TableRow<T>, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  const haystack = this.tableConfig.columnsCfg
    .map(c => data[c.key] ?? '')
    .join('◬')
    .toLowerCase();
  return haystack.includes(needle);
}
```

Захват Material-предиката из конструктора удаляется (поле инициализируется нашим
предикатом). `tableConfig` читается лениво в момент фильтрации — к этому времени он
гарантирован (`ngOnInit` бросает без него) и отражает актуальные колонки.

## 2. `indexCfg.name` никогда не отображается

**Проблема (подтверждена диагностическим тестом: заголовки `["", "Name"]`).** Имя
проецируется внутрь `<lib-column-view>{{ indexProvider.name }}</lib-column-view>`, а в
шаблоне column-view нет `<ng-content>` — проекция гасится.

**Решение.** Передавать как `value` — ровно так же, как заголовки обычных колонок
(`[value]="columnConfig.name"`):

```html
<lib-column-view [config]="indexProvider.headerView" [value]="indexProvider.name">
</lib-column-view>
```

## 3. Мёртвое правило `.circle` (обёртка иконки без размера/скругления)

**Проблема.** Правило `.circle {...}` лежит в `column-view.component.css`, а div с этим
классом рендерится в шаблоне `icon-view` — при emulated encapsulation правило не
применяется: подложка `icon.wrapper` рисуется без 28×28 и border-radius 50%.

**Решение.** Перенести правило в `icon-view.component.css` (сейчас пустой):

```css
.circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
```

Из `column-view.component.css` правило удалить.

## Тестирование (TDD, все red на текущем коде)

1. **Поиск** — в существующий `ngx-aur-mat-table-filtering.spec.ts`:
   - поиск `'1'` (совпадает только с внутренним id) → `[]` (сейчас — строка с id=1);
   - поиск `'object'` → `[]` (сейчас — все строки);
   - пины: `'ali'` → `['Alice']`; `'25'` → `['Bob']` (поиск по всем колонкам жив).
2. **Индекс** — новый `ngx-aur-mat-table-cell-rendering-fixes.spec.ts`: хост с
   `indexCfg: {enable: true, name: 'NN', offset: 1}` → заголовок индекс-колонки `'NN'`
   (red: пусто); пин: первая ячейка индекса `'1'` (offset).
3. **Circle** — там же: хост с `icon.wrapper` → у `div.circle` computed
   `border-radius: 50%` и `height: 28px` (red: 0px/auto).

Плюс полный прогон (104 + новые), `build_lib`, демо.

## Релиз

`projects/ngx-aur-mat-table/package.json` 19.5.0 → **19.5.1**; `changelog/19.5.1.md`
(стиль репо, секция Fixed; заметка: поиск больше не матчит внутренний индекс строки и
плейсхолдеры объектов).

## Затронутые файлы

- `ngx-aur-mat-table.component.ts` — конструктор + `searchPredicate`.
- `ngx-aur-mat-table.component.html` — заголовок индекс-колонки.
- `components/column-value/column-view.component.css` — −`.circle`.
- `components/icon-view/icon-view.component.css` — +`.circle`.
- `ngx-aur-mat-table-filtering.spec.ts` — тесты поиска.
- Создать: `ngx-aur-mat-table-cell-rendering-fixes.spec.ts`.
- `package.json` (lib), `changelog/19.5.1.md`.
