# Нейтральный disabled-стиль иконок действий (M1 — условие в шаблоне)

**Дата:** 2026-06-29
**Статус:** Design (одобрен к реализации)
**Тип изменения:** Fix UX-поведения. Публичный API не меняется (`Action`/`MenuItem`
уже имеют `disabled` и `icon.color`); меняется только вид disabled-элементов,
у которых задан `icon.color`.
**Контекст батча:** Spec B из батча отзывов по `actionCfg` (сбор 2026-06-29),
ветка `fix/19.17.0-actioncfg`. Закрывает отзыв **#2**. Spec A (фикс устаревших/пустых
action-ячеек через `trackBy`, отзывы #1/#3) уже готов на этой же ветке. Оба спека
целятся в один minor-бамп 19.17.0.

---

## Проблема

`Action.disabled` функционально работает (дизайн 2026-06-15): disabled-кнопка
остаётся видимой, `[disabled]` блокирует клик/открытие меню, tooltip висит на
span-обёртке. Но **визуальное** disabled-состояние не гарантировано.

Иконки действий рендерятся сырым `<mat-icon [style.color]="...icon.color">` (НЕ через
`lib-icon-view` — по решению дизайна 2026-06-15). Inline `style.color` имеет приоритет
над оформлением Material для disabled (классовые токены). Поэтому action со стандартным
`icon.color` (например синий `copy`, красный `delete`) при `disabled: true` остаётся
видимым, не реагирует на клик — **но выглядит активным** (цветным).

Затронутые точки шаблона `ngx-aur-mat-table.component.html` (по 1 иконке на вариант):
- `:281` — кнопка-триггер меню, ветка с тултипом;
- `:289` — кнопка-триггер меню, ветка без тултипа;
- `:307` — прямое действие, ветка с тултипом;
- `:316` — прямое действие, ветка без тултипа;
- `:267` — пункт меню (`MenuItem.disabled` + `item.icon.color`) — та же проблема.

SCSS-правила под disabled-иконки нет. Тулбар выделения (`:208`, `selectionCfg.actions`)
тоже рисует `<mat-icon [style.color]>`, но `disabled` там **не проброшен вообще** —
отдельный пробел, вне области этого спека.

### Ожидаемое поведение

- `visible: false` — скрывает действие (уже так);
- `disabled: true` — оставляет действие видимым, блокирует взаимодействие (уже так)
  **И автоматически применяет нейтральный disabled-стиль иконке, независимо от её
  обычного `icon.color`**. Без CSS/`::ng-deep` у потребителя.

«Нейтральный» = тема-зависимый disabled-цвет Material (по умолчанию ~38% серого),
а не хардкод.

---

## Решение (M1 — выбрано с пользователем)

Цвет иконки в шаблоне берём через хелпер, который при `disabled` возвращает `null`.
При `null` Angular не ставит inline-стиль `color`, и `<mat-icon>` наследует нейтральный
disabled-цвет родительской кнопки/пункта меню Material (тема-зависимый токен).

### Хелпер — `ngx-aur-mat-table.component.ts`

Рядом с прочими template-хелперами:

```ts
/** Цвет иконки действия/пункта меню: при disabled — null, чтобы не перекрывать
 *  своим icon.color нейтральный disabled-цвет Material (иначе disabled-кнопка
 *  выглядит активной). Принимает и Action, и MenuItem (структурная типизация):
 *  у Action icon обязателен, у MenuItem icon опционален (в шаблоне под *ngIf). */
iconColorOf(el: { disabled?: boolean; icon?: { color?: string } }): string | null {
  return el.disabled ? null : (el.icon?.color ?? null);
}
```

Возврат `string | null`; `null` (а не `undefined`) — явный «убрать стиль», семантика
для `[style.color]` идентична.

### Шаблон — `ngx-aur-mat-table.component.html` (5 точек)

| Строка | Было | Стало |
|--------|------|-------|
| `:281` | `[style.color]="action.icon.color"` | `[style.color]="iconColorOf(action)"` |
| `:289` | `[style.color]="action.icon.color"` | `[style.color]="iconColorOf(action)"` |
| `:307` | `[style.color]="action.icon.color"` | `[style.color]="iconColorOf(action)"` |
| `:316` | `[style.color]="action.icon.color"` | `[style.color]="iconColorOf(action)"` |
| `:267` | `[style.color]="item.icon.color"`   | `[style.color]="iconColorOf(item)"`   |

