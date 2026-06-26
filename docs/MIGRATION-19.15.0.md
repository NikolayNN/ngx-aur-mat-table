# Миграция на 19.15.0

В 19.15.0 добавлен управляемый highlight (`highlightCfg` + two-way `[(highlightedRow)]`),
и в этом же релизе **удалён устаревший способ настройки подсветки** (без fallback).
Ниже — три breaking-изменения и как мигрировать. Если вы не использовали `[highlight]`,
`clickCfg.cancelable` и `clickCfg.styleCfg` — менять ничего не нужно.

## `[highlight]` / `HighlightContainer` удалены (breaking)

Внешний инпут `[highlight]` (с обёрткой `HighlightContainer`) заменён на выделенную
two-way пару `[(highlightedRow)]` / `(highlightedRowChange)`. Значение теперь передаётся
напрямую (`T | null`), без контейнера; программная установка по-прежнему скроллит строку
в видимую область.

**Было (≤19.14.x):**

```ts
// компонент
highlighted!: HighlightContainer<Customer>;
// установка: this.highlighted = { value: row };
```

```html
<aur-mat-table [highlight]="highlighted" ...></aur-mat-table>
```

**Стало (19.15.0):**

```ts
// компонент
highlighted: Customer | null = null;
// установка: this.highlighted = row;
// tableConfig.bodyRowCfg.highlightCfg = { mode: 'controlled' };
```

```html
<aur-mat-table [(highlightedRow)]="highlighted" ...></aur-mat-table>
```

Выберите режим в `highlightCfg.mode`:
- `'row-click'` (по умолчанию) — таблица владеет состоянием, клик подсвечивает. `[highlightedRow]`
  служит начальным seed.
- `'controlled'` — источник правды снаружи: клик шлёт `(highlightedRowChange)`, контейнер
  применяет через `[highlightedRow]` (ближайший аналог старого внешнего управления).
- `'manual'` — подсветка только из `[highlightedRow]`, клик её не меняет (но `(rowClick)` летит).

## `clickCfg.cancelable` удалён (breaking)

Переехал в `highlightCfg.cancelable` (та же семантика: повторный клик снимает подсветку).

**Было:**

```ts
bodyRowCfg: { clickCfg: { cancelable: true } }
```

**Стало:**

```ts
bodyRowCfg: { highlightCfg: { cancelable: true } }
```

## `clickCfg.styleCfg` (и тип `ClickStyleConfig`) удалены (breaking)

Стиль/класс подсвеченной строки переехал в `highlightCfg.styleCfg` (ключи `style` / `class`
не изменились). Тип `ClickStyleConfig` заменён на `HighlightStyleConfig`.

**Было:**

```ts
bodyRowCfg: {
  clickCfg: {
    styleCfg: { class: 'is-selected', style: StyleBuilder.Row.builder().background('blue') },
  },
}
```

**Стало:**

```ts
bodyRowCfg: {
  highlightCfg: {
    styleCfg: { class: 'is-selected', style: StyleBuilder.Row.builder().background('blue') },
  },
}
```

## Что НЕ изменилось

- `clickCfg.enable` остался — это гейт интерактивности строки (tabindex/клавиатура/клик),
  он не относится к подсветке. Если у вас был `clickCfg: { enable: false, styleCfg: {...} }`,
  оставьте `clickCfg: { enable: false }` и перенесите `styleCfg`/`cancelable` в `highlightCfg`.
- Дефолтное поведение подсветки по клику (режим `row-click`) сохранено.
