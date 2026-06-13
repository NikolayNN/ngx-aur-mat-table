# paginationCfg.showFirstLastButtons: управление кнопками «в начало/в конец»

**Дата:** 2026-06-13
**Статус:** Design (одобрен к реализации)
**Тип изменения:** аддитивная фича — новое опциональное поле `PaginationConfig.showFirstLastButtons`.
Default `true` — текущее поведение сохраняется (кнопки видны), никого не ломаем.
**Контекст батча:** пункт 4 фидбека от 2026-06-11 (Andrey Patsko); ветка `feat/19.7.0-feedback`,
коммит на пункт.

## Проблема

У встроенного `<mat-paginator>` атрибут `showFirstLastButtons` захардкожен
(`ngx-aur-mat-table.component.html:516`) — кнопки «в начало/в конец» видны всегда.
Кейс консьюмера: на узких экранах пагинатор не влезает, кнопки нужно скрывать —
значение должно меняться **в рантайме** (breakpoint observer у хоста).

## Решение (зафиксировано с пользователем)

| Решение | Выбор |
|---|---|
| Где живёт флаг | `PaginationConfig.showFirstLastButtons?: boolean` — конфиго-центричный стиль API (фидбек просил именно `paginationCfg`); отдельный `@Input` вне конфига отклонён |
| Default | `true` (кнопки видны) — сохраняет текущее поведение |
| Биндинг | НАПРЯМУЮ к `tableConfig.paginationCfg`, НЕ через `PaginationProvider` |
| Почему не через провайдер | `PaginationProvider` — снапшот, пересобирается только при смене `tableData`; runtime-смена конфига до него не доедет (ограничение config-only-change). Прямой биндинг переоценивается каждый CD |
| `externalPaginator` | хост владеет своим пагинатором и настраивает сам — наш конфиг влияет только на встроенный (JSDoc) |

## Контракт — `model/ColumnConfig.ts`, интерфейс `PaginationConfig`

```ts
export interface PaginationConfig {
  // ... существующие поля ...
  /**
   * Показывать кнопки «в начало/в конец» у встроенного пагинатора. По умолчанию true.
   * Биндится напрямую к конфигу — смена ССЫЛКИ на tableConfig в рантайме (например, по
   * брейкпоинту) скрывает/показывает кнопки без пересборки данных; мутация на месте не сработает.
   * На externalPaginator не влияет — им управляет хост.
   */
  showFirstLastButtons?: boolean;
}
```

## Реализация — `ngx-aur-mat-table.component.html` (~строка 516)

Заменить захардкоженный атрибут на биндинг:

```html
                   (page)="onPageChangeInternal($event)"
                   [showFirstLastButtons]="tableConfig.paginationCfg?.showFirstLastButtons !== false">
```

`!== false` даёт нужный default: `undefined`/`true` → показаны, только явное `false` → скрыты.
Код компонента не меняется.

## Поведение

| `showFirstLastButtons` | Кнопки |
|---|---|
| не задан / `true` | показаны (как сейчас) |
| `false` | скрыты |
| смена ссылки `tableConfig` в рантайме | переоценивается, кнопки скрываются/появляются |
| `externalPaginator` активен | встроенного пагинатора нет — поле не применяется |

## Edge cases

- **Мутация конфига на месте** (без смены ссылки `tableConfig`) кнопки не обновит — то же
  ограничение config-only-change, что и у остальных полей; документировано в JSDoc.
- **`externalPaginator`**: встроенный пагинатор скрыт целиком (`@if !externalPaginator`),
  биндинг не рендерится — конфликта нет.
- **Пагинация выключена** (`paginationCfg.enable: false` или нет конфига): пагинатор не
  рендерится, поле инертно.

## Тесты — новый `ngx-aur-mat-table-paginator-buttons.spec.ts`

1. **Default**: без `showFirstLastButtons` → кнопки first/last есть в DOM
   (`.mat-mdc-paginator-navigation-first` / `...-last`).
2. **Скрыты**: `showFirstLastButtons: false` → этих кнопок в DOM нет.
3. **Runtime**: старт с `false` (кнопок нет) → хост заменяет ссылку `tableConfig` на копию
   с `showFirstLastButtons: true` → после `detectChanges()` кнопки появились.

## Документация

- JSDoc — в контракте выше.
- README: одно предложение в секции пагинации про `showFirstLastButtons`.
- Changelog-запись — при бампе 19.7.0, не в этом коммите.