Остальная разметка action-колонки и пунктов меню не меняется. Тулбар выделения (`:208`)
не трогаем.

### Отвергнутые альтернативы

- **M2 — гасить цвет в `ActionViewFactory`** (`icon.color = undefined` при `disabled`):
  DRY, но смешивает данные и презентацию во view-модели и требует прокинуть `disabled`
  в `prepareIconConfig`, который его не получает. Фабрика должна оставаться чистой
  резолвилкой данных.
- **M3 — CSS-правило с токеном + `!important`:** перебивает inline-цвет, но `!important`
  — смелл, селекторы к внутренностям Material хрупкие, inline-цвет остаётся в DOM
  (визуально перебит) → хуже тестируется. Отклонено.

---

## Тесты

Расширить `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-disabled.spec.ts`:
новый `describe` + host-компонент(ы) с **явными селекторами** (избегаем NG0912, как в
Spec A; существующие хосты файла не трогаем). Конвенция файла: `standalone:false`,
`NgxAurMatTableModule` + `NoopAnimationsModule`, селекторы `tr.mat-mdc-row` / `button` /
`mat-icon`, описания на русском.

Контракт-утверждение: **наличие/отсутствие inline `style.color`**, НЕ вычисленный цвет
(устойчиво к теме и версии Material).

1. **Прямое действие, disabled + цвет:** `disabled: () => true`, `icon.color: () => 'red'`
   → у `<mat-icon>` строки `style.color === ''` (inline-цвет не выставлен).
2. **Прямое действие, enabled + цвет:** `disabled` не задан, `icon.color: () => 'red'`
   → `style.color === 'red'` (обычный цвет не сломан — регрессия-страж).
3. **Пункт меню, disabled + цвет:** action с `menu`, у пункта `disabled: () => true` +
   `icon.color: () => 'red'`; кнопка-триггер активна, меню открываем кликом → у иконки
   пункта `style.color === ''`. (Контр-кейс: enabled-пункт с цветом → цвет на месте.)
4. **Кнопка-триггер меню, disabled + цвет:** action с `menu`, `disabled: () => true`,
   `icon.color` на иконке триггера → у иконки триггера `style.color === ''`.

TDD: кейсы 1/3/4 красные на текущем коде (inline-цвет стоит при disabled) → зелёные
после правки; кейс 2 зелёный всегда (страж от регрессии обычного цвета).

---

## Edge cases

- **`disabled` не задан / `false`** → enabled → цвет применяется как раньше.
- **`icon.color` не задан + disabled** → и так нет цвета; поведение не меняется
  (наследует нейтральный disabled-цвет).
- **Пункт меню без `icon`** → внешний `*ngIf="item.icon"` не рендерит `<mat-icon>`,
  `iconColorOf` на нём не вызывается.
- **Тултип-обёртка disabled-кнопки** (span, дизайн 2026-06-15) — не трогаем.
- **Тема** — нейтральный цвет берётся из Material disabled-токена кнопки/пункта
  (light/dark), не хардкодится. Контракт теста (нет inline-цвета) тема-независим;
  визуальную нейтральность обеспечивает Material через наследование. Если на TDD-шаге
  обнаружится, что Material не перекрашивает `<mat-icon>` при disabled (маловероятно —
  `mat-icon-button[disabled]`/`mat-menu-item[disabled]` задают disabled-цвет, иконка
  наследует), запасной план — точечный SCSS-guard; в основной объём не входит.

---

## Вне области

- Проброс `disabled` в тулбар выделения (`selectionCfg.actions`) — отдельный пробел.
- Любые правки `ActionViewFactory` (M2 отклонён).

---

## Версия / документация

- Войдёт в minor 19.17.0 (вместе со Spec A) записью чейнджлога типа `fix`.
- README — опциональное одно предложение в секции про actions/disabled.
- Миграции нет (публичный API не меняется).
