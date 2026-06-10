# Удаление неиспользуемого DragDropModule (CDK) из NgxAurMatTableModule

**Дата:** 2026-06-10
**Статус:** Design (одобрен к реализации)
**Тип изменения:** облегчение бандла потребителей, не ломающее. Квик-вин №11 из обзора
производительности. Релизный носитель — следующий минор (19.5.0) вместе с остальными
квик-винами; до релиза изменение живёт на master без bump-а версии.

## Проблема

`@angular/cdk/drag-drop` подключён в `NgxAurMatTableModule`, но не используется нигде
в библиотеке.

**Подтверждение** (`ngx-aur-mat-table.module.ts:18,44` — единственные упоминания):

```ts
import {DragDropModule} from "@angular/cdk/drag-drop";
...
  imports: [
    ...
    DragDropModule,
  ],
```

Греп `cdkDrag|CdkDrag|cdkDropList` по `projects/ngx-aur-mat-table` — ноль совпадений.
Drag-and-drop библиотеки построен на нативных HTML5-событиях (`draggable`,
`(dragstart)/(dragover)/(drop)/(dragend)`) и собственном `AurDragDropManager`;
каталог `drag-drop/` импортирует только `rxjs` и `@angular/core`.

NgModule-импорт — жёсткая ссылка в Ivy-метаданных (`ɵmod.imports`): через неё достижимы
все директивы и сервисы CDK DnD, поэтому tree-shaker не может их выбросить. Каждый
потребитель `NgxAurMatTableModule` получает пакет в initial-бандл, даже если сам CDK DnD
не использует.

**Цена** (замер на установленном `@angular/cdk` 18.2.14):

| Метрика | Размер |
|---|---|
| Сырой ESM `fesm2022/drag-drop.mjs` | ~194 KB |
| Минифицированный собственный код пакета (esbuild, externals: `@angular/*`, `rxjs`) | 66 KB |
| То же + gzip | ~15.8 KB |

## Решение

Удалить две строки из `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`:
импорт (строка 18) и элемент массива `imports` (строка 44). Больше ничего.

## Риски

- Библиотека не ссылается на CDK DnD ни в коде, ни в шаблонах — компиляции ломаться не на чем.
- `DragDropModule` не реэкспортировался (`exports` не затронут), значит потребители не могли
  легально получать его директивы через наш модуль — транзитивных потребителей нет.
- Peer-зависимости не меняются: `@angular/cdk` остаётся peer-ом Material и используется
  библиотекой в других местах (`@angular/cdk/collections` — SelectionModel).

## Важная оговорка для верификации

Демо **не похудеет**: `aur-demo` сам использует `cdkDropList` (пример custom-columns)
и импортирует `DragDropModule` в `app.module.ts:123`. Эффект виден только у потребителей
без собственного CDK DnD (например, locator-front, если не подключает его сам).

## Верификация

1. Тесты библиотеки: 86/86 (поведение не меняется, новых тестов нет — изменение не имеет
   наблюдаемого поведения внутри библиотеки).
2. `npm run build_lib` — AOT-гейт.
3. `npx ng build aur-demo --configuration development` — компиляция потребителя
   (демо продолжает работать со СВОИМ импортом CDK DnD).
4. Греп: `DragDropModule` в `projects/ngx-aur-mat-table` — 0 совпадений.

## Затронутые файлы

- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` — −2 строки.
- Changelog: запись добавить при выпуске следующего минора (19.5.0), вместе с остальными
  квик-винами.
