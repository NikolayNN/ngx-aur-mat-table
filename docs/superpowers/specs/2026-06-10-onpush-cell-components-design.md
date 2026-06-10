# OnPush для ColumnViewComponent / IconViewComponent

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** оптимизация производительности, не ломающая. Квик-вин №4 из обзора
производительности. Релизный носитель — следующий минор (19.5.0), как и №11.

## Проблема

`ColumnViewComponent` (`components/column-value/column-view.component.ts`) и
`IconViewComponent` (`components/icon-view/icon-view.component.ts`) не задают стратегию
change detection → работают в `Default`. Таблица — `OnPush`, но Default-дети проверяются
при КАЖДОЙ проверке родителя, безусловно.

Каждый цикл CD таблицы (mouseenter/mouseleave на каждой строке, клик, чекбокс, сортировка,
клавиша поиска, `markForCheck` серверного контроллера) заново вычисляет шаблоны всех
экземпляров: на таблице 50×10 это ~500 `ColumnViewComponent` + ~500 `IconViewComponent`,
≈5–7 тыс. вычислений привязок и ~500 аллокаций ngClass-литерала
(`{'circle': view?.wrapper}`) за цикл, плюс `toString()` для matTooltip в каждой ячейке.
Прогон мыши через десять строк — 20 циклов ≈ 100–140 тыс. вычислений впустую.

## Решение

`changeDetection: ChangeDetectionStrategy.OnPush` в оба декоратора (+ импорт). Больше ничего.

OnPush корректен — ссылки инпутов стабильны между циклами:

| Инпут | Источник | Стабильность |
|---|---|---|
| `config` (ячейка) | `tableView[element.id]?.get(key)` — создаётся раз за refresh в `TableViewFactory` | та же ссылка до следующего refresh; без `valueView` — стабильный `undefined` |
| `value` | чистый пайп `dataPropertyGetter` | мемоизирован, пересчёт только при смене `element` |
| `view` (icon-view) | `config?.icon` — подобъект того же view-объекта | та же ссылка |
| `config` (заголовок) | `columnConfig.headerView` из пользовательского конфига | та же ссылка |

При обновлении данных `tableView` пересоздаётся → новые ссылки → OnPush-дети проверяются.
Путь «смена данных → обновление контента ячейки» уже закреплён DOM-тестом
(business-key trackBy: `b → b2`).

Компоненты без внутреннего состояния/подписок/таймеров; `MatTooltip` управляет своим
оверлеем сам и продолжает работать под OnPush.

## Поведенческий нюанс (в changelog 19.5.0)

In-place мутация пользовательского `headerView` (например, `headerView.icon.color = ...`
без пересоздания объекта) перестанет подхватываться на ближайшем CD — потребуется новый
объект конфига + refresh (легальный путь, работает как прежде). Для ячеечных view мутация
снаружи невозможна: их объекты создаёт библиотека из резолверов, ссылки наружу не отдаются.

## Чего фикс не даёт

Привязки в шаблоне самой таблицы (`tableView[element.id]?.get(...)`, identity-проверки
пайпа) продолжают вычисляться каждый цикл — они дёшевы. Полное устранение CD-штормов от
hover — отдельный №5; №4 уменьшает цену каждого шторма ~на порядок.

## Верификация

1. Тесты библиотеки: 86/86 (DOM-спеки рендерят ячейки и проверяют обновление контента
   после refresh — регрессионная сетка для OnPush).
2. `npm run build_lib`.
3. `npx ng build aur-demo --configuration development`.
4. Ручная проверка демо: иконки/тултипы/картинки в ячейках, обновление значений после
   смены данных.

## Затронутые файлы

- `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.ts` — +OnPush.
- `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.ts` — +OnPush.
- Changelog: запись при выпуске 19.5.0.
