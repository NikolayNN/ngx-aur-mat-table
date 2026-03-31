# Bug Report: ngx-aur-mat-table

Date: 2026-03-31

---

## 1. CRITICAL: `SelectionProviderDummy.isEnabled = true` instead of `false`

**File:** `projects/ngx-aur-mat-table/src/lib/providers/SelectionProvider.ts:87`

```typescript
export class SelectionProviderDummy<T> extends SelectionProvider<T> {
  public override readonly isEnabled = true; // BUG: should be false
```

All other dummy providers (Index, Pagination, TotalRow, DragDrop, Timeline, RowAction) set `isEnabled = false`. Only `SelectionProviderDummy` has `true`. In the template `*ngIf="selectionProvider.isEnabled"` is always truthy, so Angular creates the checkbox column definition even when selection is disabled. The column won't render (it's not in `_displayColumns`), but:
- unnecessary DOM nodes are created
- any code checking `selectionProvider.isEnabled` for business logic gets `true` when selection is off

**Fix:** change to `public override readonly isEnabled = false;`

---

## 2. CRITICAL: Search filter and programmatic filters conflict

**File:** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:368-401`

`applySearchFilter` uses the default `filterPredicate` and sets `filter` to the search text. `applyFiltersInternal` **replaces** `filterPredicate` with custom logic and sets `filter = 'trigger-' + Math.random()`.

Problems:
- User types in search, then a programmatic filter is applied -> search is lost
- Programmatic filter is active, user types in search -> `applySearchFilter` changes `filter`, but `filterPredicate` is still custom and **ignores** the filter string — search doesn't work
- `clearFilters()` resets custom filters, but the search text remains in the input while `filterPredicate` has been overwritten

Two filtering mechanisms fight over a single `MatTableDataSource.filter` / `filterPredicate`.

**Fix:** combine both mechanisms in a single `filterPredicate` that checks both the search term and custom filters.

---

## 3. HIGH: `removeWrongKeysFromDisplayColumns` breaks auto-generated columns

**File:** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:349-351`

```typescript
private removeWrongKeysFromDisplayColumns() {
  const whiteKeys = new Set(this.tableConfig.columnsCfg.map(cfg => cfg.key));
  this.displayColumns = this._displayColumns.filter(...); // calls the setter
}
```

The `displayColumns` setter sets `_customDisplayColumnsEnabled = true`. After the first `prepareTableData`, even if the user did NOT provide custom `displayColumns`, the flag is permanently `true`. On the next `refreshTable()` -> `initTable()`, the check `!_customDisplayColumnsEnabled` is false, and columns from `tableConfig.columnsCfg` are no longer regenerated.

If `tableConfig.columnsCfg` changes (column added/removed), auto-generation of `_displayColumns` won't fire.

**Fix:** assign to `this._displayColumns` directly instead of using the setter, or introduce a separate internal method that doesn't set `_customDisplayColumnsEnabled`.

---

## 4. HIGH: `updateColumnOffsets` counts wrong `th` elements when extra header rows exist

**File:** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:290-298`

```typescript
const offsets = Array.from(this.table.nativeElement.querySelectorAll('th'))
  .map((c, index) => ({
    left: c.offsetLeft,
    width: c.offsetWidth,
    key: this._displayColumns[index]  // index doesn't match
  }));
```

`querySelectorAll('th')` returns **all** `<th>` from **all** header rows (main + extra top + extra bottom). If `extraHeaderCellTopTemplate` is present and there are 5 columns, 10+ `<th>` elements are returned, but `_displayColumns` only has 5 keys. For elements with `index >= 5`, the key will be `undefined`.

**Fix:** scope the query to the main header row only, e.g. `querySelectorAll('tr.mat-mdc-header-row:not(.extra-header-top-row):not(.extra-header-bottom-row) th')` or use a `@ViewChildren` query for the main header cells.

---

## 5. HIGH: Debug `console.log` left in production + Map.forEach arguments swapped

**File:** `projects/ngx-aur-mat-table/src/lib/drag-drop/drag-preview-manager.ts:26`

```typescript
this.previewStorage.forEach((k, v) => console.log('key', k, 'value', v))
```

1. This debug log runs on **every** drag start in production
2. `Map.forEach` passes `(value, key)`, but the variables are named `(k, v)` — in the log, key and value are printed backwards

**Fix:** remove the `console.log` line entirely.

---

## 6. HIGH: `endDrag` doesn't clear state when `afterDropFn` returns null

**File:** `projects/ngx-aur-mat-table/src/lib/drag-drop/aur-drag-drop.manager.ts:123-129`

```typescript
mapping.afterDropFn(dropContext)?.pipe(first())
  .pipe(finalize(() => {
    this.dropEvent = undefined;
    this.startDragEvent = undefined;
  })).subscribe();
```

If `afterDropFn` returns `null`/`undefined`, `?.pipe()` won't execute, `finalize` won't fire, and `dropEvent` + `startDragEvent` remain in a "dirty" state. The next drag-and-drop operation may behave unpredictably.

**Fix:** clear `dropEvent` and `startDragEvent` unconditionally after the `if` block, or handle the null case explicitly:
```typescript
const obs = mapping.afterDropFn(dropContext);
if (obs) {
  obs.pipe(first(), finalize(() => this.clearDragState())).subscribe();
} else {
  this.clearDragState();
}
```

---

## 7. MEDIUM: `|| ''` hides the value `0` in totals

**File:** template `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`, lines 113, 226, 345

```html
{{ totalRowProvider.totals.get(columnConfig.key) || '' }}
{{ totalRowProvider.totals.get(indexProvider.COLUMN_NAME) || '' }}
{{ totalRowProvider.totals.get(columnName) || '' }}
```

If the total value is `0`, the `||` operator treats it as falsy and displays an empty string instead of `0`.

**Fix:** use `?? ''` instead of `|| ''`.

---

## 8. MEDIUM: DOM query in `ngAfterViewChecked` — performance + ExpressionChanged risk

**File:** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:270-272`

