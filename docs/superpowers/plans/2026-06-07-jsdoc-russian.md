# Unify Library Comments to Russian (#7) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate every comment in the `ngx-aur-mat-table` library to Russian (JSDoc `/** */` and inline `//`), faithfully and consistently, with zero code changes.

**Architecture:** Pure comment edit. No runtime, signature, or behavior change. Work proceeds file-group by file-group; each group is translated, verified with a clean `build_lib`, diff-reviewed for comment-only hunks, and committed. The full unit-test suite runs once at the end.

**Tech Stack:** TypeScript / Angular 19.2 library. Verification via `npm run build_lib` (AOT) and `ng test ngx-aur-mat-table`.

**Authoritative references (read before starting):**
- Spec: `docs/superpowers/specs/2026-06-06-jsdoc-russian-design.md` — contains the **terminology glossary** and the **translation rules**. Every task obeys them.

**Translation rules (summary — full text in spec):**
1. Translate prose only. Keep `@param name`, `@returns`, `{@link …}`, tag order, and any identifier after a tag verbatim.
2. Keep code, type names, config keys, CSS classes, and inline code spans (`` `enable` ``) verbatim inside the Russian prose.
3. Preserve Markdown/arrows/backticks/lists inside comments.
4. One comment in → one comment out. Do not add, drop, relocate, or "improve" comments.
5. Touch **only** comment characters. No identifier, string-literal, or code change.

**Style reference (apply this voice everywhere):**

```ts
// before
/** column title text */
/** column key in data source */
/** return value to save in MatTableDataSource */
/** Show the icon. `undefined`/`true` → shown, `false` → hidden. */

// after
/** Текст заголовка колонки */
/** Ключ колонки в источнике данных */
/** Значение для сохранения в MatTableDataSource */
/** Показать иконку. `undefined`/`true` → показана, `false` → скрыта. */
```

Already-Russian comments stay as-is (light wording fixes only for glossary consistency), e.g. `имя таблицы используется в drag & drop` → `Имя таблицы, используется в drag & drop`.

**Scope:** every non-spec `*.ts` under `projects/ngx-aur-mat-table/src/lib/`. **Excluded:** `*.spec.ts`, `projects/aur-demo`, HTML/SCSS.

---

## Task 1: `model/ColumnConfig.ts` (public config types — the big one)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`

This is the most-visible file (all `TableConfig`/`ColumnConfig`/view/`SortConfig`/`PaginationConfig`/… JSDoc that consumers see in IDE hovers). ~73 comment lines, currently RU/EN mixed.

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary. Includes the `Resolvable`/`TotalHook` block comments, all `TableConfig` field comments (some already RU — normalize), every interface field JSDoc. Keep `Resolvable<T, R>`, `StyleBuilder.Row`, `totalConverter`, `enable`, `start|end`, `inline|sticky` etc. verbatim.

- [ ] **Step 2: Verify build is clean**

Run: `npm run build_lib`
Expected: builds without errors (proves no code was altered).

- [ ] **Step 3: Diff-review (comment-only)**

Run: `git diff projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
Expected: every hunk changes only comment text; no code/identifier/literal lines changed.

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "docs(i18n): translate ColumnConfig JSDoc to Russian (#7)"
```

---

## Task 2: `ngx-aur-mat-table.component.ts` (component internals)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`

~64 comment lines, mixed RU/EN (e.g. `// Timeline ПОСЛЕДНИМ — unshift гарантирует…` already RU; many `/** … */` helpers in EN). Translate all, including the public `isFeatureEnabled` doc and the `resolveTotal` / style-merge helper comments.

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff …/ngx-aur-mat-table.component.ts` → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git commit -m "docs(i18n): translate table component comments to Russian (#7)"
```

---

## Task 3: Remaining root/component files

