# Type-safe `visible` / `disabled` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unchecked magic strings `display: 'show'|'none'` and `disabled: 'true'|'false'` on `IconView`/`Action`/`MenuItem` with boolean `visible` / `disabled` fields that are type-safe in both static and function form.

**Architecture:** Introduce a `Resolvable<T, R>` conditional helper type that maps the existing generic `T` (static `string` vs `(value) => string`) to `R` vs `(value) => R`. Retype the three control fields as `Resolvable<T, boolean>`, rename `display → visible`, invert the `'none'`/`'show'` logic, and update factories, template, specs, demo, JSDoc, and changelog.

**Tech Stack:** Angular 19.2, Angular Material 18.2, TypeScript, Karma/Jasmine.

---

## Critical context for the implementer (read before starting)

- **Two layers.** The *config types* (`IconView<T>`, `Action<T>`, `MenuItem<T>`) are generic over the leaf type `T`. In `ActionConfig`, actions are `Action<(value: T) => string>` (function form). The *resolved view* the factories emit is `Action<string>` / `MenuItem<string>` / `IconView<string>` (static form). With the new `Resolvable<T, boolean>`, the resolved view's control fields collapse to plain `boolean` automatically — no extra work.
- **Logic inversion.** Old `'none'` = hidden. New `visible: false` = hidden. Every converted call site inverts the predicate. `'show'`/default → `visible: true`. For `disabled`, `'true'` → `true`, `'false'`/default → `false` (no inversion, just string→boolean).
- **Do NOT touch these namesakes** (unrelated `none`):
  - `style-builder/style-builder.ts:109` `NONE = "none"`
  - `ColumnConfig.ts` `TimelineLineConfig.gapStyle?: 'solid' | 'dashed' | 'dotted' | 'none'`
- **Build is the type oracle.** `npm run build_lib` compiles the library with AOT and will fail if any resolver still returns a string or any `.display` reference survives. Run it after each library task.
- **Windows env.** Git prints `LF will be replaced by CRLF` warnings — these are normal, not errors.

## File structure (what each task touches)

| File | Responsibility | Task |
|---|---|---|
| `model/ColumnConfig.ts` | helper type + field defs + JSDoc | 1 |
| `factories/ActionViewFactory.ts` | resolve action/menu control fields | 2 |
| `model/TableViewFactory.ts` | resolve icon control field | 2 |
| `ngx-aur-mat-table.component.html` | template predicates | 3 |
| `components/icon-view/icon-view.component.html` | icon template predicate | 3 |
| `factories/ActionViewFactory.spec.ts` | unit-test fixtures/assertions | 4 |
| demo: `with-actions`, `with-menu`, `with-icons` `.ts` | consumer migration | 5 |
| `changelog/19.2.0.md` | breaking-change docs | 6 |

Tasks 1–3 must land together to keep the library compiling (the type change in Task 1 breaks the factories and template until Tasks 2–3 are done). They are split for clarity but committed as a unit at the end of Task 3. Task 4 (specs) is required before `ng test` passes. Tasks are ordered so each commit leaves the **library type-check** in a known state; the green `build_lib` + `ng test` gate is verified at the end of Task 4.

---

### Task 1: Add `Resolvable<T, R>` and retype the three control fields

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`

- [ ] **Step 1: Add the `Resolvable<T, R>` helper type**

Add this exported type near the top of the file, right after the imports (before `export interface TableConfig<T>`):

```ts
/**
 * Maps the leaf-type generic `T` to a resolved value:
 * - when `T` is a plain value (e.g. `string`), resolves to `R`;
 * - when `T` is a `(value) => string` resolver, resolves to `(value) => R`.
 * Used for control fields whose value type must be `boolean`, not the leaf string.
 */
export type Resolvable<T, R> = T extends (arg: infer A) => any ? (arg: A) => R : R;
```

- [ ] **Step 2: Retype `IconView<T>.display` → `visible`**

In `interface IconView<T>`, replace the trailing `display` field (and its `//`-comment block):

```ts
  // принимает значения 'show' | 'none'
  // 'show' или не указан -  показать иконку
  //
  display?: T;
```

with:

```ts
  /** Show the icon. `undefined`/`true` → shown, `false` → hidden. */
  visible?: Resolvable<T, boolean>;
```

- [ ] **Step 3: Retype `Action<T>.display` → `visible`**

In `interface Action<T>`, replace:

```ts
  display?: T;
```

with:

```ts
  /** Show the action. `undefined`/`true` → shown, `false` → hidden. */
  visible?: Resolvable<T, boolean>;
```

- [ ] **Step 4: Retype `MenuItem<T>.display`/`disabled` → booleans**

In `interface MenuItem<T>`, replace:

```ts
  /** 'show' | 'none' — conditionally hide the item */
  display?: T;
  /** 'true' | 'false' — conditionally disable the item */
  disabled?: T;
```

with:

