# Маркер-классы типов строк + стиль detail-строки (`extendedRowCfg.styleCfg`)

**Дата:** 2026-06-24
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича, обратносовместимо. (1) Библиотека вешает стабильные
неймспейснутые маркер-классы на три типа строк; (2) `ExtendedRowConfig` получает `styleCfg`
для класса/инлайн-стиля detail-`<tr>`. Существующее поведение и вид не меняются.
**Релиз:** 19.13.0 (changelog при бампе). **Ветка:** `feat/row-type-markers`.
**Контекст:** фидбек «Отдельная конфигурация expanded/detail row». Исходно просили
`extendedRowCfg: { hoverCfg, clickCfg, styleCfg }`; по итогам валидации `hoverCfg`/`clickCfg`-флаги
отброшены (управлять на detail-`<tr>` нечем; hover приходит из app/Material CSS, не из библиотеки),
оставлены маркер-классы (для «явно различать три типа») + `styleCfg`.

## Проблема

detail-строка не имеет способа получить свой класс/стиль, а три типа строк нельзя надёжно
различить: только detail несёт маркер, и тот без неймспейса (`expanded-row`).

| Факт | Где |
|---|---|
| detail-`<tr>` — хардкод `class="expanded-row"`, без хука для своего класса/стиля | `ngx-aur-mat-table.component.html:500` |
| data-`<tr>` без стабильного маркера — в тестах селектится «от обратного» `:not(.expanded-row)` | `html:462-474`; `*-expanded-rows.spec.ts`, `*-expanded-row-def.spec.ts` |
| total-`<tr>` без `aur-`-маркера (только потребительский `_totalClass`) | `html:504-508` |
| hover на detail — из app/Material CSS, а не из библиотеки (в SCSS только `:focus-visible`) | `ngx-aur-mat-table.component.scss:161` |
| контент шаблона лежит внутри `<td>` → до `<tr>` не дотягивается (тем более при эмулированной инкапсуляции) | `html:479-495` |
| `extendedRowCfg` несёт `mode`/`multiple`, но не `styleCfg` — асимметрия с `headerRowCfg`/`bodyRowCfg`/`totalRowCfg` | `ColumnConfig.ts:143-159` |

Почему не `hoverCfg`/`clickCfg`: detail-`<tr>` не имеет `(click)`, `rowClick`, highlight, `tabindex` —
управлять кликом нечем; JS-оверлей наведения (`hovered`) навешан только на data-`<tr>`
(`html:470-471`) и до detail не доходит. Унаследованный hover — свойство `<tr>` на уровне CSS;
правильный рычаг — стабильный класс на этом `<tr>`, а не флаг в конфиге.

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Маркер-классы | `aur-data-row` / `aur-expanded-row` / `aur-total-row` на соответствующие `<tr>`; неймспейснутые документированные хуки. Старый `expanded-row` сохраняется (back-compat). |
| Стиль detail | `extendedRowCfg.styleCfg { class, style }` — статично, зеркало `headerRowCfg.styleCfg` (`HeaderStyleConfig`). |
| Применение | `class` → через `[ngClass]` рядом со статичными маркерами; `style` → `[style]` (инлайн, стилизация `<tr>` без глобального CSS/`::ng-deep`). |
| Статично, не per-row | detail-строка — обёртка, не данные. `(row) => …` пока YAGNI; добавим, если реально попросят. |
| Дефолт-постура | нейтральная: библиотека ничего не гасит, текущий вид без изменений; всё opt-in. |
| `clickCfg`/`hoverCfg` на detail | не вводим (см. выше). |
| Совместимость | чисто аддитивно; тестовые селекторы `:not(.expanded-row)` и `tr.mat-mdc-row` остаются валидными. |

## Контракт — `model/ColumnConfig.ts`