**Files (translate comments in each; skip files with none):**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-public.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-selection-model.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-filterable.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-refreshable.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-table-search-prefix.directive.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-table-search-suffix.directive.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/directive/ngx-table-sub-footer-row.directive.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/data-property-getter-pipe/data-property-getter.pipe.ts`

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff` on the listed files → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-public.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-selection-model.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-filterable.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-refreshable.ts projects/ngx-aur-mat-table/src/lib/components projects/ngx-aur-mat-table/src/lib/directive projects/ngx-aur-mat-table/src/lib/data-property-getter-pipe
git commit -m "docs(i18n): translate root/component/directive comments to Russian (#7)"
```

---

## Task 4: `providers/`

**Files (translate comments; skip `*.spec.ts` and files with none):**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts` (~25 comment lines)
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/HeaderButtonProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/TimelineProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/TotalRowProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/ServerPageController.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/AbstractProvider.ts`

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff projects/ngx-aur-mat-table/src/lib/providers` → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers
git commit -m "docs(i18n): translate providers comments to Russian (#7)"
```

---

## Task 5: `factories/` + `model/` (non-ColumnConfig)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/TableRowsFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/MatTableDataSourceFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/DisplayColumnsFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/RowStyleFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/AurPage.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/PaginatorState.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/EmptyValue.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableRow.ts`

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff` on the listed files → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/factories projects/ngx-aur-mat-table/src/lib/model
git commit -m "docs(i18n): translate factories/model comments to Russian (#7)"
```

---

## Task 6: `filters/NgxAurFilters.ts`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/filters/NgxAurFilters.ts` (~85 comment lines — large)

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary. Keep filter type names, operators, and any `@example` code verbatim.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff …/filters/NgxAurFilters.ts` → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/filters/NgxAurFilters.ts
git commit -m "docs(i18n): translate NgxAurFilters comments to Russian (#7)"
```

---

## Task 7: `drag-drop/`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop.manager.ts` (~48 comment lines)
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/can-drop-manager.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/drag-preview-manager.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/drag-drop-mapping-manager.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop-component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/model/aur-drag-drop-mapping.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/drag-drop/model/aur-drag-preview-component.ts`

Keep the term **drag & drop** untranslated (per glossary).

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff projects/ngx-aur-mat-table/src/lib/drag-drop` → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/drag-drop
git commit -m "docs(i18n): translate drag-drop comments to Russian (#7)"
```

---

## Task 8: `utils/` + `style-builder/`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-config.util.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/utils/ngx-aur-table-page-event.utils.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/utils/offset.util.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/style-builder/style-builder.ts`

- [ ] **Step 1: Translate every comment to Russian** per rules + glossary.
- [ ] **Step 2: Verify build** — Run: `npm run build_lib` → Expected: clean.
- [ ] **Step 3: Diff-review** — Run: `git diff` on the listed files → comment-only hunks.
- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/utils projects/ngx-aur-mat-table/src/lib/style-builder
git commit -m "docs(i18n): translate utils/style-builder comments to Russian (#7)"
```

---

## Task 9: Final sweep + full verification

**Files:** none expected (verification + cleanup task).

- [ ] **Step 1: Residual-English sweep**

Run a grep for residual English JSDoc prose across non-spec lib files. Use the Grep tool on `projects/ngx-aur-mat-table/src/lib` (glob `*.ts`), excluding `*.spec.ts`, for common English words appearing in comment context: `the `, `column`, `default`, `return`, `show`, `enable`. For each hit, confirm it is a verbatim code span / type name / config key (allowed) and not untranslated prose (not allowed). Translate any missed prose and amend the relevant task's commit or add a fixup commit.

- [ ] **Step 2: Full build**

Run: `npm run build_lib`
Expected: clean.

- [ ] **Step 3: Full unit-test suite**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: all green (a comments-only change must not move the test count).

- [ ] **Step 4: Commit any sweep fixes**

```bash
git add projects/ngx-aur-mat-table/src/lib
git commit -m "docs(i18n): final Russian-comment sweep (#7)"
```

(Skip the commit if the sweep found nothing.)

---

## Self-Review

- **Spec coverage:** Tasks 1–8 cover every directory under `src/lib` named in the spec's "Affected code"; Task 9 sweeps for misses. ✓
- **Placeholder scan:** Translation tasks instruct "translate per rules + glossary" with a concrete before/after style reference and the committed spec glossary — this is a complete instruction for a translation task, not a vague placeholder. ✓
- **Consistency:** Every task uses the identical 4-step shape (translate → build → diff-review → commit); the glossary/rules live once in the spec and are referenced, not re-pasted (DRY). The comment-only diff-review is the correctness gate in every task. ✓
- **No code change invariant:** Every task's Step 3 enforces comment-only hunks; Step 2 enforces a green build. This is the core safety property and appears in all tasks. ✓
