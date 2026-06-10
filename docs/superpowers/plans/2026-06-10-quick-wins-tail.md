# Хвост квик-винов (№8/№10/№13/№7) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Условные колонко-дефы опциональных фич; `TableViewFactory` без пустых Map; SSR-safe ResizeObserver; одинарный `querySelectorAll`.

**Architecture:** Одна ветка `perf/quick-wins-tail`, помодульные коммиты (№10 → №8 → №13+№7). Готовый код всех правок — в спеке.

**Спека:** `docs/superpowers/specs/2026-06-10-quick-wins-tail-design.md`

---

### Task 1: №10 — TableViewFactory (классический TDD)

- [ ] Ветка: `git checkout -b perf/quick-wins-tail master`
- [ ] Red: `model/TableViewFactory.spec.ts` — без valueView → `[]`; с valueView → Map на строку (пин)
- [ ] Fix: ранний выход `if (columnViewMap.size === 0) return [];`
- [ ] Green + commit `perf(core): skip per-row view maps when no column defines valueView`

### Task 2: №8 — условные дефы (регрессионные пины)

- [ ] Пины: `ngx-aur-mat-table-conditional-defs.spec.ts` (extra-header с/без шаблона; expanded-row клик/отсутствие) — зелёные ДО правок
- [ ] Правки: 4 обёртки `*ngIf` в `ngx-aur-mat-table.component.html` (extra top/bottom *ngFor-дефы, expandedRow-деф, subFooterRow-деф)
- [ ] Green + commit `perf(core): register optional-feature column defs only when their templates are provided`

### Task 3: №13 + №7 — компонент и EmptyValue

- [ ] Пин в column-offsets spec: `table` undefined → нет эмиссии, нет краша
- [ ] Правки: удалить `EmptyValue.RESIZE_OBSERVER`; поле `resizeColumnOffsetsObserver?`; гвард `typeof ResizeObserver !== 'undefined'` в ngAfterViewInit; `?.disconnect()` в ngOnDestroy; `updateColumnOffsets` по спеке
- [ ] Green + commit `perf(core): SSR-safe lazy ResizeObserver; single querySelectorAll in updateColumnOffsets`

### Task 4: Финал

- [ ] Полный прогон + `npm run build_lib` + `npx ng build aur-demo --configuration development`
- [ ] Merge: `git checkout master && git merge perf/quick-wins-tail && git branch -d perf/quick-wins-tail`

Changelog — при выпуске 19.5.0.