```ts
export interface ExtendedRowConfig {
  mode?: 'row-click' | 'controlled' | 'manual';   // как было (19.9.0)
  multiple?: boolean;                               // как было (19.9.0)

  /**
   * Класс/инлайн-стиль на <tr> detail-строки (обёртка строки, НЕ её контент —
   * контент задаётся шаблоном ngxAurExpandedRowDef). Применяется поверх системного
   * маркер-класса aur-expanded-row. Статично (одинаково для всех detail-строк).
   */
  styleCfg?: ExtendedRowStyleConfig;                // ← НОВОЕ
}

export interface ExtendedRowStyleConfig {
  /** CSS-класс(ы) на detail-<tr> (рядом с системными expanded-row / aur-expanded-row). */
  class?: string;
  /** Инлайн-стиль на detail-<tr>; StyleBuilder.Row (собранный/несобранный) или сырая CSS-строка. */
  style?: StyleBuilder.Row | string;
}
```

Форма `ExtendedRowStyleConfig` дословно совпадает с `HeaderStyleConfig` (`ColumnConfig.ts:161-166`) —
отдельный интерфейс ради ясного JSDoc и независимой эволюции detail-строки. Экспортируется через
существующий `export * from './lib/model/ColumnConfig'`.

## Реализация — `ngx-aur-mat-table.component.ts`

Новые поля рядом с `_headerStyle`/`_headerClass`/`_totalStyle`/`_totalClass` (`ts:123-126`):

```ts
_expandedRowStyle: string | null = null;
_expandedRowClass: string | null = null;
```

Заполняются в `initTable()` рядом с header-стилями (`ts:658-659`) — статично, от данных не зависит:

```ts
const _ec = this.tableConfig.extendedRowCfg?.styleCfg;
this._expandedRowStyle = this.toCss(_ec?.style);   // toCss: ts:839-842 (StyleBuilder.Row|string|null → CSS|null)
this._expandedRowClass = _ec?.class ?? null;
```

Никакой новой логики/резолверов: `styleCfg` статичен, считается один раз на пересборку (как header/total).

## Точки изменения в шаблоне — `ngx-aur-mat-table.component.html`

Статичный `class` и `[ngClass]` на одном элементе Angular объединяет — маркеры аддитивны к
существующим биндингам.

- **data-строка** (`:462-474`): на `<tr mat-row #rowLink …>` добавить статичный `class="aur-data-row"`
  (рядом с `[ngClass]="rowNgClass(row)"`).
- **detail-строка** (`:500`):
  `class="expanded-row"` → `class="expanded-row aur-expanded-row"`,
  добавить `[ngClass]="_expandedRowClass"` и `[style]="_expandedRowStyle"`.
- **total/footer-строка** (`:504-508`): на `<tr mat-footer-row …>` добавить статичный
  `class="aur-total-row"` (рядом с `[ngClass]="_totalClass"`).

SCSS не меняется: маркеры — чистые хуки без дефолтного оформления (нейтральная постура).
Существующий блок `.expanded-row` (`scss:64-71`, `height:0` + паддинги `.expanded-cell`) остаётся
на месте — на `<tr>` сохранён старый класс `expanded-row`.

## Маркер-классы — итог

| строка | `<tr>` сейчас | после |
|---|---|---|
| data | `mat-mdc-row` + классы из `rowNgClass` | + `aur-data-row` |
| detail | `expanded-row` (+ `mat-mdc-row`) | + `aur-expanded-row` (+ опц. `styleCfg.class`/`style`) |
| total | `mat-mdc-footer-row` + `_totalClass` | + `aur-total-row` |

Классы дизъюнктны (каждый вешается только на свой `<tr>`): data-строка не получает
`aur-expanded-row`/`aur-total-row` и наоборот.

## Совместимость тестовых селекторов

- `tr[mat-row]:not(.expanded-row)` (выбор data-строк в expanded-спеках) — валиден: data-строки
  по-прежнему без `expanded-row`, добавлен лишь `aur-data-row`.
