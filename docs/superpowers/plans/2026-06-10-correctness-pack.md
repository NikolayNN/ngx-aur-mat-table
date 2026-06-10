# Пакет «корректность» (19.5.1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Три баг-фикса: поиск не матчит служебные `id`/`rowSrc`; `indexCfg.name` отображается; обёртка иконки `.circle` получает размер/скругление.

**Architecture:** Готовый код всех правок — в спеке. Одна ветка `fix/correctness-pack`, помодульные коммиты, релиз 19.5.1 последним коммитом.

**Спека:** `docs/superpowers/specs/2026-06-10-correctness-pack-design.md`

---

### Task 1: Предикат поиска (TDD)

- [ ] Ветка: `git checkout -b fix/correctness-pack master`
- [ ] Red: 2 теста ложных совпадений + 2 пина в `ngx-aur-mat-table-filtering.spec.ts`
- [ ] Fix: `searchPredicate` в компоненте (код в спеке §1)
- [ ] Green + commit `fix(core): search no longer matches internal row id / rowSrc placeholder`

### Task 2: indexCfg.name + .circle (TDD)

- [ ] Red: `ngx-aur-mat-table-cell-rendering-fixes.spec.ts` (заголовок индекса 'NN'; computed-стили div.circle)
- [ ] Fix: `[value]="indexProvider.name"` в шаблоне; перенос `.circle` column-view.css → icon-view.css (код в спеке §2–3)
- [ ] Green + commit `fix(core): render indexCfg.name in the index header; apply .circle styles to the icon wrapper`

### Task 3: Релиз и merge

- [ ] Полный прогон + `npm run build_lib` + `npx ng build aur-demo --configuration development`
- [ ] Bump 19.5.0 → 19.5.1 + `changelog/19.5.1.md` (стиль репо, Fixed) + commit `chore(release): bump to 19.5.1 + changelog`
- [ ] Merge: `git checkout master && git merge fix/correctness-pack && git branch -d fix/correctness-pack`
