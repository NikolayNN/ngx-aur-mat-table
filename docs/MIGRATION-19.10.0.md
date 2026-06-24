# Миграция на 19.10.0

## Что изменилось

В 19.10.0 удалены четыре `@Input`-привязки `TemplateRef` и заменены
проецируемыми структурными директивами. Шаблоны теперь размещаются **внутри**
`<aur-mat-table>…</aur-mat-table>`, а не снаружи в виде `#-ссылок`.

Кроме того, изменился контекст шаблонов **строкового уровня** (`ngxAurExpandedRowDef`,
`ngxAurRowMarkerDef`): `$implicit` теперь — исходный объект `T`, а не обёртка
`TableRow<T>`.

---

## Breaking 1: доставка шаблона — `[input]="tpl"` → директива внутри тега

| Удалённый `@Input` | Новая директива |
|---|---|
| `[extendedRowTemplate]` | `ngxAurExpandedRowDef` |
| `[timelineMarkerTemplate]` | `ngxAurRowMarkerDef` |
| `[extraHeaderCellTopTemplate]` | `ngxAurExtraHeaderTopDef` |
| `[extraHeaderCellBottomTemplate]` | `ngxAurExtraHeaderBottomDef` |

### `[extendedRowTemplate]` → `ngxAurExpandedRowDef`

```html
<!-- было (≤19.9.x) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg"
               [extendedRowTemplate]="detailTpl">
</aur-mat-table>
<ng-template #detailTpl let-row>
  <div class="detail">{{ row.rowSrc.name }}</div>
</ng-template>

<!-- стало (19.10.0) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurExpandedRowDef let-rowSrc>
    <div class="detail">{{ rowSrc.name }}</div>
  </ng-template>
</aur-mat-table>
```

### `[timelineMarkerTemplate]` → `ngxAurRowMarkerDef`

```html
<!-- было (≤19.9.x) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg"
               [timelineMarkerTemplate]="markerTpl">
</aur-mat-table>
<ng-template #markerTpl let-element>
  <span [class]="element.rowSrc.status"></span>
</ng-template>

<!-- стало (19.10.0) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurRowMarkerDef let-element>
    <span [class]="element.status"></span>
  </ng-template>
</aur-mat-table>
```

### `[extraHeaderCellTopTemplate]` → `ngxAurExtraHeaderTopDef`

```html
<!-- было (≤19.9.x) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg"
               [extraHeaderCellTopTemplate]="topTpl">
</aur-mat-table>
<ng-template #topTpl let-key="key" let-index="index">
  <span>{{ key }} ({{ index }})</span>
</ng-template>

<!-- стало (19.10.0) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurExtraHeaderTopDef let-key="key" let-index="index">
    <span>{{ key }} ({{ index }})</span>
  </ng-template>
</aur-mat-table>
```

### `[extraHeaderCellBottomTemplate]` → `ngxAurExtraHeaderBottomDef`

```html
<!-- было (≤19.9.x) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg"
               [extraHeaderCellBottomTemplate]="bottomTpl">
</aur-mat-table>
<ng-template #bottomTpl let-key="key" let-index="index">
  <div class="footer-cell">{{ key }}</div>
</ng-template>

<!-- стало (19.10.0) -->
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurExtraHeaderBottomDef let-key="key" let-index="index">
    <div class="footer-cell">{{ key }}</div>
  </ng-template>
</aur-mat-table>
```

---

## Breaking 2: контекст строкового шаблона — `$implicit` теперь источник, а не обёртка

Затрагивает только `ngxAurExpandedRowDef` и `ngxAurRowMarkerDef`.

**Было (≤19.9.x):** `$implicit` → `TableRow<T>` (обёртка).
Доступ к исходным данным: `let-row` → `row.rowSrc.field`.

**Стало (19.10.0):** `$implicit` → `T` (исходный объект).
Обёртка доступна как именованная привязка `row`.

### Два пути миграции (оба корректны)

**Вариант А — использовать `$implicit` как исходный объект напрямую:**

```html
<!-- было -->
<ng-template let-row>{{ row.rowSrc.name }}</ng-template>

<!-- стало -->
<ng-template ngxAurExpandedRowDef let-rowSrc>{{ rowSrc.name }}</ng-template>
```

**Вариант Б — сохранить доступ к обёртке через именованную привязку:**

```html
<!-- было -->
<ng-template let-row>{{ row.rowSrc.name }}</ng-template>

<!-- стало — обёртка явно через "row" -->
<ng-template ngxAurExpandedRowDef let-row="row">{{ row.rowSrc.name }}</ng-template>
```

### Timeline marker (`ngxAurRowMarkerDef`)

```html
<!-- было -->
<ng-template #markerTpl let-element>
  <span [class]="element.rowSrc.status"></span>
</ng-template>

<!-- стало — вариант А: $implicit = источник -->
<ng-template ngxAurRowMarkerDef let-element>
  <span [class]="element.status"></span>
</ng-template>

<!-- стало — вариант Б: обёртка явно -->
<ng-template ngxAurRowMarkerDef let-element="row">
  <span [class]="element.rowSrc.status"></span>
</ng-template>
```

### Контекст extra-header — без изменений

Директивы `ngxAurExtraHeaderTopDef` и `ngxAurExtraHeaderBottomDef` сохраняют
прежний контекст `{ key: string; index: number }`. Тело шаблона переписывать
не нужно — достаточно изменить только способ доставки (см. Breaking 1 выше).

---

## Новые экспортируемые типы

```ts
// Контекст строковых директив
interface AurRowContext<T> {
  $implicit: T;       // исходный объект (rowSrc)
  row: TableRow<T>;   // полная обёртка
  rowSrc: T;          // псевдоним $implicit
  index: number;
}

// Контекст extra-header директив
interface AurExtraHeaderContext {
  key: string;
  index: number;
}
```

---

## Чек-лист миграции

- [ ] Удалить `[extendedRowTemplate]`, `[timelineMarkerTemplate]`,
  `[extraHeaderCellTopTemplate]`, `[extraHeaderCellBottomTemplate]` из
  атрибутов `<aur-mat-table>`.
- [ ] Переместить все четыре `<ng-template>` внутрь `<aur-mat-table>` и
  применить соответствующую директиву (`ngxAurExpandedRowDef` и т.д.).
- [ ] Для `ngxAurExpandedRowDef` и `ngxAurRowMarkerDef`: обновить `let-`
  привязки — либо использовать `$implicit` как исходный объект (Вариант А),
  либо добавить `let-x="row"` чтобы получить обёртку (Вариант Б).
- [ ] Для `ngxAurExtraHeaderTopDef`/`ngxAurExtraHeaderBottomDef`: тело
  шаблона не требует изменений — контекст `key`/`index` сохранён.
- [ ] (Опционально) Импортировать `AurRowContext` / `AurExtraHeaderContext`
  для явной типизации шаблонов.
