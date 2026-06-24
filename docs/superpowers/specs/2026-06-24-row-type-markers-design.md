# Маркер-классы типов строк (data / expanded / total)

**Дата:** 2026-06-24
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича, обратносовместимо. Библиотека вешает стабильные
неймспейснутые маркер-классы на три типа строк (`aur-data-row` / `aur-expanded-row` /
`aur-total-row`). Только правки шаблона + доки — без нового публичного TS-API, без логики в
компоненте, без SCSS. Существующее поведение и вид не меняются.
**Релиз:** 19.13.0 (changelog при бампе). **Ветка:** `feat/row-type-markers`.
**Контекст:** фидбек «Отдельная конфигурация expanded/detail row». Исходно просили
`extendedRowCfg: { hoverCfg, clickCfg, styleCfg }`. По итогам валидации всё три отброшены:

- `hoverCfg`/`clickCfg`-флаги — на detail-`<tr>` управлять нечем (нет click/highlight/tabindex),
  а hover приходит из app/Material CSS, не из библиотеки;
- `styleCfg` — на detail-`<tr>` не достаёт до главных кейсов: разделитель строка↔деталь — это
  `border-bottom` ячеек **родительской** data-строки; hover инлайном не задать (`:hover` в `[style]`
  невозможен); `class` дублирует маркер. Уникального — только инлайн-фон без внешнего CSS, что не
  оправдывает API и вводит в заблуждение.

Итог — единственный механизм: **стабильные маркер-классы** на три `<tr>`. Этого достаточно и для
«явно различать три типа», и для нейтрализации унаследованного hover / стилизации детали обычным CSS.

## Проблема

Три типа строк нельзя надёжно различить в CSS/тестах: стабильный маркер есть только у detail, и тот
без неймспейса (`expanded-row`); у data- и total-строк своего `aur-`-класса нет.

| Факт | Где |
|---|---|
| detail-`<tr>` — хардкод `class="expanded-row"` (без неймспейса) | `ngx-aur-mat-table.component.html:500` |
| data-`<tr>` без стабильного маркера — в тестах селектится «от обратного» `:not(.expanded-row)` | `html:462-474`; `*-expanded-rows.spec.ts`, `*-expanded-row-def.spec.ts` |
| total-`<tr>` без `aur-`-маркера (только потребительский `_totalClass`) | `html:504-508` |
| hover на detail — из app/Material CSS, не из библиотеки (в SCSS только `:focus-visible`); контент шаблона внутри `<td>` до `<tr>` не достаёт | `scss:161`, `html:479-495` |

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Механизм | Только маркер-классы; нового TS-API (`styleCfg`/`hoverCfg`/`clickCfg`) не вводим. |
| Имена | `aur-data-row` / `aur-expanded-row` / `aur-total-row` — неймспейснутые документированные хуки. |
| Back-compat | Старый `expanded-row` на detail-`<tr>` сохраняется (тесты, анимация). |
| Постура | Нейтральная: библиотека маркерам оформления не даёт, текущий вид без изменений; стилизация — на стороне потребителя. |
| Покрытие фидбека | «различать три типа» → три класса; «убрать hover / стилизовать деталь» → обычный CSS по `aur-expanded-row`. Кастомный класс из конфига не нужен — целятся прямо в маркер. |

## Точки изменения — `ngx-aur-mat-table.component.html`

Статичный `class` и `[ngClass]` на одном элементе Angular объединяет — маркеры аддитивны к
существующим биндингам. Три точечные правки:

- **data-строка** (`:462-474`): на `<tr mat-row #rowLink …>` добавить статичный `class="aur-data-row"`
  (рядом с `[ngClass]="rowNgClass(row)"`).
- **detail-строка** (`:500`): `class="expanded-row"` → `class="expanded-row aur-expanded-row"`.
- **total/footer-строка** (`:504-508`): на `<tr mat-footer-row …>` добавить статичный
  `class="aur-total-row"` (рядом с `[ngClass]="_totalClass"`).

`ColumnConfig.ts`, `ngx-aur-mat-table.component.ts` и SCSS — **без изменений**. Маркеры — чистые хуки
без дефолтного оформления; существующий блок `.expanded-row` (`scss:64-71`) остаётся (класс на `<tr>`
сохранён).

