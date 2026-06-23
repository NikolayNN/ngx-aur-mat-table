# Явное отключение интерактивности строки (`clickCfg.enable`)

**Дата:** 2026-06-23
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича — новое поле `ClickConfig.enable?: boolean`.
Обратносовместимо: дефолт не меняется (строка интерактивна), вводится только явный opt-out.
**Контекст:** пункт 1 фидбека «Явное отключение row click». Ветка `feat/row-click-disable`.

## Проблема

Наличие таблицы автоматически означает интерактивную строку, и три поведения — `rowClick`,
внутренний highlight и авто-раскрытие expanded-row — связаны вместе и не выключаются.

Подтверждено в коде:

| Поведение | Где | Когда срабатывает сейчас |
|---|---|---|
| `rowClick` эмитится | `handleRowClick` (`component.ts:807`), биндинг `(click)` (`html:461`) | **всегда**, даже без `bodyRowCfg`/`clickCfg` |
| внутренний `highlighted` меняется | `handleRowClick:810,813` | **всегда** |
| авто-раскрытие expanded-row | `html:477,486` — завязано только на `highlighted` | **всегда** (когда задан `extendedRowTemplate`) |
| keyboard Enter/Space | `handleRowKeydown:823` (делегирует в `handleRowClick`) | по факту только когда строка фокусируема (есть `tabindex`) |
| `tabindex` | `html:463` → `_rowsInteractive = !!clickCfg` (`:520`) | только когда задан `clickCfg` |

То есть мышиный клик безусловен (эмит/подсветка/раскрытие работают без какой-либо конфигурации),
а `tabindex`/клавиатура — по присутствию `clickCfg`. Способа выключить интерактивность нет.

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Семантика | **Opt-out, дефолт не меняется.** Вводим `clickCfg.enable?: boolean`; `false` полностью выключает интерактивность строки. Не-breaking. |
| Гранулярность | **Один рубильник (всё-или-ничего).** Раздельные флаги (`emit`/`highlight`/`expandOnClick`) НЕ вводим — все 5 критериев описывают полное выключение. При необходимости добавятся аддитивно позже. |
| `role` | **НЕ добавляем.** Сейчас роли на строке нет; `<tr mat-row>` несёт неявную грид-роль `row` от Material — `role="button"` сломал бы табличную семантику. Критерий «при `enable: false` нет role» выполняется сам собой. |
| Внешний `[highlight]`-инпут | Не трогаем: `handleHighlightChange` пишет `highlighted` мимо `handleRowClick`, поэтому программное раскрытие сохраняется и при `enable: false`. Выключается только клик-путь («*автоматически* не переключается»). |

### Классификация по модели `enable` (см. `2026-06-05-enable-consistency-design.md`)

`clickCfg` — **гибрид**, как и `HoverConfig` (Group 2):

- **Клик-путь** (`handleRowClick`: `rowClick`, highlight, авто-раскрытие, клавиатура через делегирование)
  — Group 2: «включён сигналом, а не присутствием конфига». Клик работает и без `clickCfg`,
  поэтому `enable` здесь — **чистый opt-out** (`enable !== false`), отсутствие конфига ≠ выкл.
- **A11y-аффордансы** (`tabindex`) — presence-based: появляются только когда `clickCfg` задан.
  Предикат — `isFeatureEnabled(clickCfg)` (присутствие И `enable !== false`).

Эта асимметрия предикатов **намеренная** и в точности сохраняет текущее поведение для всех
существующих конфигов; `enable: false` чисто гасит обе половины.

## Контракт — `model/ColumnConfig.ts`

В `ClickConfig` добавляется поле (порядок: `enable` первым, как у соседних конфигов):

```ts
export interface ClickConfig<T = any> {
  /**
   * Интерактивность строки: клик-обработчик, rowClick, внутренний highlight,
   * авто-раскрытие, tabindex/клавиатурная активация.
   * Строка интерактивна по умолчанию; `enable: false` полностью выключает.
   * Прим.: клик работает и без clickCfg (флаг нужен именно чтобы выключить);
   * tabindex/клавиатура появляются только когда clickCfg задан.
   */
  enable?: boolean;
  styleCfg?: ClickStyleConfig<T>;
  cancelable?: boolean;
}
```

## Реализация — `ngx-aur-mat-table.component.ts`