- `tr.expanded-row` (счёт detail-строк) — валиден: класс сохранён.
- `tr.mat-mdc-row` (не-expanding спеки) — без изменений.

## Edge cases

- **`styleCfg` не задан**: `_expandedRowClass`/`_expandedRowStyle` = `null` → detail-`<tr>` несёт
  только маркеры; `[ngClass]=null`/`[style]=null` инертны. Вид прежний.
- **`style` как `StyleBuilder.Row`**: `toCss()` собирает в CSS-строку (как для header/total).
- **`class` с несколькими классами** (`'a b'`): `[ngClass]` принимает строку с пробелами.
- **detail-шаблон отсутствует**: detail-`<tr>` вообще не рендерится (`*ngIf="expandedRowTemplate"`,
  `:499`) → `styleCfg` неактивен, как и сейчас `mode`/`multiple`.
- **граница строка↔деталь / hover**: решается потребителем по `aur-expanded-row`
  (`tr.aur-expanded-row > td.expanded-cell { border-top: none }`,
  `tr.aur-expanded-row:hover { background: none }`) — без участия библиотеки.

## Тесты — новый `ngx-aur-mat-table-row-type-markers.spec.ts`

Хост с data + total (`totalConverter`) + detail (`ngxAurExpandedRowDef`):

1. **маркеры присутствуют и дизъюнктны**: ровно один тип на строку — data-`<tr>` имеет
   `aur-data-row` и НЕ имеет `aur-expanded-row`/`aur-total-row`; detail — `aur-expanded-row`
   (+ legacy `expanded-row`) и не data/total; footer — `aur-total-row`.
2. **styleCfg.class**: `extendedRowCfg.styleCfg.class = 'detail-row'` → класс на каждом
   detail-`<tr>` рядом с маркерами.
3. **styleCfg.style (строка)**: сырой CSS → присутствует в `style` detail-`<tr>`.
4. **styleCfg.style (StyleBuilder.Row)**: builder собирается в CSS и попадает в `style`.
5. **без styleCfg (регрессия)**: detail-`<tr>` без лишнего класса/инлайн-стиля, только маркеры.
6. **back-compat селекторов**: `tr[mat-row]:not(.expanded-row)` даёт только data-строки;
   `tr.expanded-row` считает detail-строки — числа совпадают с числом данных/раскрытий.
7. **регрессия expanded**: существующие `*-expanded-rows.spec.ts` / `*-expanded-row-def.spec.ts`
   зелёные (маркеры аддитивны).

## Демо — `aur-demo/.../table-expanding-row`

Добавить к существующему примеру `extendedRowCfg.styleCfg` (например, `style` с фоном через
`StyleBuilder.Row`) и короткий блок-пояснение про три маркер-класса с CSS-рецептом гашения hover
и слияния детали с родителем. Контролируемый/multiple примеры не трогаем.

## Документация

- JSDoc — в контракте выше.
- README: новая короткая секция «Типы строк и маркер-классы» (`aur-data-row`/`aur-expanded-row`/
  `aur-total-row` + CSS-рецепты hover/border) и упоминание `extendedRowCfg.styleCfg` в секции
  expanded-row.
- `changelog/19.13.0.md` (Keep-a-Changelog, скилл writing-changelog) — при бампе: «Добавлено»
  (маркеры + `styleCfg`). Бамп `package.json` (`19.11.0` → `19.13.0`) в релизном шаге.

## Верификация

- `npm run build_lib` — чистая компиляция.
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — новые + существующие
  тесты зелёные.

## Риск

Низкий. Зона изменений — один новый интерфейс + поле конфига, два статичных поля компонента,
три точечные правки шаблона; новой логики и резолверов нет, SCSS не трогается, тестовые селекторы
сохранены. Основной риск — случайно повесить маркер не на тот `<tr>`; закрывается тестом
дизъюнктности (п.1).
