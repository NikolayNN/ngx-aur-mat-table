# Consistent `enable` Opt-Out Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `enable` an optional opt-out across all `TableConfig` sub-configs (a feature is on when its config is present unless `enable: false`), unifying eleven ad-hoc on/off checks behind one `isFeatureEnabled` helper — while preserving the two signal-driven exceptions (Hover, TotalRow).

**Architecture:** Add a tiny `isFeatureEnabled(cfg)` util, relax nine `enable: boolean` fields to `enable?: boolean`, route Group-1 consumers (providers + 2 template sites + 1 component filter) through the helper, and leave Group-2 consumers (Hover at `component.ts:618`, TotalRow at `TotalRowProvider.ts:29`) untouched because their enabling signal is interaction / total-columns, not config presence.

**Tech Stack:** Angular 19.2, Angular Material 18.2, TypeScript, Karma/Jasmine.

---

## Critical context for the implementer (read before starting)

- **Two groups, one type change.** All nine currently-required `enable` fields become
  optional, but only **Group 1** consumers switch to the helper. **Group 2 (Hover,
  TotalRow) consumers are NOT changed** — applying the helper there is a REGRESSION
  (helper returns `false` for an absent config; Hover/TotalRow must stay on when their
  config is absent but their signal is present).
- **The helper:** `isFeatureEnabled(cfg) = !!cfg && cfg.enable !== false`. Absent →
  false; `{}` → true; `{enable:true}` → true; `{enable:false}` → false.
- **Templates can't call free functions.** The two `.html` sites call a component
  method `isFeatureEnabled(...)` that delegates to the imported util (aliased to avoid a
  name collision with the method).
- **Type-narrowing caveat** at `component.ts:418`: keep an explicit `c.sort != null`
  guard before `c.sort.customSort`, because a boolean-returning helper call does not
  narrow `c.sort`.
- **Compatibility:** required→optional is type- and runtime-compatible. Existing code
  always set `enable` explicitly, so behavior is identical; the only new capability is
  omitting `enable` on a present Group-1 config (previously a compile error).
- **Do NOT edit the demo.** Its explicit `enable: true` stays valid (out of scope).
- **Build/test are the oracle.** `npm run build_lib` (AOT) and `ng test` after each task.
- **Windows env.** `LF will be replaced by CRLF` git warnings are normal, not errors.

## File structure (what each task touches)

| File | Responsibility | Task |
|---|---|---|
| `utils/feature-enabled.util.ts` (new) | the `isFeatureEnabled` helper | 1 |
| `utils/feature-enabled.util.spec.ts` (new) | helper unit tests | 1 |
| `model/ColumnConfig.ts` | relax 9 `enable` fields to optional + JSDoc | 2 |
| 7 `providers/*.ts` | Group-1 providers use helper | 3 |
| `ngx-aur-mat-table.component.ts` | component filter + template passthrough method | 4 |
| `ngx-aur-mat-table.component.html` | 2 Group-1 template predicates | 4 |
| `ngx-aur-mat-table-selection.spec.ts` or pagination spec | new provider-level behavior test | 5 |
| `changelog/19.2.0.md` | document the opt-out model | 6 |

Order rationale: Task 1 adds the helper (independently testable, green on its own).
Task 2 relaxes the types (library still compiles — making fields optional never breaks
existing reads). Tasks 3–4 migrate Group-1 consumers to the helper. Task 5 adds
behavior coverage. Task 6 documents. Each task keeps `build_lib` green.

---

### Task 1: Add the `isFeatureEnabled` helper (TDD)

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.spec.ts`:

```ts
import { isFeatureEnabled } from './feature-enabled.util';

