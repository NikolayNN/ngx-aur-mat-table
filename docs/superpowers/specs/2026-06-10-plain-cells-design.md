# Простые ячейки без компонентов (колонки без valueView)

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** оптимизация производительности, не ломающая. Квик-вин №3 из обзора
производительности. Релизный носитель — 19.5.0.

## Проблема

Шаблон ячейки один для всех колонок: каждая ячейка инстанцирует `lib-column-view`
(+ внутри `lib-icon-view`), даже когда у колонки нет `valueView` и `config === undefined`.
Структура простой текстовой ячейки сейчас:

```
<td> → <lib-column-view> → <div.align-container(flex)> → <lib-icon-view> → <div(пустой)>
                                                       → <span> → текст
```

2 экземпляра компонентов + 5 элементов вместо `<td>текст</td>`. На таблице 50×10 из
простых колонок: ~1000 экземпляров компонентов, ~2500 лишних DOM-узлов, 500 flex formatting
context-ов. №4 (OnPush) срезал перепроверку; создание/память/разрушение/layout остались —
платим при первом рендере, на каждой серверной странице без trackBy-ключа, при смене
displayColumns. Пустой div-обёртка icon-view сидит и в view-колонках без иконки.

## Решение — три яруса, все ветвления статичны по конфигурации колонки

### 1. td ветвится по `columnConfig.valueView` — главный выигрыш

```html
<lib-column-view *ngIf="columnConfig.valueView; else plainCell"
                 [config]="tableView[element.id]?.get(columnConfig.key)"
                 [value]="element | dataPropertyGetter: columnConfig.key">
</lib-column-view>
<ng-template #plainCell>
  <span class="aur-plain-cell">{{ element | dataPropertyGetter: columnConfig.key }}</span>
</ng-template>
```

**Уточнение против первоначального описания («голая интерполяция»):** в column-view.css
правило `span { margin-left: 4px; }` сдвигает текст всех ячеек и заголовков на 4px.
Голая интерполяция в plain-ветке сместила бы текст простых ячеек на 4px влево относительно
их же заголовков (заголовки рендерятся через lib-column-view со span-ом). Поэтому
plain-ветка рендерит лёгкий `<span class="aur-plain-cell">` (1 элемент, без директив)
с тем же отступом — пиксельная совместимость при тех же экономиях по компонентам.
В `ngx-aur-mat-table.component.scss`:

```scss
.aur-plain-cell {
  margin-left: 4px;
}
```

### 2. column-view: `lib-icon-view` только при иконке

```html
<lib-icon-view *ngIf="config?.icon" [view]="config?.icon">
</lib-icon-view>
```

View-колонки «только текст/картинка» теряют пустой экземпляр IconView и его div.

### 3. icon-view: внешний div под гвардом (защита при прямом использовании)

```html
<div *ngIf="view"
     [ngClass]="{'circle': view.wrapper}"
     [style.background-color]="view.wrapper?.color">
  <ng-container *ngIf="view.visible !== false">
    ... (ветки тултипа из №2, обращения через view. без ?)
  </ng-container>
</div>
```

## Что сознательно не трогаем

- Заголовки (`headerView` через lib-column-view): по одному на колонку, не окупается.
- Пайп `dataPropertyGetter` остаётся (чистый, мемоизированный).
- `span { margin-left: 4px }` в column-view.css — глобальная ревизия отступов вне скоупа.

## Нюансы

- Если внешние стили целились в `lib-column-view`/`.align-container` простых колонок через
  `::ng-deep` — хук исчезнет (отметить в changelog 19.5.0).
- DOM-структура простой ячейки меняется на `<td><span.aur-plain-cell>текст` — визуальная
  паритетность обеспечена тем же margin-left.

## Попутные находки (вне скоупа, отдельные фиксы)

1. Заголовок индекс-колонки проецирует `{{ indexProvider.name }}` внутрь
   `<lib-column-view>`, в шаблоне которого НЕТ `<ng-content>` — имя, судя по коду, не
   отображается. Проверить диагностическим тестом в red-фазе; если подтвердится — отдельный фикс.
2. Правило `.circle {...}` лежит в column-view.css, а div с классом `circle` рендерится в
   шаблоне icon-view — при emulated encapsulation правило мёртвое (размер/скругление
   обёртки иконки не применяются). Проверить отдельно.

## Тестирование (TDD)

Новый spec `ngx-aur-mat-table-plain-cells.spec.ts` (TestBed-хост; колонки plain /
icon-view / text-only-view):

1. Ячейка plain-колонки: нет `lib-column-view`; `<span class="aur-plain-cell">` с текстом значения.
2. Ячейка icon-колонки: `lib-column-view` + `mat-icon` на месте (пин).
3. Ячейка text-only-view-колонки: `lib-column-view` есть, `lib-icon-view` внутри НЕТ.
4. Все `lib-icon-view` в ячейках содержат `mat-icon` (пустых div-обёрток нет) и их ровно
   столько, сколько колонок с иконками.

Red-фаза: 1, 3, 4 падают на текущем коде. Плюс существующий 91 тест (tooltip- и
trackby-спеки уже проверяют textContent/триггеры — сетка), `build_lib`, демо, визуальная
проверка выравнивания в демо.

## Затронутые файлы

- `ngx-aur-mat-table.component.html` — ветка td.
- `ngx-aur-mat-table.component.scss` — `.aur-plain-cell`.
- `components/column-value/column-view.component.html` — *ngIf на lib-icon-view.
- `components/icon-view/icon-view.component.html` — гвард внешнего div.
- Создать: `ngx-aur-mat-table-plain-cells.spec.ts`.
- Changelog: запись при выпуске 19.5.0 (+нюанс про ::ng-deep-хуки).
