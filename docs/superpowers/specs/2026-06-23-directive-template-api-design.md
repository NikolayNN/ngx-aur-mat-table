# Directive-based template API — Design

**Date:** 2026-06-23
**Status:** Approved (brainstorm) — ready for plan
**Target version:** 19.10.0 (minor; breaking, per repo precedent — 19.2.0/19.9.0 also shipped breaks as minors)

## Problem

The library delivers most projected templates through structural directives
(`ngxAurCellDef`, `ngxAurTableSubFooterRow`), but four templates are still
passed as `@Input() TemplateRef`:

| `@Input` (today) | Renders | Context (today) |
|---|---|---|
| `extendedRowTemplate` | detail (expanded) row body | `{$implicit: element}` |
| `timelineMarkerTemplate` | timeline row marker | `{$implicit: element}` |
| `extraHeaderCellTopTemplate` | extra header cell (top) | `{key, index}` |
| `extraHeaderCellBottomTemplate` | extra header cell (bottom) | `{key, index}` |

`element` is the `TableRow<T>` wrapper (`.rowSrc`, `.id`). This inconsistency
forces consumers to learn two delivery styles and exposes the internal
`TableRow` wrapper as the row template's `$implicit`.

## Goal

Convert all four templates to structural directives that mirror `ngxAurCellDef`,
and enrich the row-level template context so `$implicit` is the source object,
not the `TableRow` wrapper. One coherent breaking release.

## Decisions (from brainstorming)

1. **Scope:** all four templates in one feature.
2. **Back-compat:** clean break — the `@Input`s are removed, not deprecated.
3. **Naming:** `*Def` family, consistent with `ngxAurCellDef` / Material's
   `matCellDef`.
4. **Context:** enrich the **row** context (`ngxAurExpandedRowDef`,
   `ngxAurRowMarkerDef`) to a `ngxAurCellDef`-style object; extra-header context
   stays `{key, index}`.
5. **Version:** 19.10.0 (minor).

## Architecture

Reuse the `ngxAurCellDef` mechanism verbatim:

- Each directive is `standalone: false`, captures `TemplateRef` in its
  constructor, and is declared + exported in `NgxAurMatTableModule`.
- The component collects each via `@ContentChildren(Dir, {descendants: true})`
  and, in `ngAfterContentInit`, resolves the **first** instance into a field,
  subscribing to `.changes` and calling `cdr.markForCheck()` (OnPush-safe,
  handles templates that appear/disappear behind `*ngIf`). Dev-mode `console.warn`
  if more than one instance of a single-slot directive is projected.
- The HTML renders each through `*ngTemplateOutlet` (already the case for
  three of the four; only the delivery source changes).

### Directives

| Class | Selector | File | Context type |
|---|---|---|---|
| `NgxAurExpandedRowDefDirective` | `[ngxAurExpandedRowDef]` | `directive/ngx-aur-expanded-row-def.directive.ts` | `AurRowContext<T>` |
| `NgxAurRowMarkerDefDirective` | `[ngxAurRowMarkerDef]` | `directive/ngx-aur-row-marker-def.directive.ts` | `AurRowContext<T>` |
| `NgxAurExtraHeaderTopDefDirective` | `[ngxAurExtraHeaderTopDef]` | `directive/ngx-aur-extra-header-top-def.directive.ts` | `AurExtraHeaderContext` |
| `NgxAurExtraHeaderBottomDefDirective` | `[ngxAurExtraHeaderBottomDef]` | `directive/ngx-aur-extra-header-bottom-def.directive.ts` | `AurExtraHeaderContext` |

Each directive body matches `NgxAurCellDefDirective`, minus the `key` input
(these are single-slot, no column key):

```ts
@Directive({ selector: '[ngxAurExpandedRowDef]', standalone: false })
export class NgxAurExpandedRowDefDirective {
  constructor(public templateRef: TemplateRef<AurRowContext<any>>) {}
}
```

### New context types

`model/AurRowContext.ts`:

```ts
import { TableRow } from './TableRow';

/** Контекст row-level шаблонов (ngxAurExpandedRowDef / ngxAurRowMarkerDef). */
export interface AurRowContext<T = any> {
  /** Исходный объект строки (row.rowSrc). */
  $implicit: T;
  /** Строка таблицы: .rowSrc — исходный объект T, .id — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.id. */
  index: number;
}
```

`model/AurExtraHeaderContext.ts`:

```ts
/** Контекст extra-header шаблонов (ngxAurExtraHeaderTopDef / *BottomDef). */
export interface AurExtraHeaderContext {
  /** Ключ колонки. */
  key: string;
  /** Индекс колонки. */
  index: number;
}
```

`AurRowContext` mirrors `AurCellContext` minus `value`. `$implicit` is `rowSrc`
(not the wrapper) — this is the context-enrichment break.