```ts
  /** Show the item. `undefined`/`true` → shown, `false` → hidden. */
  visible?: Resolvable<T, boolean>;
  /** Disable the item. `undefined`/`false` → enabled, `true` → disabled. */
  disabled?: Resolvable<T, boolean>;
```

- [ ] **Step 5: Verify the library does NOT yet compile (expected)**

Run: `npm run build_lib`
Expected: FAIL — errors in `ActionViewFactory.ts` / `TableViewFactory.ts` (resolvers still assign strings) and/or template. This confirms the type change took effect. Proceed to Task 2 (do not commit yet).

---

### Task 2: Resolve control fields to booleans in the factories

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts:29,39,40`
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts:47`

- [ ] **Step 1: Update `ActionViewFactory.prepareActionsForRow` (action visible)**

At line 29, replace:

```ts
      display: action.display? action.display(row.rowSrc): 'show',
```

with:

```ts
      visible: action.visible? action.visible(row.rowSrc): true,
```

- [ ] **Step 2: Update `ActionViewFactory.prepareMenuItem` (menu visible + disabled)**

At lines 39–40, replace:

```ts
      display: item.display? item.display(value): 'show',
      disabled: item.disabled? item.disabled(value): 'false'
```

with:

```ts
      visible: item.visible? item.visible(value): true,
      disabled: item.disabled? item.disabled(value): false
```

- [ ] **Step 3: Update `TableViewFactory.configureIcon` (icon visible)**

At line 47, replace:

```ts
      display: iconSource.display? iconSource.display(row): 'show'
```

with:

```ts
      visible: iconSource.visible? iconSource.visible(row): true
```

- [ ] **Step 4: Verify the library still fails ONLY on the template**

Run: `npm run build_lib`
Expected: FAIL — remaining errors now only in `ngx-aur-mat-table.component.html` / `icon-view.component.html` (`.display` no longer exists on the resolved view). Factory `.ts` errors are gone. Proceed to Task 3.

---

### Task 3: Update template predicates and commit the library change

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:167,208,212,213,237`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html:3`

- [ ] **Step 1: Update the three action `display` predicates**

In `ngx-aur-mat-table.component.html`, at lines 167, 208, and 237, replace each occurrence of:

```html
action.display !== 'none'
```

with:

```html
action.visible !== false
```

(There are exactly three — inside `*ngIf` on lines 167 and 237, and inside `<ng-container *ngIf=...>` on line 208.)

- [ ] **Step 2: Update the menu item `display` predicate**

At line 212, replace:

```html
                              *ngIf="item.display !== 'none'"
```

with:

```html
                              *ngIf="item.visible !== false"
```

- [ ] **Step 3: Update the menu item `disabled` binding**

At line 213, replace:

```html
                              [disabled]="item.disabled === 'true'"
```

with:

```html
                              [disabled]="item.disabled === true"
```

- [ ] **Step 4: Update the icon-view `display` predicate**

In `components/icon-view/icon-view.component.html` at line 3, replace:

```html
  <mat-icon *ngIf="view && view?.display !== 'none'"
```

with:

```html
  <mat-icon *ngIf="view && view?.visible !== false"
```

- [ ] **Step 5: Verify the library compiles clean**

Run: `npm run build_lib`
Expected: PASS — AOT template compilation succeeds, no `.display` references remain.

- [ ] **Step 6: Commit the library change**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts \
        projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html \
        projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html
git commit -m "refactor(api)!: replace display/disabled magic strings with boolean visible/disabled"
```

---

### Task 4: Update the library unit-test fixtures and assertions

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts:29,30,38,51,52,59,60`

- [ ] **Step 1: Update the menu fixture (function returns booleans)**

At lines 29–30, replace:

```ts
              display: (c) => (c.age < 21 ? 'none' : 'show'),
              disabled: (c) => (c.age < 21 ? 'true' : 'false'),
```

with:

```ts
              visible: (c) => c.age >= 21,
              disabled: (c) => c.age < 21,
```

- [ ] **Step 2: Update the "edit" assertions (default-show, default-enabled)**

At lines 51–52, replace:

```ts
    expect(edit.display).toBe('show');
    expect(edit.disabled).toBe('false');
```

with:

```ts
    expect(edit.visible).toBe(true);
    expect(edit.disabled).toBe(false);
```

- [ ] **Step 3: Update the "delete" per-row assertions**

At lines 59–60, replace:

```ts
    expect(del.display).toBe('none');
    expect(del.disabled).toBe('true');
```

with:

```ts
    expect(del.visible).toBe(false);
    expect(del.disabled).toBe(true);
```

- [ ] **Step 4: Update the now-stale test title (cosmetic)**

At line 38, replace:

```ts
  it('resolves menu item functions to strings per row', () => {
```

with:

```ts
  it('resolves menu item functions to booleans per row', () => {
```