## Маркер-классы — итог

| строка | `<tr>` сейчас | после |
|---|---|---|
| data | `mat-mdc-row` + классы из `rowNgClass` | + `aur-data-row` |
| detail | `expanded-row` (+ `mat-mdc-row`) | + `aur-expanded-row` |
| total | `mat-mdc-footer-row` + `_totalClass` | + `aur-total-row` |

Классы дизъюнктны — каждый вешается только на свой `<tr>`: data-строка не получает
`aur-expanded-row`/`aur-total-row`, и наоборот. (data- и detail-`<tr>` оба остаются `mat-mdc-row`
от Material — различает именно маркер.)

## Рецепты для потребителя (в README)

```css
/* погасить унаследованный hover на детали (в своём stylesheet — перебьёт app/Material по порядку) */
tr.aur-expanded-row:hover { background: none; }

/* фон «ящика» детали + убрать её нижнюю границу */
tr.aur-expanded-row { background: #fafafa; }
tr.aur-expanded-row td.expanded-cell { border-bottom: none; }

/* различать типы под свой дизайн */
tr.aur-total-row { font-weight: 600; }
```

Свёрнутая деталь — `height:0`, hover на ней и так не срабатывает; маркер нужен для развёрнутой.

**Вне скоупа:** «слить деталь с родительской строкой» (убрать разделитель *между* ними) — это
`border-bottom` ячеек родительской data-строки, и для точечного применения нужен признак «строка
раскрыта», которого как класса сейчас нет. Если понадобится — отдельная маленькая фича
(expand-state класс на паре строк); в этот объём не входит.

## Совместимость тестовых селекторов

- `tr[mat-row]:not(.expanded-row)` (выбор data-строк) — валиден: data-строки по-прежнему без
  `expanded-row`, добавлен лишь `aur-data-row`.
- `tr.expanded-row` (счёт detail-строк) — валиден: класс сохранён.
- `tr.mat-mdc-row` (не-expanding спеки) — без изменений.

## Тесты — новый `ngx-aur-mat-table-row-type-markers.spec.ts`

Хост с data + total (`totalConverter`) + detail (`ngxAurExpandedRowDef`):

1. **присутствие маркеров**: data-`<tr>` имеет `aur-data-row`; detail-`<tr>` — `aur-expanded-row`
   (+ legacy `expanded-row`); footer-`<tr>` — `aur-total-row`.
2. **дизъюнктность**: data НЕ имеет `aur-expanded-row`/`aur-total-row`; detail НЕ имеет
   `aur-data-row`/`aur-total-row`; footer НЕ имеет `aur-data-row`/`aur-expanded-row`.
3. **back-compat селекторов**: `tr[mat-row]:not(.expanded-row)` даёт только data-строки;
   `tr.expanded-row` считает detail-строки.
4. **регрессия expanded**: существующие `*-expanded-rows.spec.ts` / `*-expanded-row-def.spec.ts`
   зелёные (маркеры аддитивны, число строк не изменилось).

## Демо — `aur-demo/.../table-expanding-row`

Добавить короткий блок-пояснение про три маркер-класса + один наглядный CSS-рецепт в SCSS демо
(например, фон детали и сброс hover по `aur-expanded-row`). Конфиги примеров не трогаем — фича
чисто CSS-уровня.

## Документация

- README: новая короткая секция «Типы строк и маркер-классы» — таблица трёх классов + CSS-рецепты
  (hover/фон/границы). JSDoc не меняется (нового TS-API нет).
- `changelog/19.13.0.md` (Keep-a-Changelog, скилл writing-changelog) — при бампе, секция «Добавлено»
  (три маркер-класса). Бамп `package.json` (`19.11.0` → `19.13.0`) в релизном шаге.

## Верификация

- `npm run build_lib` — чистая компиляция.
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — новый + существующие тесты
  зелёные.

## Риск

Очень низкий. Изменения — три статичных `class`-атрибута в шаблоне + доки/тест. Нет нового TS-API,
логики, резолверов; SCSS и `ColumnConfig` не трогаются; тестовые селекторы (`:not(.expanded-row)`,
`tr.mat-mdc-row`) сохранены. Единственный риск — повесить маркер не на тот `<tr>`; закрывается тестом
дизъюнктности (п.2).
