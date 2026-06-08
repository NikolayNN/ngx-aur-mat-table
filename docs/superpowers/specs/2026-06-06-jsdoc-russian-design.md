# Design: unify all library comments to Russian (#7)

**Date:** 2026-06-06
**Target version:** docs-only, no version bump (branch `docs/jsdoc-russian`)
**Status:** Approved

## Problem

Recommendation #7. The library's comments are a RU/EN mix. Most JSDoc drifted to
English over the 19.x releases (e.g. `IconView` "icon name", `ColumnConfig.name`
"column title text"), while older blocks stayed Russian (e.g. `TableConfig` fields
"имя таблицы…", "Настройка колонок"). The mix is inconsistent and looks unfinished
in IDE hover tooltips.

## Decision

**Unify every comment in the library to Russian.** This deliberately reverses the
English drift; the audience is Russian-speaking (the `locator-front` consumer, the
original RU comments). Pure cosmetic, non-breaking, no behavior or signature change.

### Scope

- **In scope:** every non-spec `*.ts` file under
  `projects/ngx-aur-mat-table/src/lib/`. Both JSDoc `/** … */` blocks **and** inline
  `//` comments are translated to Russian.
- **Out of scope:**
  - `*.spec.ts` test files (not shipped, developer-facing only).
  - The `projects/aur-demo` project (example app, separate concern).
  - HTML/SCSS template comments (rare; not JSDoc; leave as-is).
  - Code identifiers, string literals, `@param`/`@returns` *tag names*, type names —
    only the human-readable comment **prose** is translated, never code.

### Translation rules

1. Translate the prose only. Keep JSDoc structure intact: `@param name`,
   `@returns`, `@example`, `{@link …}`, tag order, and the identifier after a tag
   stay verbatim — only the description text after them becomes Russian.
2. Keep code, type names, config keys, CSS class names, and inline code spans
   (`` `enable` ``, `` `totalConverter` ``) **in English/verbatim** inside the
   Russian prose (e.g. "Показать колонку. `undefined`/`true` → показана.").
3. Preserve Markdown/formatting inside comments (arrows `→`, lists, backticks).
4. Already-Russian comments: leave as-is unless they need light wording fixes for
   consistency with the glossary.
5. Do not add, remove, or relocate comments; do not "improve" the documented
   behavior — a faithful translation, one comment in → one comment out.

### Terminology glossary (consistency)

| English | Russian |
|---|---|
| table | таблица |
| column | колонка |
| row | строка |
| cell | ячейка |
| header | заголовок |
| footer | футер / нижний колонтитул |
| config / configuration | конфигурация (для типов `…Config` — «настройка …») |
| value | значение |
| converter | конвертер |
| total / total row | итог / строка итогов |
| filter | фильтр |
| sort / sorting | сортировка |
| selection | выделение |
| pagination / paginator | пагинация / пагинатор |
| index | индекс |
| drag & drop | drag & drop (не переводим) |
| provider | провайдер |
| factory | фабрика |
| default | по умолчанию |
| enabled / disabled | включено / выключено (для UI-элемента — «активна / неактивна») |
| hidden / shown | скрыта / показана |
| hover | наведение |
| highlight | подсветка |
| icon / tooltip | иконка / подсказка |
| emit / emitted | испустить / отправить (через `@Output`) |

## Affected code

All non-spec `*.ts` under `src/lib` (43 files). The comment-bearing ones, grouped
for task decomposition:

- **model/** — `ColumnConfig.ts` (the big one — all public config types),
  `AurPage.ts`, `PaginatorState.ts`, `RowStyleFactory.ts`, `TableViewFactory.ts`,
  `EmptyValue.ts`, `TableRow.ts`.
- **component/root** — `ngx-aur-mat-table.component.ts`,
  `ngx-aur-mat-table-public.ts`, `ngx-aur-mat-table.module.ts`, the
  `ngx-aur-mat-table-*.ts` mixins/interfaces, `ngx-aur-mat-table-selection-model.ts`.
- **providers/** — `IndexProvider`, `SelectionProvider`, `PaginationProvider`,
  `HeaderButtonProvider`, `DragDropProvider`, `TimelineProvider`, `RowActionProvider`,
  `TotalRowProvider`, `ServerPageController`, `AbstractProvider`.
- **factories/** — `TableRowsFactory`, `MatTableDataSourceFactory`,
  `ActionViewFactory`, `DisplayColumnsFactory`.
- **filters/** — `NgxAurFilters.ts`.
- **drag-drop/** — `aur-drag-drop.manager.ts`, `can-drop-manager.ts`,
  `drag-preview-manager.ts`, `drag-drop-mapping-manager.ts`, `aur-drag-drop-component.ts`,
  `model/aur-drag-drop-mapping.ts`, `model/aur-drag-preview-component.ts`.
- **utils/** — `feature-enabled.util.ts`, `ngx-aur-table-config.util.ts`,
  `ngx-aur-table-page-event.utils.ts`, `offset.util.ts`.
- **components/**, **directive/**, **data-property-getter-pipe/**,
  **style-builder/** — translate any comments present.

Files with no comments are simply left untouched.

## Verification

- `npm run build_lib` compiles clean (comments-only change must not affect the
  build — a green build proves no code was accidentally altered).
- `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` stays green.
- `git diff` review: every hunk touches only comment lines; no code, identifier, or
  string-literal changes. This is the primary correctness gate for a translation.
- Grep for residual English JSDoc prose in `src/lib` non-spec files (spot-check common
  English words: "the ", "column", "default", "row") — expect only verbatim code
  spans / type names to remain.

## Risk

Low. The only real risks are mechanical: (1) accidentally editing code while editing
an adjacent comment — caught by the green build + diff review; (2) inconsistent
terminology — mitigated by the glossary; (3) breaking a JSDoc `{@link}`/`@param`
binding by translating an identifier — rule 1 forbids touching identifiers. No
runtime or API impact whatsoever.

## Not touched

`*.spec.ts`; `projects/aur-demo`; templates/styles; the consuming `locator-front`
repo; any code, type, or string literal; recommendations #2 and #8 (#8 deferred).
