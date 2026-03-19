# Table Modern Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rounded outer borders, comfortable column spacing, and styled header row to aur-mat-table via CSS custom properties.

**Architecture:** CSS-only changes in a single SCSS file. All new values use CSS custom properties with defaults so consumers can customize or revert.

**Tech Stack:** SCSS, Angular Material MDC table, CSS custom properties

---

## File Structure

- **Modify:** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss` — all changes happen here

---

### Task 1: Add border, border-radius, and overflow: clip to .table-container

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss:14-21`

- [ ] **Step 1: Add border and border-radius with CSS custom properties**

In the existing `.aur-mat-table .table-container` rule (line 14), add three new properties after `position: relative;`:

```scss
.aur-mat-table .table-container {
  position: relative;
  border: var(--aur-table-border-width, 1px) solid var(--aur-table-border-color, #bdbdbd);
  border-radius: var(--aur-table-border-radius, 10px);
  overflow: clip;

  &.bottom-pagination {
    flex-grow: 1;
    overflow: auto;
  }
}
```

Note: `overflow: clip` is used instead of `overflow: hidden` to avoid breaking `position: sticky` headers. The nested `.bottom-pagination` rule overrides `overflow` to `auto` due to higher specificity.

- [ ] **Step 2: Build the library to verify no errors**

Run: `npx ng build ngx-aur-mat-table`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss
git commit -m "style: add rounded outer border to table container"
```

---

### Task 2: Fix unscoped td selector and increase cell padding

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss:23-26`

- [ ] **Step 1: Replace the existing padding rule**

Replace lines 23-26:

```scss
/* BEFORE */
.aur-mat-table th, td {
  padding-right: 4px !important;
  padding-left: 4px !important;
}
```

With:

```scss
/* AFTER */
.aur-mat-table th,
.aur-mat-table td {
  padding-right: var(--aur-table-cell-padding, 12px) !important;
  padding-left: var(--aur-table-cell-padding, 12px) !important;
}
```

This fixes the unscoped `td` selector (was missing `.aur-mat-table` prefix) and changes the default padding from `4px` to `12px` via CSS custom property.

- [ ] **Step 2: Build the library to verify no errors**

Run: `npx ng build ngx-aur-mat-table`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss
git commit -m "style: fix unscoped td selector, increase cell padding to 12px"
```

---

### Task 3: Style header rows with background and bold font

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss` — add new rules after the `.text-right` block

- [ ] **Step 1: Add header row background and font-weight rules**

Add these two new rules immediately after the `.aur-mat-table .text-right` rule block (find by content, not line number — prior tasks shift lines):

```scss
.aur-mat-table .mat-mdc-header-row {
  background-color: var(--aur-table-header-bg, #fafafa);
}

.aur-mat-table .mat-mdc-header-cell {
  font-weight: var(--aur-table-header-font-weight, 700);
}
```

- [ ] **Step 2: Build the library to verify no errors**

Run: `npx ng build ngx-aur-mat-table`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss
git commit -m "style: add header row background and bold font"
```

---

### Task 4: Visual verification in demo app

- [ ] **Step 1: Serve the demo app**

Run: `npx ng serve aur-demo`
Open: `http://localhost:4200`

- [ ] **Step 2: Verify visually across demo tabs**

Check these tabs for correct rendering:
- "Минимальная" — basic table should have rounded borders, 12px padding, bold header with #fafafa background
- "С пагинацией FULL" — paginator should sit below the bordered table area
- "Sticky" — sticky headers must still work (not broken by overflow: clip)
- "Drag" — drag-and-drop should still work
- Any tab with expanded rows — expansion animation should work correctly
- Any tab with the header settings button (gear icon) — should render correctly, not clipped by overflow: clip

- [ ] **Step 3: Final commit if any tweaks needed**

If visual issues found, fix and commit. Otherwise, no action needed.