`ngAfterViewChecked` runs on **every** change detection cycle. Inside it, `querySelectorAll('th')` is a DOM query. Although there's a diff check via `OffsetUtil.areNotEqual`, the DOM query itself runs every time.

Additionally, `columnOffsets.emit(offsets)` inside `ngAfterViewChecked` can trigger `ExpressionChangedAfterItHasBeenChecked` in the parent component if it binds to this output.

**Fix:** use `ResizeObserver` callback (already set up in `ngAfterViewInit`) instead of `ngAfterViewChecked` for offset updates, and remove the `ngAfterViewChecked` hook entirely. Or debounce the emit.

---

## 9. MEDIUM: `ContainsStringIgnoreCase` — incorrect behavior when `value = null`

**File:** `projects/ngx-aur-mat-table/src/lib/filters/NgxAurFilters.ts:146-150`

```typescript
return (data) => {
  const given = this.extractProperty(data);
  return given?.toLowerCase().includes(this.value?.toLowerCase());
};
```

If `this.value` is `null` or `undefined`, then `this.value?.toLowerCase()` returns `undefined`. `String.prototype.includes(undefined)` converts `undefined` to the string `"undefined"` and searches for it in the data. A string like `"I'm undefined"` would pass this filter.

**Fix:** add a guard: `if (!this.value) return true;` (or `return false;` depending on desired semantics).

---

## 10. MEDIUM: `EmptyValue.RESIZE_OBSERVER` created at module load time — breaks SSR

**File:** `projects/ngx-aur-mat-table/src/lib/model/EmptyValue.ts:41-42`

```typescript
public static readonly RESIZE_OBSERVER = new ResizeObserver(() => {})
```

`ResizeObserver` is a browser API. When using Angular Universal (SSR), this code crashes on import because `ResizeObserver` is not defined on the server.

**Fix:** use lazy initialization or a factory method that checks `typeof ResizeObserver !== 'undefined'`.

---

## 11. LOW: `hoverTimer` — dead code

**File:** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:509, 511`

```typescript
private hoverTimer: any = null;

ngOnDestroy() {
  clearTimeout(this.hoverTimer);  // hoverTimer is never set anywhere
```

The variable is declared and cleared in `ngOnDestroy`, but never assigned anywhere in the code.

**Fix:** remove both the declaration and the `clearTimeout` call.

---

## 12. LOW: `DragDropMappingManager` — duplicate mapping silently overwritten

**File:** `projects/ngx-aur-mat-table/src/lib/drag-drop/drag-drop-mapping-manager.ts:23-26`

```typescript
if (this.mappingsStorage.has(key)) {
  console.log(`WARN: duplicate drag drop mapping: ${key}`);  // console.log instead of console.warn
}
this.mappingsStorage.set(key, mapping)  // silently overwrites
```

Uses `console.log` instead of `console.warn`, and the duplicate is silently overwritten without error. In production this quietly loses the previous mapping.

**Fix:** use `console.warn` and consider throwing an error or at least making the warning more visible.

---

## 13. LOW: `ColumnViewComponent` — unused import `OnInit`

**File:** `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.ts:1`

```typescript
import {Component, Input, OnInit} from '@angular/core';
```

`OnInit` is imported but not used by the class.

**Fix:** remove `OnInit` from the import.

---

## 14. LOW: `DragPreviewManager.removePreview` — potential crash

**File:** `projects/ngx-aur-mat-table/src/lib/drag-drop/drag-preview-manager.ts:47`

```typescript
document.body.removeChild(this.currentPreviewComponentRef.location.nativeElement);
```

If the element was already removed from the DOM (e.g. by a third-party script), `removeChild` will throw a `NotFoundError`.

**Fix:** wrap in a check: `if (nativeElement.parentNode) { nativeElement.parentNode.removeChild(nativeElement); }`

---

## Summary

| Priority | # | Issue |
|---|---|---|
| CRITICAL | 1 | `SelectionProviderDummy.isEnabled = true` |
| CRITICAL | 2 | Search filter and programmatic filters conflict |
| HIGH | 3 | `removeWrongKeysFromDisplayColumns` breaks auto-generated columns |
| HIGH | 4 | `updateColumnOffsets` counts th from all header rows |
| HIGH | 5 | Debug `console.log` + swapped arguments in drag preview |
| HIGH | 6 | `endDrag` doesn't clear state on null from `afterDropFn` |
| MEDIUM | 7 | `\|\| ''` hides the value `0` in totals |
| MEDIUM | 8 | DOM query in `ngAfterViewChecked` + ExpressionChanged risk |
| MEDIUM | 9 | `ContainsStringIgnoreCase` with null value searches for "undefined" |
| MEDIUM | 10 | `ResizeObserver` in static field breaks SSR |
| LOW | 11 | Dead code: `hoverTimer` |
| LOW | 12 | Duplicate drag mapping silently overwritten |
| LOW | 13 | Unused import `OnInit` |
| LOW | 14 | `removePreview` potential crash |