### Component changes (`ngx-aur-mat-table.component.ts`)

- Remove the four `@Input()` lines (143, 146, 158, 166).
- Add four `@ContentChildren` queries + resolved fields, wired in the existing
  `ngAfterContentInit` alongside `rebuildCellTemplates`.
- Expose effective templates via getters used by the HTML:
  `expandedRowTemplate`, `rowMarkerTemplate`, `extraHeaderTopTemplate`,
  `extraHeaderBottomTemplate`.
- Add `rowCtx(element: TableRow<T>): AurRowContext<T>` mirroring `cellCtx`:
  `{ $implicit: element.rowSrc, row: element, rowSrc: element.rowSrc, index: element.id }`.

### Template changes (`ngx-aur-mat-table.component.html`)

Rename the four references to the new getters and feed the enriched context to
the two row templates:

- line 39: `[multiTemplateDataRows]="expandedRowTemplate !== null"`
- lines 76–77: `*ngIf="rowMarkerTemplate"` + outlet context `rowCtx(element)`
- lines 416/428/439/451: `extraHeaderTopTemplate` / `extraHeaderBottomTemplate`
- lines 472/487/494: `expandedRowTemplate`; outlet context `rowCtx(element)`

### Module + public API

- `ngx-aur-mat-table.module.ts`: declare + export the four directives.
- `public-api.ts`: export the four directive files + `AurRowContext` +
  `AurExtraHeaderContext`.

## Breaking changes (→ `docs/MIGRATION-19.10.0.md`)

**a) Delivery — every consumer rewires `[input]="tpl"` → projected directive:**

```html
<!-- before -->
<aur-mat-table [tableData]="d" [tableConfig]="c" [extendedRowTemplate]="rowTpl"></aur-mat-table>
<ng-template #rowTpl let-row>…</ng-template>

<!-- after -->
<aur-mat-table [tableData]="d" [tableConfig]="c">
  <ng-template ngxAurExpandedRowDef let-rowSrc let-row="row">…</ng-template>
</aur-mat-table>
```

Mapping: `[extendedRowTemplate]`→`ngxAurExpandedRowDef`,
`[timelineMarkerTemplate]`→`ngxAurRowMarkerDef`,
`[extraHeaderCellTopTemplate]`→`ngxAurExtraHeaderTopDef`,
`[extraHeaderCellBottomTemplate]`→`ngxAurExtraHeaderBottomDef`.

**b) Context — `$implicit` of the two row templates is now `rowSrc`, not the
`TableRow` wrapper.** To keep referencing the wrapper, bind `let-row="row"`.

- timeline today: `let-element` + `element.rowSrc.status` → either
  `let-element` (now rowSrc) + `element.status`, or `let-element="row"` +
  `element.rowSrc.status`.
- expanded today: `let-row` + `[row]="row"` (wrapper) → `let-row="row"` to keep
  passing the wrapper, or `let-row` (now rowSrc) and pass the source.

Extra-header context is unchanged (`let-key="key" let-index="index"`); only the
delivery changes.

## Affected internal consumers (migrated in this feature)

- Demo pages: `table-expanding-row`, `table-timeline`, `table-with-top-column`
  (`app-row-details` keeps receiving the wrapper via `let-row="row"`).
- Existing specs that bind `[extendedRowTemplate]`
  (`ngx-aur-mat-table-expanded-rows.spec.ts` and any others) rewired to the
  directive form.

## Testing

- One spec per directive: renders the projected template; for row directives the
  enriched-context fields (`$implicit`/`rowSrc`/`row`/`index`) are correct; for
  extra-header the `{key, index}` context is correct.
- Dev-mode warning fires when two instances of a single-slot directive are
  projected.
- Timing regression: a table with `ngxAurExpandedRowDef` enables
  `multiTemplateDataRows` and renders the detail row on first paint (guards the
  one real lifecycle risk — see Risks).
- Full suite stays green after demo + spec migration.

## Risks

- **`multiTemplateDataRows` timing.** Read by the inner `mat-table` after the
  host's `ngAfterContentInit` (parent content-init precedes child
  view-component init), so the getter is populated before `mat-table` reads it.
  Pinned by the timing regression test above; if it ever regresses, fall back to
  binding `multiTemplateDataRows` to a field set in `ngAfterContentInit` +
  `markForCheck`.
- **OnPush reactivity.** Templates projected behind `*ngIf` are handled by the
  `.changes` subscription + `markForCheck`, identical to `ngxAurCellDef`.

## Out of scope

- Enriching the extra-header context (kept `{key, index}`).
- Deprecation/back-compat shim for the removed `@Input`s (clean break by
  decision).
- Converting `ngxAurTableSubFooterRow` (already a directive, different
  content-projection mechanism — not affected).