describe('isFeatureEnabled', () => {
  it('returns false when the config is undefined', () => {
    expect(isFeatureEnabled(undefined)).toBe(false);
  });

  it('returns false when the config is null', () => {
    expect(isFeatureEnabled(null)).toBe(false);
  });

  it('returns true when the config is present without enable', () => {
    expect(isFeatureEnabled({})).toBe(true);
  });

  it('returns true when enable is true', () => {
    expect(isFeatureEnabled({ enable: true })).toBe(true);
  });

  it('returns false when enable is false', () => {
    expect(isFeatureEnabled({ enable: false })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './feature-enabled.util'` (file does not exist yet).

- [ ] **Step 3: Create the helper**

Create `projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.ts`:

```ts
/**
 * A feature is enabled when its config object is present, unless `enable: false`.
 *
 * Used by features whose enabling signal is "config present" (Group 1). Features whose
 * enabling signal is something else (Hover → interaction, TotalRow → totalConverter
 * columns) must NOT use this helper — an absent config does not disable them.
 */
export function isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
  return !!cfg && cfg.enable !== false;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — all 5 new specs green; existing suite still green (58 total).

- [ ] **Step 5: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.ts \
        projects/ngx-aur-mat-table/src/lib/utils/feature-enabled.util.spec.ts
git commit -m "feat: add isFeatureEnabled helper (present unless enable:false)"
```
(End the commit message with a trailing line: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 2: Relax nine `enable` fields to optional in `ColumnConfig.ts`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`

Change `enable: boolean` → `enable?: boolean` and add/replace the JSDoc on each of the
nine fields below. `ActionConfig.enable?` and `HoverConfig.enable?` are already optional
— do not touch them. Use the Read tool to locate each interface (line numbers approximate).

- [ ] **Step 1: `SortConfig` (~line 181)**

Replace:
```ts
  enable: boolean;
```
with:
```ts
  /** Enable sorting on this column. Default on when `sort` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 2: `IndexConfig` (~line 191)**

Replace:
```ts
  enable: boolean,
```
with:
```ts
  /** Show the index column. Default on when `indexCfg` is set; `false` disables. */
  enable?: boolean,
```

- [ ] **Step 3: `FilterConfig` (~line 204)**

Replace:
```ts
  enable: boolean;
```
with:
```ts
  /** Show the filter row. Default on when `filterCfg` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 4: `SelectionConfig` (~line 244)**

Replace:
```ts
  enable: boolean;
```
with:
```ts
  /** Enable selection. Default on when `selectionCfg` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 5: `PaginationConfig` (~line 250)**

Replace the `enable: boolean;` line in `interface PaginationConfig` with:
```ts
  /** Enable pagination. Default on when `paginationCfg` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 6: `HeaderButtonConfig` (~line 278)**

Replace the `enable: boolean;` line in `interface HeaderButtonConfig` with:
```ts
  /** Show the header button. Default on when `headerButtonCfg` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 7: `DragDropConfig` (~line 285)**

Replace the `enable: boolean;` line in `interface DragDropConfig` with:
```ts
  /** Enable drag & drop. Default on when `dragDropCfg` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 8: `TotalRowConfig` (~line 293)**

Replace the `enable: boolean;` line in `interface TotalRowConfig` with:
```ts
  /** Show the total row. Default on when any column defines `totalConverter`; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 9: `TimelineConfig` (~line 305)**

Replace the `enable: boolean;` line in `interface TimelineConfig` with:
```ts
  /** Enable the timeline column. Default on when `timelineCfg` is set; `false` disables. */
  enable?: boolean;
```

- [ ] **Step 10: Verify the library still compiles**

Run: `npm run build_lib`
Expected: PASS. Relaxing required→optional does not break any existing read. (The
`EmptyValue.*_CONFIG` blocks that set `enable: false` remain valid.)

- [ ] **Step 11: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "refactor(api)!: make enable optional (opt-out) across config interfaces"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 3: Route Group-1 providers through the helper

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts:54`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts:77`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.ts:20`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/HeaderButtonProvider.ts:12`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts:54`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/TimelineProvider.ts:48`
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts:62`

For each provider: add the import
`import { isFeatureEnabled } from "../utils/feature-enabled.util";`
at the top (match the file's existing import style/quotes), then replace the predicate.

- [ ] **Step 1: `IndexProvider.ts`**

Replace:
```ts
    return (tableConfig.indexCfg && tableConfig.indexCfg.enable) || false;
```
with:
```ts
    return isFeatureEnabled(tableConfig.indexCfg);
```

- [ ] **Step 2: `SelectionProvider.ts`**

Replace:
```ts
    return (tableConfig.selectionCfg && tableConfig.selectionCfg.enable) || false;
```
with:
```ts
    return isFeatureEnabled(tableConfig.selectionCfg);
```

- [ ] **Step 3: `PaginationProvider.ts`**

Replace:
```ts
    return (tableConfig.paginationCfg && tableConfig.paginationCfg.enable) || false;
```
with:
```ts
    return isFeatureEnabled(tableConfig.paginationCfg);
```

- [ ] **Step 4: `HeaderButtonProvider.ts`**

Replace:
```ts
    this.isEnabled = cfg?.enable ?? false;
```
with:
```ts
    this.isEnabled = isFeatureEnabled(cfg);
```

- [ ] **Step 5: `DragDropProvider.ts`**

Replace:
```ts
    return tableConfig?.dragDropCfg?.enable ?? false;
```
with:
```ts
    return isFeatureEnabled(tableConfig?.dragDropCfg);
```

- [ ] **Step 6: `TimelineProvider.ts`**

Replace:
```ts
    return tableConfig.timelineCfg?.enable ?? false;
```
with:
```ts
    return isFeatureEnabled(tableConfig.timelineCfg);
```

- [ ] **Step 7: `RowActionProvider.ts`**

Replace:
```ts
    return (tableConfig.actionCfg && (tableConfig.actionCfg.enable === undefined || tableConfig.actionCfg.enable === null || tableConfig.actionCfg.enable)) || false
```
with:
```ts
    return isFeatureEnabled(tableConfig.actionCfg);
```
(Behavior identical: the old code enabled when `actionCfg` was present and `enable` was
`undefined`/`null`/`true`; the helper enables when present and `enable !== false`.)

- [ ] **Step 8: Verify build + tests**

Run: `npm run build_lib`
Expected: PASS.
Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS (existing suite + Task 1 helper specs).

- [ ] **Step 9: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/HeaderButtonProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/DragDropProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/TimelineProvider.ts \
        projects/ngx-aur-mat-table/src/lib/providers/RowActionProvider.ts
git commit -m "refactor: route group-1 providers through isFeatureEnabled"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 4: Migrate the component filter + the two template predicates

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (import, filter at ~:418, new method)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:5,258`

- [ ] **Step 1: Import the helper (aliased) in the component**

In `ngx-aur-mat-table.component.ts`, add to the import block near the other local
imports (match existing quote style):
```ts
import { isFeatureEnabled as isFeatureEnabledFn } from './utils/feature-enabled.util';
```

- [ ] **Step 2: Add the template passthrough method**

Add this public method to the component class (place it near the other template-helper
methods, e.g. just above `hoverActive` around line 616):
```ts
  /** Template helper: a feature is on when its config is present unless `enable: false`. */
  isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
    return isFeatureEnabledFn(cfg);
  }
```

- [ ] **Step 3: Update the Sort customSort filter (~line 418)**

Replace:
```ts
      .filter(c => c.sort && c.sort.enable && c.sort.customSort)
```
with:
```ts
      .filter(c => c.sort != null && isFeatureEnabledFn(c.sort) && c.sort.customSort)
```
(The `c.sort != null` guard preserves TypeScript narrowing for `c.sort.customSort`.)

- [ ] **Step 4: Update the Filter-row template predicate (`component.html:5`)**

Replace:
```html
    <ng-container *ngIf="tableConfig.filterCfg?.enable ?? false">
```
with:
```html
    <ng-container *ngIf="isFeatureEnabled(tableConfig.filterCfg)">
```

- [ ] **Step 5: Update the Sort template predicate (`component.html:258`)**

Replace:
```html
          <ng-container *ngIf="columnConfig.sort && columnConfig.sort.enable; else notSortable">
```
with:
```html
          <ng-container *ngIf="isFeatureEnabled(columnConfig.sort); else notSortable">
```

- [ ] **Step 6: Verify build (AOT template type-check) + tests**

Run: `npm run build_lib`
Expected: PASS — AOT compiles the template calls to `isFeatureEnabled`.
Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -m "refactor: route group-1 template/component checks through isFeatureEnabled"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 5: Add provider-level behavior tests for the opt-out default

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.spec.ts`

`PaginationProvider` exposes a public static predicate
`canEnable<T>(tableConfig: TableConfig<T>): boolean` (the exact line Task 3 changed to
`isFeatureEnabled(tableConfig.paginationCfg)`). Test it directly — it returns the
enabled boolean with no construction needed.

- [ ] **Step 1: Write the behavior test**

Create `projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.spec.ts`:

```ts
import { PaginationProvider } from './PaginationProvider';
import { TableConfig } from '../model/ColumnConfig';

function cfg(pagination?: any): TableConfig<any> {
  return { columnsCfg: [], paginationCfg: pagination } as TableConfig<any>;
}

describe('PaginationProvider enable opt-out', () => {
  it('is enabled when paginationCfg is present without enable', () => {
    expect(PaginationProvider.canEnable(cfg({ size: 10 }))).toBe(true);
  });

  it('is disabled when enable is false', () => {
    expect(PaginationProvider.canEnable(cfg({ size: 10, enable: false }))).toBe(false);
  });

  it('is disabled when paginationCfg is absent', () => {
    expect(PaginationProvider.canEnable(cfg(undefined))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — the three scenarios prove default-on-when-present, `enable:false`
disables, and absent config disables.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/providers/PaginationProvider.spec.ts
git commit -m "test: cover enable opt-out default for PaginationProvider"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

### Task 6: Document the opt-out model in the changelog

**Files:**
- Modify: `changelog/19.2.0.md`

- [ ] **Step 1: Read the existing changelog to match its style**

Open `changelog/19.2.0.md` — it has three `## Breaking: ...` sections, each with a table
and/or a `### Migration` before/after example. Append a fourth section to the END,
keeping existing content intact.

- [ ] **Step 2: Append the section**

```markdown
## Breaking: `enable` is now an optional opt-out

`enable` is no longer a required field on the config interfaces. A feature is **on when
its config object is present**, unless you set `enable: false`. This unifies the
previously inconsistent mix (some configs required `enable: true`, some defaulted on,
`HoverConfig` was presence-based).

Affected (now `enable?: boolean`, default on when the config is present): `SortConfig`,
`IndexConfig`, `FilterConfig`, `SelectionConfig`, `PaginationConfig`,
`HeaderButtonConfig`, `DragDropConfig`, `TimelineConfig`, `TotalRowConfig`.

Two features keep their existing signal-driven default-on behavior (an absent config
does not disable them; `enable: false` suppresses): `HoverConfig` (driven by hover
interaction) and `TotalRowConfig` (driven by columns that define `totalConverter`).

Existing code is unaffected: any object that set `enable: true`/`false` behaves exactly
as before. You may now drop redundant `enable: true`:

```ts
// before
selectionCfg:  { enable: true, multiple: true },
paginationCfg: { enable: true, size: 10 },
filterCfg:     { enable: true },

// after — presence means intent; enable: false still disables
selectionCfg:  { multiple: true },
paginationCfg: { size: 10 },
filterCfg:     {},
```
```

- [ ] **Step 3: Verify the fences are balanced**

Read `changelog/19.2.0.md` and confirm the new section's nested ```ts block is closed
and the three prior sections are intact.

- [ ] **Step 4: Commit**

```bash
git add changelog/19.2.0.md
git commit -m "docs(changelog): document enable optional opt-out model"
```
(End the commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Final verification (run after all tasks)

- [ ] `npm run build_lib` → PASS (library AOT clean)
- [ ] `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` → PASS
  (53 prior + 5 helper + 3 provider = 61 tests, all green)
- [ ] `npx ng build aur-demo` → only the pre-existing bundle-budget ERROR, no type/binding errors
- [ ] Group-2 untouched — confirm these two lines are unchanged:
```bash
git grep -n "h?.enable !== false" -- projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts
git grep -n "totalRowCfg?.enable ?? true" -- projects/ngx-aur-mat-table/src/lib/providers/TotalRowProvider.ts
```
Expected: both still present (Hover + TotalRow predicates not migrated).
- [ ] No Group-1 ad-hoc predicate remains:
```bash
git grep -nE "\.enable\) \|\| false|enable \?\? false|enable === undefined" -- projects/ngx-aur-mat-table/src
```
Expected: no matches.
