# MatTooltip только при заданном тултипе — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Не создавать директиву MatTooltip на ячейках/иконках/кнопках, у которых тултип не настроен (~500+ пустых экземпляров на таблицу 50×10).

**Architecture:** Ветвление шаблонов (`*ngIf="... as tooltip; else plain"`); готовая разметка всех четырёх мест — в спеке. TDD по DOM-критерию: класс `mat-mdc-tooltip-trigger` присутствует только там, где тултип задан.

**Tech Stack:** Angular 19, Material 18, Jasmine + Karma.

**Спека (с готовыми шаблонами):** `docs/superpowers/specs/2026-06-10-tooltip-only-when-set-design.md`

---

### Task 1: TDD-цикл

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-tooltip.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (menu-trigger ~222, direct ~233)

- [ ] **Step 1.1: Ветка** — `git checkout -b perf/tooltip-only-when-set master`
- [ ] **Step 1.2: Написать spec** (5 проверок из раздела «Тестирование» спеки; TestBed-хост: колонки plain / text-tooltip / icon / icon-tooltip + actionCfg: действие с тултипом и без)
- [ ] **Step 1.3: Red** — `npx ng test ...` → падают проверки «0 триггеров» (plain, icon-без-тултипа, кнопка-без-тултипа); остальные 86 PASS
- [ ] **Step 1.4: Применить 4 шаблонные правки из спеки** (разметка готова — копировать из разделов спеки)
- [ ] **Step 1.5: Green** — все PASS (86 + новые)
- [ ] **Step 1.6: Сборки** — `npm run build_lib`, `npx ng build aur-demo --configuration development`
- [ ] **Step 1.7: Commit + merge**

```bash
git add projects/ngx-aur-mat-table/src/lib
git commit -m "perf(core): instantiate MatTooltip only when a tooltip is configured

Every cell span / icon / row action button unconditionally carried
[matTooltip]=\"'' fallback\" — 500+ idle directive instances per 50x10
table (DI, dir.change subscription, FocusMonitor registration each).
Template branches now render the tooltip-bearing element only when the
tooltip is actually set."
git checkout master && git merge perf/tooltip-only-when-set && git branch -d perf/tooltip-only-when-set
```

Changelog-запись — при выпуске 19.5.0.