**1. Гейт клик-пути в единственной точке** (`handleRowClick`, `:807`). `handleRowKeydown`
делегирует сюда же, поэтому одна проверка покрывает мышь, клавиатуру, highlight и авто-раскрытие
(оно завязано только на `highlighted`):

```ts
handleRowClick(row: TableRow<T>) {
  if (this.tableConfig.bodyRowCfg?.clickCfg?.enable === false) return;
  // ...без изменений
}
```

**2. A11y-аффордансы через конвенцию** (`initTable`, `:520`):

```ts
// было: this._rowsInteractive = !!this.tableConfig.bodyRowCfg?.clickCfg;
this._rowsInteractive = isFeatureEnabledFn(this.tableConfig.bodyRowCfg?.clickCfg);
```

`isFeatureEnabledFn` уже импортирован (`component.ts:53`). Это снимает `tabindex`
(`html:463` уже завязан на `_rowsInteractive`). **Шаблон и SCSS не меняются.**

## Матрица поведения (доказательство не-breaking)

| Конфиг | клик-путь (`enable !== false`) | `_rowsInteractive`=`isFeatureEnabled` | Итог |
|---|---|---|---|
| нет `clickCfg` | true (как сейчас) | false (как сейчас) | мышь работает, нет tabindex — **как сейчас** |
| `clickCfg` без `enable` | true | true | полностью интерактивна — **как сейчас** |
| `clickCfg: { enable: false }` | **false** | **false** | полностью неинтерактивна — **новое** |
| `clickCfg: { enable: true }` | true | true | полностью интерактивна |

Единственная новая ветка — `enable: false`; раньше её не существовало, поэтому регрессий нет.

## Edge cases

- **`enable: false` + `extendedRowTemplate`**: клик не раскрывает; внешний `[highlight]`-инпут
  по-прежнему раскрывает (программный путь сохранён).
- **`enable: false` + `cancelable`**: `cancelable` не достигается (ранний `return`); это ОК —
  toggle-логика подчинена интерактивности.
- **`enable: false` + вложенные интерактивы** (чекбокс выделения, кнопки действий): работают как
  раньше — у них собственные `(click)` со `stopPropagation` (`html:218,250`), они не зависят от
  клик-пути строки.
- **keydown при `enable: false`**: `tabindex` отсутствует → строка нефокусируема → keydown с самой
  строки не приходит; даже если придёт (всплытие), делегирование в гейтнутый `handleRowClick` ничего
  не делает.

## Тесты — новый `ngx-aur-mat-table-row-click-disable.spec.ts`

Хост с `bodyRowCfg: { clickCfg: { enable: false } }`, `extendedRowTemplate` для проверки раскрытия:

1. **клик не эмитит и не подсвечивает**: клик по строке → `rowClick` не выстрелил,
   нет `aria-current`, `highlighted` не изменился.
2. **нет авто-раскрытия**: клик → expanded-row остаётся COLLAPSED (нет лениво вставленного контента
   детали / состояние `collapsed`).
3. **нет `tabindex`**: у `tr[mat-row]` нет атрибута `tabindex`.
4. **клавиатура не активирует**: Enter/Space на строке → `rowClick` не выстрелил.
5. **Регрессия**: `clickCfg` без `enable` (или `enable: true`) → клик эмитит, ставит `aria-current`,
   `tabindex="0"` (дублирует существующий a11y-spec, закрепляем явно).
6. **Регрессия мыши без конфига**: таблица без `clickCfg` → клик по-прежнему эмитит `rowClick`
   (поведение Group 2 не сломано).

Существующий `ngx-aur-mat-table-a11y.spec.ts` должен продолжать проходить без правок.

## Документация

- JSDoc — в контракте выше.
- README: одно предложение в секции body-row/clickCfg — `clickCfg: { enable: false }`
  делает строку полностью неинтерактивной (нет rowClick/подсветки/раскрытия/tabindex).
- Changelog-запись — при бампе версии, не в этом коммите.

## Верификация

- `npm run build_lib` компилируется чисто.
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — новые + существующие тесты зелёные.

## Риск

Низкий. Зона изменений — одно поле в `ClickConfig` и две строки в `component.ts`; шаблон не трогаем.
Главная тонкость — асимметрия предикатов (клик-путь = opt-out Group 2, `tabindex` = presence
Group 1), задокументирована матрицей выше и сохраняет текущее поведение во всех ветках, кроме новой
`enable: false`.