- [ ] **Step 5: Run the full library test suite**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — all tests green (was 53/53 before this change; still 53/53).

- [ ] **Step 6: Commit the spec update**

```bash
git add projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts
git commit -m "test: migrate ActionViewFactory fixtures to boolean visible/disabled"
```

---

### Task 5: Migrate the demo consumers

**Files:**
- Modify: `projects/aur-demo/src/app/with-actions/table-with-actions/table-with-actions.component.ts:62,67`
- Modify: `projects/aur-demo/src/app/table-with-menu/table-with-menu.component.ts:46,52`
- Modify: `projects/aur-demo/src/app/table-with-icons/table-with-icons.component.ts:51`

- [ ] **Step 1: Migrate `table-with-actions.component.ts`**

At line 62, replace:

```ts
              disabled: (c) => (c.age < 18 ? 'true' : 'false')
```

with:

```ts
              disabled: (c) => c.age < 18
```

At line 67, replace:

```ts
              display: (c) => (c.age < 18 ? 'none' : 'show')
```

with:

```ts
              visible: (c) => c.age >= 18
```

- [ ] **Step 2: Migrate `table-with-menu.component.ts`**

At line 46, replace:

```ts
              disabled: (c) => (c.age < 18 ? 'true' : 'false')
```

with:

```ts
              disabled: (c) => c.age < 18
```

At line 52, replace:

```ts
              display: (c) => (c.age < 18 ? 'none' : 'show')
```

with:

```ts
              visible: (c) => c.age >= 18
```

- [ ] **Step 3: Migrate `table-with-icons.component.ts`**

At line 51, replace:

```ts
            display: v => v.rowSrc.name.length % 2 == 0? 'none': 'show'
```

with:

```ts
            visible: v => v.rowSrc.name.length % 2 !== 0
```

- [ ] **Step 4: Verify the demo AOT-compiles**

Run: `npx ng build aur-demo`
Expected: Template/type compilation succeeds. The ONLY acceptable error is the pre-existing bundle-size budget ERROR (`exceeds maximum budget`, ~1.10MB > 1.00MB) — that is unrelated and out of scope. No NG/type errors about `display`/`visible`/`disabled`.

- [ ] **Step 5: Commit the demo migration**

```bash
git add projects/aur-demo/src/app/with-actions/table-with-actions/table-with-actions.component.ts \
        projects/aur-demo/src/app/table-with-menu/table-with-menu.component.ts \
        projects/aur-demo/src/app/table-with-icons/table-with-icons.component.ts
git commit -m "refactor(demo): migrate to boolean visible/disabled API"
```

---

### Task 6: Document the breaking change in the changelog

**Files:**
- Modify: `changelog/19.2.0.md`

- [ ] **Step 1: Append the third breaking section**

Add this section to the end of `changelog/19.2.0.md`:

```markdown
## Breaking: `display` / `disabled` are now booleans (`visible`)

The `display` control field (on `IconView`, `Action`, and `MenuItem`) was renamed to
`visible` and changed from the strings `'show' | 'none'` to `boolean`. `MenuItem.disabled`
changed from the strings `'true' | 'false'` to `boolean`. These fields are now fully
type-checked in both static and `(value) => …` function form.

| Field | Old | New |
|---|---|---|
| `IconView.display` | `'show' \| 'none'` | `visible: boolean` |
| `Action.display` | `'show' \| 'none'` | `visible: boolean` |
| `MenuItem.display` | `'show' \| 'none'` | `visible: boolean` |
| `MenuItem.disabled` | `'true' \| 'false'` | `disabled: boolean` |

Semantics: `visible` — `undefined`/`true` shows, `false` hides (note the inversion from
`'none'`). `disabled` — `undefined`/`false` enables, `true` disables.

### Migration

Replace `display` with `visible` and return booleans instead of the control strings.
Remember to invert the visibility predicate (`'none'` meant *hidden*):

```ts
// before
display:  (c) => (c.age < 18 ? 'none' : 'show'),
disabled: (c) => (c.age < 18 ? 'true' : 'false'),

// after
visible:  (c) => c.age >= 18,
disabled: (c) => c.age < 18,
```
```

- [ ] **Step 2: Commit the changelog**

```bash
git add changelog/19.2.0.md
git commit -m "docs(changelog): document display/disabled -> boolean visible/disabled"
```

---

## Final verification (run after all tasks)

- [ ] `npm run build_lib` → PASS (library AOT clean)
- [ ] `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` → PASS (53/53)
- [ ] `npx ng build aur-demo` → only the pre-existing bundle-budget ERROR, no type/binding errors
- [ ] Grep check — no stray references survive:

```bash
git grep -nE "\.display\b" -- projects/ngx-aur-mat-table/src projects/aur-demo/src
```
Expected: no matches for the **config** `display` field. (Matches for `_displayColumns`, `displayColumns`, CSS `display:` in `.scss`, and the `index.html` font URL are unrelated and fine.)
