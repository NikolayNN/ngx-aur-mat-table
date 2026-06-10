# Удаление неиспользуемого DragDropModule — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать мёртвый импорт `@angular/cdk/drag-drop` из `NgxAurMatTableModule` (−66 KB min / −15.8 KB gzip в бандле потребителей без собственного CDK DnD).

**Architecture:** Удаление двух строк в одном файле; поведения нет — верификация сборками и полным прогоном тестов.

**Tech Stack:** Angular 19, Jasmine + Karma.

**Спека:** `docs/superpowers/specs/2026-06-10-remove-unused-cdk-dragdropmodule-design.md`

---

### Task 1: Удалить импорт и проверить

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` (строки 18, 44)

- [ ] **Step 1.1: Ветка**

```bash
git checkout -b perf/drop-unused-cdk-dragdrop master
```

- [ ] **Step 1.2: Удалить две строки**

Удалить строку импорта:

```ts
import {DragDropModule} from "@angular/cdk/drag-drop";
```

и элемент `DragDropModule,` из массива `imports` NgModule. Больше в файле ничего не менять.

- [ ] **Step 1.3: Греп — ноль ссылок**

`DragDropModule` в `projects/ngx-aur-mat-table` → 0 совпадений.

- [ ] **Step 1.4: Верификация**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: TOTAL: 86 SUCCESS

Run: `npm run build_lib`
Expected: успех (AOT-гейт)

Run: `npx ng build aur-demo --configuration development`
Expected: успех (демо использует СВОЙ импорт CDK DnD — не наш)

- [ ] **Step 1.5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts
git commit -m "perf(core): drop unused CDK DragDropModule import

The library's drag-and-drop is native HTML5 events + AurDragDropManager;
no cdkDrag/cdkDropList directive is referenced anywhere. The NgModule
import was a hard Ivy reference forcing ~66 KB min (~15.8 KB gzip) of
@angular/cdk/drag-drop into every consumer bundle."
```

- [ ] **Step 1.6: Merge в master**

```bash
git checkout master
git merge perf/drop-unused-cdk-dragdrop
git branch -d perf/drop-unused-cdk-dragdrop
```

Changelog-запись — при выпуске 19.5.0 вместе с остальными квик-винами.
