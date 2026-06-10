# Простые ячейки без компонентов — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Колонки без `valueView` рендерят лёгкий span вместо пары компонентов с обёртками (−2 компонента и −4 DOM-узла на ячейку); view-колонки без иконки теряют пустой IconView.

**Architecture:** Три статичных шаблонных ветвления (готовая разметка в спеке) + css-правило выравнивания. TDD по DOM-структуре ячеек.

**Tech Stack:** Angular 19, Jasmine + Karma.

**Спека (с готовой разметкой):** `docs/superpowers/specs/2026-06-10-plain-cells-design.md`

---

### Task 1: TDD-цикл

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-plain-cells.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (td value-колонок)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss` (`.aur-plain-cell`)
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html`

- [ ] **Step 1.1: Ветка** — `git checkout -b perf/plain-cells master`
- [ ] **Step 1.2: Spec** — 4 проверки из раздела «Тестирование» спеки + временный диагностический тест на отображение `indexCfg.name` в заголовке (удалить перед коммитом, результат зафиксировать в отчёте)
- [ ] **Step 1.3: Red** — `npx ng test ...` → падают 1/3/4; пин 2 зелёный
- [ ] **Step 1.4: Применить 4 правки из спеки** (разметка готова)
- [ ] **Step 1.5: Green** — все PASS (91 + 4 новых), диагностический тест удалить
- [ ] **Step 1.6: Сборки** — `npm run build_lib`, `npx ng build aur-demo --configuration development`; визуальная проверка выравнивания — за пользователем в демо
- [ ] **Step 1.7: Commit + merge**

```bash
git add projects/ngx-aur-mat-table/src/lib
git commit -m "perf(core): plain columns render a bare span instead of cell components

Columns without valueView skip lib-column-view/lib-icon-view entirely
(2 component instances + 4 wrapper nodes + a flex context per cell);
.aur-plain-cell keeps the 4px text offset for pixel parity with headers.
View columns without an icon no longer instantiate an empty IconView;
icon-view renders nothing at all without a view."
git checkout master && git merge perf/plain-cells && git branch -d perf/plain-cells
```

Changelog-запись (+нюанс про ::ng-deep-хуки на lib-column-view простых колонок) — при выпуске 19.5.0.
