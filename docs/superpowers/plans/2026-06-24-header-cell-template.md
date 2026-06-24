# Кастомный `<ng-template>` для заголовков колонок (`ngxAurHeaderCellDef`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать потребителю escape-hatch — отрисовать `<th>` конкретной колонки произвольным `<ng-template ngxAurHeaderCellDef="key">`, когда `name`/`headerView` недостаточно (селектор, фильтр-инпут, toggle, сложная вёрстка).

**Architecture:** Keyed-директива-проекция `NgxAurHeaderCellDefDirective` (зеркало `ngxAurCellDef`) собирается компонентом через `@ContentChildren` в карту `key → директива` (нужны `templateRef` + флаг `ownsCell`). Заголовок колонки получает приоритетную ветку: есть шаблон → `ngTemplateOutlet` с контекстом `{ $implicit: column, column, key, sort, filter }`, иначе текущая логика (`lib-column-view`). Сосуществование с сортировкой настраивается per-column: по умолчанию шаблон рендерится **внутри** `mat-sort-header` (стрелка/клик сохраняются), флаг `ownsCell` убирает `mat-sort-header` и отдаёт `<th>` шаблону целиком. Чисто аддитивно — без шаблона поведение байт-в-байт прежнее.

**Tech Stack:** Angular 19.2, Angular Material 18.2 (MDC), Jasmine 3.10 + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-24-header-cell-template-design.md`

**Контекст ветки:** `feat/header-cell-template` (создана от master, спека уже закоммичена). Один коммит на фичу в конце плана (Task 4) — промежуточные таски оставляют незакоммиченные изменения для следующего сабагента. Целевой релиз — minor (номер на момент релиза). Changelog — при бампе, не в этом коммите.

## Global Constraints

- Angular 19.2, Angular Material 18.2 (MDC-классы: `tr.mat-mdc-header-row`, `th.mat-mdc-header-cell`, `tr.mat-mdc-row`, `td.mat-mdc-cell`).
- Все директивы/компоненты библиотеки — `standalone: false` (модульная регистрация).
- Аддитивно: без шаблона `headerTpl(key)` === `null` → `builtinHeader`, `isHeaderSortHeader(col)` === `isFeatureEnabled(col.sort)`. Существующее поведение заголовков не меняется.
- Шаблон **побеждает** `name`/`headerView`; затрагивает только обычные data-колонки (по `ColumnConfig.key`). Спец-колонки (selection/index/action/drag/timeline) и строка «Итого» — вне scope.
- JSDoc на русском (как в существующих директивах/моделях).
- Один коммит на фичу (Task 4). Файл `.claude/settings.local.json` в коммит НЕ попадает.

---

## File Structure

**Создаются:**
- `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-header-cell-def.directive.ts` — директива `[ngxAurHeaderCellDef]` (`key` + `ownsCell`).
- `projects/ngx-aur-mat-table/src/lib/model/AurHeaderCellContext.ts` — интерфейсы контекста + хэндлов.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-header-cell-template.spec.ts` — спек (~12 тестов).
- `projects/aur-demo/src/app/table-with-header-cell-template/table-with-header-cell-template.component.ts` / `.html` / `.scss` — демо.

**Меняются:**
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` — declare + export директивы.
- `projects/ngx-aur-mat-table/src/public-api.ts` — экспорт директивы и контекста.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — `@ContentChildren`, карта, `headerCtx`/`isHeaderSortHeader`/`headerTpl`, lifecycle.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — условие ветки + тело `#headerValue`.
- `projects/aur-demo/src/app/app.module.ts` — регистрация демо.
- `projects/aur-demo/src/app/app.component.html` — вкладка демо.
- `README.md` — секция «Кастомный шаблон заголовка».

---

### Task 1: Директива + контекст + регистрация + красный спек

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-header-cell-def.directive.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/model/AurHeaderCellContext.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-header-cell-template.spec.ts`

**Interfaces:**
- Produces: `NgxAurHeaderCellDefDirective` (`@Input('ngxAurHeaderCellDef') key: string`, `@Input({transform: booleanAttribute}) ownsCell: boolean`, `templateRef: TemplateRef<AurHeaderCellContext>`); `AurHeaderCellContext<T>` / `AurHeaderSortHandle` / `AurHeaderFilterHandle<T>`. Task 2 потребляет оба.

Директива и интерфейсы создаются и регистрируются **в этом таске**, чтобы спек компилировался (атрибуты `ngxAurHeaderCellDef` и `ownsCell` известны Angular). Компонент ещё НЕ собирает и НЕ рендерит header-шаблоны — поэтому новые тесты падают на ассертах (чистый красный), а не на ошибке компиляции шаблона.

- [ ] **Step 1.1: Директива.** Создать `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-header-cell-def.directive.ts`:

```ts
import { booleanAttribute, Directive, Input, TemplateRef } from '@angular/core';
import { AurHeaderCellContext } from '../model/AurHeaderCellContext';

/**
 * Кастомный шаблон заголовка одной колонки.
 * Ставится на <ng-template>, спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurHeaderCellDef="status" let-column let-sort="sort">…</ng-template>
 * Значение атрибута — ColumnConfig.key колонки, к заголовку которой применяется шаблон.
 */
@Directive({
  selector: '[ngxAurHeaderCellDef]',
  standalone: false,
})
export class NgxAurHeaderCellDefDirective {
  /** Ключ колонки (ColumnConfig.key). */
  @Input('ngxAurHeaderCellDef') key!: string;

  /**
   * true — шаблон занимает весь <th> без mat-sort-header (sort пересобирается из контекста).
   * По умолчанию false: шаблон рендерится внутри mat-sort-header (встроенные стрелка и клик
   * сохраняются). Действует только на сортируемых колонках; на несортируемой — no-op.
   */
  @Input({ transform: booleanAttribute }) ownsCell = false;

  constructor(public templateRef: TemplateRef<AurHeaderCellContext>) {}
}
```

- [ ] **Step 1.2: Контекст.** Создать `projects/ngx-aur-mat-table/src/lib/model/AurHeaderCellContext.ts`:

```ts
import { ColumnConfig } from './ColumnConfig';
import { NgxAurFilters } from '../filters/NgxAurFilters';

/** Хэндл сортировки колонки в контексте header-шаблона (ngxAurHeaderCellDef). */
export interface AurHeaderSortHandle {
  /** Колонка сконфигурирована сортируемой (ColumnConfig.sort активен). */
  sortable: boolean;
  /** Эта колонка — текущая активная сортировка. */
  active: boolean;
  /** Текущее направление: 'asc' | 'desc' | '' ('' когда колонка не активна). */
  direction: 'asc' | 'desc' | '';
  /** Переключить сортировку по этой колонке (asc → desc → clear → …). */
  toggle: () => void;
}

/** Хэндл фильтра колонки (обёртка над публичным applyFilter/removeFilter, filterName = column.key). */
export interface AurHeaderFilterHandle<T = any> {
  /** Применить фильтр к этой колонке (filterName = column.key). */
  apply: (filter: NgxAurFilters.Base<T>) => void;
  /** Снять фильтр этой колонки. */
  remove: () => void;
  /** Активен ли сейчас фильтр этой колонки (filterStorage.has(key)). */
  active: boolean;
}

/** Контекст, передаваемый в кастомный шаблон заголовка (ngxAurHeaderCellDef). */
export interface AurHeaderCellContext<T = any> {
  /** Конфиг колонки (для let-column). */
  $implicit: ColumnConfig<T>;
  /** Именованный алиас $implicit. */
  column: ColumnConfig<T>;
  /** Ключ колонки (ColumnConfig.key). */
  key: string;
  /** Хэндл сортировки колонки. */
  sort: AurHeaderSortHandle;
  /** Хэндл фильтра колонки. */
  filter: AurHeaderFilterHandle<T>;
}
```

- [ ] **Step 1.3: Регистрация в модуле.** В `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` после строки импорта `NgxAurExtraHeaderBottomDefDirective` (строка 22) добавить:

```ts
import {NgxAurHeaderCellDefDirective} from './directive/ngx-aur-header-cell-def.directive';
```

В массиве `declarations` заменить:

```ts
    NgxAurExtraHeaderTopDefDirective,
    NgxAurExtraHeaderBottomDefDirective
  ],
```

на:

```ts
    NgxAurExtraHeaderTopDefDirective,
    NgxAurExtraHeaderBottomDefDirective,
    NgxAurHeaderCellDefDirective
  ],
```

В массиве `exports` заменить:

```ts
    NgxAurExtraHeaderTopDefDirective,
    NgxAurExtraHeaderBottomDefDirective
  ]
})
```

на:

```ts
    NgxAurExtraHeaderTopDefDirective,
    NgxAurExtraHeaderBottomDefDirective,
    NgxAurHeaderCellDefDirective
  ]
})
```

- [ ] **Step 1.4: Экспорт из public-api.** В `projects/ngx-aur-mat-table/src/public-api.ts` после строки `export * from './lib/directive/ngx-aur-extra-header-bottom-def.directive'` (строка 26) добавить:

```ts
export * from './lib/directive/ngx-aur-header-cell-def.directive'
```

И после строки `export * from './lib/model/AurRowContext';` (строка 29) добавить:

```ts
export * from './lib/model/AurHeaderCellContext';
```

- [ ] **Step 1.5: Спек.** Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-header-cell-template.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { TableRow } from './model/TableRow';
import { NgxAurFilters } from './filters/NgxAurFilters';

interface Row { name: string; status: string; amount: number; }

class StatusContains extends NgxAurFilters.ContainsStringIgnoreCase<Row> {
  extractProperty(data: TableRow<Row>): string { return data.rowSrc.status; }
}

function headerCellsOf(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-header-row th.mat-mdc-header-cell'));
}
function bodyRowsOf(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
}

// ---------- host A: render / context / fallback / keep-sort / ownsCell / wrapper / toggle ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <!-- ownsCell: своя кнопка-сортировка (toggle) + filter.active -->
      <ng-template ngxAurHeaderCellDef="status" ownsCell let-key="key" let-sort="sort" let-filter="filter">
        <button class="status-sort" (click)="sort.toggle()"
                [attr.data-active]="sort.active ? 'yes' : 'no'"
                [attr.data-dir]="sort.direction">sort</button>
        <button class="status-filter" [attr.data-fa]="filter.active ? 'yes' : 'no'">filter</button>
      </ng-template>
      <!-- keep-sort (default): косметический шаблон + проверка контекста -->
      <ng-template ngxAurHeaderCellDef="amount" let-column let-key="key" let-sort="sort">
        <span class="amount-h"
              [attr.data-key]="key"
              [attr.data-name]="column.name"
              [attr.data-sortable]="sort.sortable ? 'yes' : 'no'"
              [attr.data-active]="sort.active ? 'yes' : 'no'"
              [attr.data-dir]="sort.direction">{{ column.name }}</span>
      </ng-template>
    </aur-mat-table>`,
})
class HeaderHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },                                  // builtin (idx 0)
      { key: 'status', name: 'Status', valueConverter: v => v.status, sort: {}, align: 'center' },  // ownsCell (idx 1)
      { key: 'amount', name: 'Amount', valueConverter: v => v.amount, sort: {} },                   // keep-sort (idx 2)
    ],
  };
  data: Row[] = [{ name: 'Alice', status: 'OK', amount: 5 }, { name: 'Bob', status: 'FAIL', amount: 9 }];
}

describe('NgxAurMatTable header cell template', () => {
  let fixture: ComponentFixture<HeaderHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HeaderHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderHostComponent);
  });

  it('рендерит кастомный шаблон в заголовках status (ownsCell) и amount (keep-sort)', () => {
    fixture.detectChanges();
    const hc = headerCellsOf(fixture);
    expect(hc[2].querySelector('span.amount-h')!.textContent!.trim()).toBe('Amount');
    expect(hc[1].querySelector('button.status-sort')).not.toBeNull();
    expect(hc[1].querySelector('button.status-filter')).not.toBeNull();
  });

  it('fallback: колонка без шаблона рендерит lib-column-view', () => {
    fixture.detectChanges();
    const hc = headerCellsOf(fixture);
    expect(hc[0].querySelector('lib-column-view')).not.toBeNull();
    expect(hc[0].querySelector('span.amount-h')).toBeNull();
  });

  it('шаблон побеждает name/headerView: в заголовках status и amount нет lib-column-view', () => {
    fixture.detectChanges();
    const hc = headerCellsOf(fixture);
    expect(hc[1].querySelector('lib-column-view')).toBeNull();
    expect(hc[2].querySelector('lib-column-view')).toBeNull();
  });

  it('контекст: column/key/sort прокинуты в шаблон', () => {
    fixture.detectChanges();
    const span = headerCellsOf(fixture)[2].querySelector('span.amount-h') as HTMLElement;
    expect(span.getAttribute('data-key')).toBe('amount');
    expect(span.getAttribute('data-name')).toBe('Amount');
    expect(span.getAttribute('data-sortable')).toBe('yes');
    expect(span.getAttribute('data-active')).toBe('no');
    expect(span.getAttribute('data-dir')).toBe('');
  });

  it('keep-sort (default): th колонки amount несёт mat-sort-header и содержит шаблон', () => {
    fixture.detectChanges();
    const hc = headerCellsOf(fixture);
    expect(hc[2].classList).toContain('mat-sort-header');
    expect(hc[2].querySelector('span.amount-h')).not.toBeNull();
  });

  it('ownsCell: th колонки status БЕЗ mat-sort-header, шаблон владеет ячейкой', () => {
    fixture.detectChanges();
    const hc = headerCellsOf(fixture);
    expect(hc[1].classList).not.toContain('mat-sort-header');
    expect(hc[1].querySelector('button.status-sort')).not.toBeNull();
  });

  it('обёртка th сохраняется: ownsCell-заголовок status несёт класс выравнивания aur-align-center', () => {
    fixture.detectChanges();
    const hc = headerCellsOf(fixture);
    expect(hc[1].classList).toContain('aur-align-center');
    expect(hc[1].querySelector('button.status-sort')).not.toBeNull();
  });

  it('filter.active: изначально false (data-fa=no)', () => {
    fixture.detectChanges();
    const btn = headerCellsOf(fixture)[1].querySelector('button.status-filter') as HTMLElement;
    expect(btn.getAttribute('data-fa')).toBe('no');
  });

  it('sort.toggle(): клик по своей кнопке активирует сортировку колонки (matSort active+asc)', () => {
    fixture.detectChanges();
    (headerCellsOf(fixture)[1].querySelector('button.status-sort') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.table.matSort.active).toBe('status');
    expect(fixture.componentInstance.table.matSort.direction).toBe('asc');
  });
});

// ---------- host B: filter.apply / remove / active ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurHeaderCellDef="status" ownsCell let-filter="filter">
        <button class="apply" (click)="filter.apply(makeFilter())"
                [attr.data-fa]="filter.active ? 'yes' : 'no'">a</button>
        <button class="remove" (click)="filter.remove()">r</button>
      </ng-template>
    </aur-mat-table>`,
})
class FilterHeaderHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'status', name: 'Status', valueConverter: v => v.status, sort: {} }],
  };
  data: Row[] = [{ name: 'Alice', status: 'OK', amount: 1 }, { name: 'Bob', status: 'FAIL', amount: 2 }];
  makeFilter(): StatusContains { return new StatusContains('FAIL'); }
}

describe('NgxAurMatTable header cell template — filter handle', () => {
  let fixture: ComponentFixture<FilterHeaderHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [FilterHeaderHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FilterHeaderHostComponent);
  });

  function applyBtn(): HTMLElement {
    return headerCellsOf(fixture)[0].querySelector('button.apply') as HTMLElement;
  }

  it('apply фильтрует строки и поднимает active; remove возвращает', () => {
    fixture.detectChanges();
    expect(bodyRowsOf(fixture).length).toBe(2);
    expect(applyBtn().getAttribute('data-fa')).toBe('no');

    applyBtn().click();
    fixture.detectChanges();
    expect(bodyRowsOf(fixture).length).toBe(1);
    expect(applyBtn().getAttribute('data-fa')).toBe('yes');

    (headerCellsOf(fixture)[0].querySelector('button.remove') as HTMLElement).click();
    fixture.detectChanges();
    expect(bodyRowsOf(fixture).length).toBe(2);
    expect(applyBtn().getAttribute('data-fa')).toBe('no');
  });
});

// ---------- host C: динамика (*ngIf) ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-container *ngIf="show">
        <ng-template ngxAurHeaderCellDef="status" ownsCell>
          <span class="custom-h">custom</span>
        </ng-template>
      </ng-container>
    </aur-mat-table>`,
})
class DynamicHeaderHostComponent {
  show = false;
  cfg: TableConfig<Row> = { columnsCfg: [{ key: 'status', name: 'Status', valueConverter: v => v.status }] };
  data: Row[] = [{ name: 'Alice', status: 'OK', amount: 1 }];
}

describe('NgxAurMatTable header cell template — динамика', () => {
  let fixture: ComponentFixture<DynamicHeaderHostComponent>;
  let host: DynamicHeaderHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DynamicHeaderHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DynamicHeaderHostComponent);
    host = fixture.componentInstance;
  });

  it('появление шаблона через *ngIf переключает заголовок с builtin на кастом', () => {
    fixture.detectChanges();
    expect(headerCellsOf(fixture)[0].querySelector('lib-column-view')).not.toBeNull();
    expect(headerCellsOf(fixture)[0].querySelector('span.custom-h')).toBeNull();

    host.show = true;
    fixture.detectChanges();  // 1-й проход: QueryList.changes → rebuild + markForCheck
    fixture.detectChanges();  // 2-й проход: перерисовка заголовка с обновлённой картой
    expect(headerCellsOf(fixture)[0].querySelector('span.custom-h')).not.toBeNull();
  });
});

// ---------- host D: dev-warning на неизвестный ключ ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurHeaderCellDef="does-not-exist"><span>x</span></ng-template>
    </aur-mat-table>`,
})
class BadKeyHeaderHostComponent {
  cfg: TableConfig<Row> = { columnsCfg: [{ key: 'status', name: 'Status', valueConverter: v => v.status }] };
  data: Row[] = [{ name: 'Alice', status: 'OK', amount: 1 }];
}

describe('NgxAurMatTable header cell template — dev warning', () => {
  let fixture: ComponentFixture<BadKeyHeaderHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [BadKeyHeaderHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BadKeyHeaderHostComponent);
  });

  it('предупреждает о ngxAurHeaderCellDef с несуществующим ключом', () => {
    const warn = spyOn(console, 'warn');
    fixture.detectChanges();
    expect(warn).toHaveBeenCalled();
    expect(warn.calls.mostRecent().args[0]).toContain('does-not-exist');
  });
});
```

- [ ] **Step 1.6: Красный прогон.**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-header-cell-template.spec.ts'
```

Ожидание — спек **компилируется** (директива и `ownsCell` известны Angular), из 12 тестов **11 FAIL / 1 PASS**:
- PASS: «fallback: колонка без шаблона рендерит lib-column-view» (сегодня уже зелёный — все заголовки рендерят builtin).
- FAIL: остальные 11 — компонент ещё не собирает header-дефы, не рендерит шаблоны, не пишет warn; колонки `status`/`amount` пока рендерят `lib-column-view` внутри стандартных `<th>` (у обеих сортируемых — `mat-sort-header`).

Иное распределение (особенно **ошибка компиляции шаблона** `ngxAurHeaderCellDef`/`ownsCell`) — остановиться, проверить Steps 1.1–1.4, доложить.

---

### Task 2: Зелёный — сбор шаблонов в компоненте + ветка заголовка

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`

**Interfaces:**
- Consumes: `NgxAurHeaderCellDefDirective`, `AurHeaderCellContext<T>` (Task 1).
- Produces (используются в HTML): `headerTpl(key): TemplateRef<AurHeaderCellContext<T>> | null`, `isHeaderSortHeader(col: ColumnConfig<T>): boolean`, `headerCtx(col: ColumnConfig<T>): AurHeaderCellContext<T>`.

- [ ] **Step 2.1: Импорты.** В `ngx-aur-mat-table.component.ts` заменить строку импорта `ColumnConfig`-модуля (строка 24):

```ts
import {ColumnAlign, ColumnView, RowValue, TableConfig} from './model/ColumnConfig';
```

на (добавлен `ColumnConfig`):

```ts
import {ColumnAlign, ColumnConfig, ColumnView, RowValue, TableConfig} from './model/ColumnConfig';
```

И после строки `import {AurExtraHeaderContext} from './model/AurExtraHeaderContext';` (строка 62) добавить:

```ts
import {NgxAurHeaderCellDefDirective} from './directive/ngx-aur-header-cell-def.directive';
import {AurHeaderCellContext} from './model/AurHeaderCellContext';
```

(`isDevMode`, `ContentChildren`, `QueryList`, `TemplateRef`, `Subscription`, `NgxAurFilters`, `isFeatureEnabledFn` уже импортированы — добавлять не нужно.)

- [ ] **Step 2.2: `@ContentChildren` + карта.** Найти блок (строки 144–146):

```ts
  /** key → шаблон тела ячейки, собранный из спроецированных ngxAurCellDef. */
  _cellTemplates = new Map<string, TemplateRef<any>>();
  private cellDefsSub?: Subscription;
```

заменить на (тот же блок + новый ниже):

```ts
  /** key → шаблон тела ячейки, собранный из спроецированных ngxAurCellDef. */
  _cellTemplates = new Map<string, TemplateRef<any>>();
  private cellDefsSub?: Subscription;

  @ContentChildren(NgxAurHeaderCellDefDirective, {descendants: true})
  headerCellDefs!: QueryList<NgxAurHeaderCellDefDirective>;

  /** key → деф заголовка (templateRef + ownsCell), собранный из спроецированных ngxAurHeaderCellDef. */
  _headerCellDefs = new Map<string, NgxAurHeaderCellDefDirective>();
  private headerCellDefsSub?: Subscription;
```

- [ ] **Step 2.3: Подписка в `ngAfterContentInit`.** Найти начало метода (строки 394–400):

```ts
  ngAfterContentInit(): void {
    this.rebuildCellTemplates();
    this.cellDefsSub = this.cellDefs.changes.subscribe(() => {
      this.rebuildCellTemplates();
      this.cdr.markForCheck();            // таблица OnPush
    });
    this.defSubs.push(
```

заменить на (вставлен блок сбора header-дефов перед `this.defSubs.push(`):

```ts
  ngAfterContentInit(): void {
    this.rebuildCellTemplates();
    this.cellDefsSub = this.cellDefs.changes.subscribe(() => {
      this.rebuildCellTemplates();
      this.cdr.markForCheck();            // таблица OnPush
    });
    this.rebuildHeaderCellTemplates();
    this.headerCellDefsSub = this.headerCellDefs.changes.subscribe(() => {
      this.rebuildHeaderCellTemplates();
      this.cdr.markForCheck();            // таблица OnPush
    });
    this.defSubs.push(
```

- [ ] **Step 2.4: Методы header.** Найти метод `cellCtx` целиком (строки 445–449):

```ts
  /** Контекст кастомного шаблона ячейки (пересобирается в CD). */
  cellCtx(element: TableRow<T>, key: string): AurCellContext<T> {
    const value = element[key];
    return { $implicit: value, value, row: element, rowSrc: element.rowSrc, index: element.id };
  }
```

заменить на (тот же `cellCtx` + новые методы после него):

```ts
  /** Контекст кастомного шаблона ячейки (пересобирается в CD). */
  cellCtx(element: TableRow<T>, key: string): AurCellContext<T> {
    const value = element[key];
    return { $implicit: value, value, row: element, rowSrc: element.rowSrc, index: element.id };
  }

  /** Пересобирает карту key → деф заголовка из спроецированных ngxAurHeaderCellDef. */
  private rebuildHeaderCellTemplates(): void {
    this._headerCellDefs.clear();
    const keys = new Set(this.tableConfig.columnsCfg.map(c => c.key));
    this.headerCellDefs.forEach(def => {
      this._headerCellDefs.set(def.key, def);   // дубль ключа → побеждает последний
      if (isDevMode() && !keys.has(def.key)) {
        console.warn(`[aur-mat-table] ngxAurHeaderCellDef="${def.key}" не соответствует ни одной колонке.`);
      }
    });
  }

  /** Шаблон заголовка для колонки (или null). */
  headerTpl(key: string): TemplateRef<AurHeaderCellContext<T>> | null {
    return this._headerCellDefs.get(key)?.templateRef ?? null;
  }

  /** Шаблон заголовка забрал ячейку (ownsCell) — mat-sort-header не рендерится. */
  private headerOwnsCell(key: string): boolean {
    return !!this._headerCellDefs.get(key)?.ownsCell;
  }

  /** Рендерить mat-sort-header, если колонка сортируема И шаблон не забрал ячейку (ownsCell). */
  isHeaderSortHeader(col: ColumnConfig<T>): boolean {
    return isFeatureEnabledFn(col.sort) && !this.headerOwnsCell(col.key);
  }

  /** Контекст header-шаблона (пересобирается в CD, как cellCtx). */
  headerCtx(col: ColumnConfig<T>): AurHeaderCellContext<T> {
    const key = col.key;
    const active = this.matSort?.active === key;
    return {
      $implicit: col,
      column: col,
      key,
      sort: {
        sortable: isFeatureEnabledFn(col.sort),
        active,
        direction: active ? this.matSort.direction : '',
        toggle: () => this.matSort?.sort({ id: key, start: 'asc', disableClear: false }),
      },
      filter: {
        apply: f => this.applyFilter(key, f),
        remove: () => this.removeFilter(key),
        active: this.filterStorage.has(key),
      },
    };
  }
```

- [ ] **Step 2.5: Отписка в `ngOnDestroy`.** Найти (строки 1062–1068):

```ts
  ngOnDestroy() {
    this.resizeColumnOffsetsObserver?.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
    this.cellDefsSub?.unsubscribe();
    this.defSubs.forEach(s => s.unsubscribe());
  }
```

заменить на (добавлена строка отписки):

```ts
  ngOnDestroy() {
    this.resizeColumnOffsetsObserver?.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
    this.cellDefsSub?.unsubscribe();
    this.headerCellDefsSub?.unsubscribe();
    this.defSubs.forEach(s => s.unsubscribe());
  }
```

- [ ] **Step 2.6: Условие ветки сортируемости.** В `ngx-aur-mat-table.component.html` найти (строки 340–341):

```html
          <!-- if sortable column header -->
          <ng-container *ngIf="isFeatureEnabled(columnConfig.sort); else notSortable">
```

заменить на:

```html
          <!-- if sortable column header (и шаблон не забрал ячейку через ownsCell) -->
          <ng-container *ngIf="isHeaderSortHeader(columnConfig); else notSortable">
```

- [ ] **Step 2.7: Тело `#headerValue`.** В `ngx-aur-mat-table.component.html` найти (строки 369–374):

```html
          <!--      header value-->
          <ng-template #headerValue>
            <lib-column-view [config]="columnConfig.headerView"
                             [value]="columnConfig.name">
            </lib-column-view>
          </ng-template>
```

заменить на (кастомный шаблон имеет приоритет, иначе текущая логика):

```html
          <!--      header value: кастомный шаблон (ngxAurHeaderCellDef) имеет приоритет над name/headerView-->
          <ng-template #headerValue>
            <ng-container *ngIf="headerTpl(columnConfig.key) as hTpl; else builtinHeader">
              <ng-container *ngTemplateOutlet="hTpl; context: headerCtx(columnConfig)"></ng-container>
            </ng-container>
            <ng-template #builtinHeader>
              <lib-column-view [config]="columnConfig.headerView"
                               [value]="columnConfig.name">
              </lib-column-view>
            </ng-template>
          </ng-template>
```

- [ ] **Step 2.8: Зелёный прогон** нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-header-cell-template.spec.ts'
```

Ожидание: **12 of 12 SUCCESS**, 0 FAILED. Любое падение — разбираться, не подгонять.

- [ ] **Step 2.9: Полный прогон библиотеки** (регрессия):

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: всё SUCCESS, 0 FAILED. Новые 12 тестов добавляются к прежнему baseline; ни один ранее зелёный спек не падает — без спроецированного шаблона `headerTpl(key)` === `null` (ветка `builtinHeader`, прежний `lib-column-view`) и `isHeaderSortHeader(col)` === `isFeatureEnabled(col.sort)` (прежняя `mat-sort-header`-ветка). Особое внимание спекам про сортировку/заголовок (`*sort*`, `*custom-header*`, `*extra-header*`): должны остаться зелёными. Любое падение — разбираться.

---

### Task 3: Демо-вкладка «Шаблон заголовка»

**Files:**
- Create: `projects/aur-demo/src/app/table-with-header-cell-template/table-with-header-cell-template.component.ts`
- Create: `projects/aur-demo/src/app/table-with-header-cell-template/table-with-header-cell-template.component.html`
- Create: `projects/aur-demo/src/app/table-with-header-cell-template/table-with-header-cell-template.component.scss`
- Modify: `projects/aur-demo/src/app/app.module.ts`
- Modify: `projects/aur-demo/src/app/app.component.html`

- [ ] **Step 3.1: Компонент.** Создать `…/table-with-header-cell-template/table-with-header-cell-template.component.ts`:

```ts
import { Component } from '@angular/core';
import { NgxAurFilters, TableConfig, TableRow } from 'ngx-aur-mat-table';

interface Product { name: string; category: string; price: number; }

class CategoryContains extends NgxAurFilters.ContainsStringIgnoreCase<Product> {
  extractProperty(data: TableRow<Product>): string { return data.rowSrc.category; }
}

@Component({
  selector: 'app-table-with-header-cell-template',
  templateUrl: './table-with-header-cell-template.component.html',
  styleUrls: ['./table-with-header-cell-template.component.scss'],
  standalone: false,
})
export class TableWithHeaderCellTemplateComponent {
  tableConfig: TableConfig<Product> = {
    columnsCfg: [
      { key: 'name', name: 'Товар', valueConverter: v => v.name, sort: {} },
      { key: 'category', name: 'Категория', valueConverter: v => v.category },
      { key: 'price', name: 'Цена', valueConverter: v => v.price, align: 'right', sort: {} },
    ],
  };

  tableData: Product[] = [
    { name: 'Клавиатура', category: 'Периферия', price: 2500 },
    { name: 'Монитор', category: 'Дисплеи', price: 18000 },
    { name: 'Мышь', category: 'Периферия', price: 1200 },
  ];

  makeCategoryFilter(value: string): CategoryContains {
    return new CategoryContains(value);
  }
}
```

- [ ] **Step 3.2: Шаблон.** Создать `…/table-with-header-cell-template/table-with-header-cell-template.component.html`:

```html
<h2>Кастомный шаблон заголовка (ngxAurHeaderCellDef)</h2>
<p>
  Произвольная разметка в &lt;th&gt; конкретной колонки. По умолчанию шаблон живёт внутри
  mat-sort-header (стрелка/клик сохраняются); флаг <code>ownsCell</code> отдаёт ячейку шаблону
  целиком, sort/filter берутся из контекста.
</p>

<aur-mat-table [tableData]="tableData" [tableConfig]="tableConfig">

  <!-- keep-sort (по умолчанию): своя разметка + встроенная стрелка/клик-сортировка -->
  <ng-template ngxAurHeaderCellDef="name" let-column>
    <span class="h-label">🛒 {{ column.name }}</span>
  </ng-template>

  <!-- ownsCell: фильтр прямо в заголовке -->
  <ng-template ngxAurHeaderCellDef="category" ownsCell let-column let-filter="filter">
    <div class="h-filter">
      <span>{{ column.name }}</span>
      <input #f (input)="filter.apply(makeCategoryFilter(f.value))" placeholder="фильтр…">
      <button *ngIf="filter.active" (click)="f.value=''; filter.remove()">✕</button>
    </div>
  </ng-template>

  <!-- ownsCell: своя кнопка-сортировка через sort.toggle() -->
  <ng-template ngxAurHeaderCellDef="price" ownsCell let-column let-sort="sort">
    <button class="h-sort" (click)="sort.toggle()">
      {{ column.name }} {{ sort.active ? (sort.direction === 'asc' ? '▲' : '▼') : '⇅' }}
    </button>
  </ng-template>

</aur-mat-table>
```

- [ ] **Step 3.3: Стили.** Создать `…/table-with-header-cell-template/table-with-header-cell-template.component.scss`:

```scss
.h-label {
  font-weight: 600;
}

.h-filter {
  display: flex;
  align-items: center;
  gap: 6px;

  input {
    width: 90px;
    font-size: 12px;
    padding: 2px 4px;
  }

  button {
    cursor: pointer;
    border: none;
    background: transparent;
  }
}

.h-sort {
  cursor: pointer;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 600;
  padding: 0;
}
```

- [ ] **Step 3.4: Регистрация в `app.module.ts`.** После блока импорта `TableWithCellTemplateComponent` (строки 73–75) добавить:

```ts
import {
  TableWithHeaderCellTemplateComponent
} from "./table-with-header-cell-template/table-with-header-cell-template.component";
```

В массиве `declarations` заменить:

```ts
    TableWithRowStyleComponent,
    TableWithCellTemplateComponent
  ],
```

на:

```ts
    TableWithRowStyleComponent,
    TableWithCellTemplateComponent,
    TableWithHeaderCellTemplateComponent
  ],
```

- [ ] **Step 3.5: Вкладка в `app.component.html`.** Найти вкладку «Шаблон ячейки» (строки 202–206):

```html
  <mat-tab label="Шаблон ячейки">
    <ng-template matTabContent>
      <app-table-with-cell-template></app-table-with-cell-template>
    </ng-template>
  </mat-tab>
```

заменить на (добавлена вкладка «Шаблон заголовка» следом):

```html
  <mat-tab label="Шаблон ячейки">
    <ng-template matTabContent>
      <app-table-with-cell-template></app-table-with-cell-template>
    </ng-template>
  </mat-tab>
  <mat-tab label="Шаблон заголовка">
    <ng-template matTabContent>
      <app-table-with-header-cell-template></app-table-with-header-cell-template>
    </ng-template>
  </mat-tab>
```

- [ ] **Step 3.6: Сборка демо (проверка компиляции).**

Run:
```bash
npx ng build aur-demo --configuration development
```

Ожидание: сборка успешна, без ошибок шаблонов/типов. (Долгая команда; цель — убедиться, что демо и `ngxAurHeaderCellDef` компилируются в приложении-потребителе, включая `let-sort`/`let-filter`/`ownsCell`.)

---

### Task 4: README + полный прогон + сборка библиотеки + коммит

**Files:**
- Modify: `README.md`

- [ ] **Step 4.1: README.** В `README.md` сделать две правки.

Правка 1 — обновить закрывающее предложение секции «Кастомный шаблон ячейки» (строки 100–102). Найти:

```
остаётся обязательным, поэтому поиск, сортировка и строка «Итого» работают как обычно. Заголовок и
«Итого» через шаблон не настраиваются (используйте `headerView` и `totalConverter`).
```

заменить на:

```
остаётся обязательным, поэтому поиск, сортировка и строка «Итого» работают как обычно. «Итого» через
шаблон не настраивается (используйте `totalConverter`); заголовок настраивается отдельной директивой
`ngxAurHeaderCellDef` (см. ниже).
```

Правка 2 — вставить новую секцию перед `## Detail-row expansion (`ngxAurExpandedRowDef`)` (строка 104). Найти строку:

```
## Detail-row expansion (`ngxAurExpandedRowDef`)
```

и вставить ПЕРЕД ней следующий блок (с пустой строкой-отбивкой после него):

````md
## Кастомный шаблон заголовка (`ngxAurHeaderCellDef`)

Когда заголовок колонки не описать через `name`/`headerView` (нужны селектор, фильтр-инпут, toggle,
своя вёрстка), `<th>` колонки можно отрисовать произвольным `<ng-template>`. Положите его внутрь
`<aur-mat-table>` и привяжите к колонке по её `key` через директиву `ngxAurHeaderCellDef`:

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">

  <!-- по умолчанию: своя разметка внутри mat-sort-header (стрелка и клик-сортировка сохраняются) -->
  <ng-template ngxAurHeaderCellDef="amount" let-column let-sort="sort">
    <b>{{ column.name }}</b> <small *ngIf="sort.active">{{ sort.direction }}</small>
  </ng-template>

  <!-- ownsCell: шаблон владеет всем <th> (без mat-sort-header); sort/filter — из контекста -->
  <ng-template ngxAurHeaderCellDef="status" ownsCell let-filter="filter">
    <input (input)="filter.apply(buildFilter($event))" placeholder="фильтр">
    <button *ngIf="filter.active" (click)="filter.remove()">✕</button>
  </ng-template>

</aur-mat-table>
```

Шаблон имеет приоритет над `name`/`headerView` и заменяет содержимое заголовка одной data-колонки.

**Сортировка.** По умолчанию шаблон рендерится **внутри** `mat-sort-header` — встроенные стрелка и
клик-сортировка по всей ячейке сохраняются (подходит для косметических заголовков). Для
интерактивного содержимого (input/checkbox/toggle) добавьте атрибут `ownsCell`: он убирает
`mat-sort-header`, отдаёт `<th>` шаблону целиком и снимает конфликт клика; сортировку при
необходимости пересоберите через хэндл `sort` из контекста.

**Контекст шаблона:**

| Поле | Значение |
|---|---|
| `$implicit` / `column` | `ColumnConfig` колонки (`let-column`) |
| `key` | ключ колонки (`ColumnConfig.key`) |
| `sort` | `{ sortable, active, direction: 'asc' \| 'desc' \| '', toggle() }` |
| `filter` | `{ apply(filter), remove(), active }` — обёртка над `applyFilter`/`removeFilter`, имя фильтра = `key` |

Заголовки спец-колонок (выбор/индекс/действия) и шаблон строки «Итого» — вне scope (используйте их
встроенные настройки и `totalConverter`).

````

- [ ] **Step 4.2: Полный прогон библиотеки (финальная проверка).**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: всё SUCCESS, 0 FAILED (включая 12 новых тестов header-cell-template).

- [ ] **Step 4.3: Сборка библиотеки.**

Run:
```bash
npm run build_lib
```

Ожидание: успешно, без ошибок (public-api экспортирует директиву и контекст; ng-packagr собирает).

- [ ] **Step 4.4: Коммит** (один на фичу).

Run:
```powershell
git add projects/ README.md
git commit -m @'
feat(columns): ngxAurHeaderCellDef — custom <ng-template> for column headers

Projection directive ngxAurHeaderCellDef renders a column's <th> with an
arbitrary <ng-template> when name/headerView is not enough (selector, filter
input, toggle, custom markup). Templates are collected via @ContentChildren
into a key -> directive map; the header renders the matching template (rich
context: column/key plus sort and filter handles) and falls back to the
existing lib-column-view otherwise. Template wins over name/headerView.

Sort coexistence is per-column: by default the template renders inside
mat-sort-header (built-in arrow + click kept); the ownsCell flag drops
mat-sort-header so the template owns the <th>, with sort rebuildable via the
context handle. Additive - no behavior change without a projected template.
Data columns only; special-column headers and total are out of scope. New
demo tab + README section.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@
```

- [ ] **Step 4.5: Проверка коммита.**

Run:
```bash
git show --stat HEAD
```

Ожидание — **13 файлов**: `directive/ngx-aur-header-cell-def.directive.ts`, `model/AurHeaderCellContext.ts`, `ngx-aur-mat-table.module.ts`, `public-api.ts`, `ngx-aur-mat-table.component.ts`, `ngx-aur-mat-table.component.html`, `ngx-aur-mat-table-header-cell-template.spec.ts`, демо `table-with-header-cell-template.component.{ts,html,scss}`, `app.module.ts`, `app.component.html`, `README.md`. (Файл `.claude/settings.local.json` в коммит попасть НЕ должен — он вне `projects/` и `README.md`.)

Changelog-запись — при бампе версии (feat), скилл writing-changelog (RU). Не в этом коммите.

---

## Self-Review

**1. Покрытие спеки:**
- Директива `ngxAurHeaderCellDef` (`key` + `ownsCell` через `booleanAttribute`) → Step 1.1; собирается 2.2/2.4. ✓
- Контекст `{ $implicit: column, column, key, sort, filter }` с хэндлами → `AurHeaderCellContext`/`AurHeaderSortHandle`/`AurHeaderFilterHandle` (1.2) + `headerCtx` (2.4) + тест «контекст…» / «filter.active». ✓
- keep-sort по умолчанию (шаблон внутри mat-sort-header) → `isHeaderSortHeader` (2.4) + ветка 2.6 + тест «keep-sort». ✓
- ownsCell убирает mat-sort-header → `headerOwnsCell`/`isHeaderSortHeader` (2.4) + 2.6 + тест «ownsCell». ✓
- Шаблон побеждает name/headerView → ветка `#headerValue` (2.7) + тест «шаблон побеждает…». ✓
- Fallback на lib-column-view → 2.7 `builtinHeader` + тест «fallback». ✓
- `sort.toggle()` работает (в т.ч. ownsCell, через matSort.sort) → `headerCtx.sort.toggle` (2.4) + тест «sort.toggle()». ✓
- `filter.apply/remove/active` (name = key) → `headerCtx.filter` (2.4) + тест «filter handle». ✓
- `@ContentChildren {descendants:true}` + `QueryList.changes` + `markForCheck` → 2.2/2.3 + тест «динамика». ✓
- dev-warning на неизвестный ключ → `rebuildHeaderCellTemplates` (2.4) + тест «dev warning». ✓
- Обёртка th (align/size/padding) сохраняется → 2.6/2.7 (обёртки `<th>` не тронуты) + тест «обёртка th». ✓
- Аддитивность (без шаблона поведение прежнее) → 2.9 регрессия (`headerTpl`→null, `isHeaderSortHeader`===`isFeatureEnabled(sort)`). ✓
- Регистрация module/public-api → 1.3/1.4. ✓
- Демо + README → Task 3 / 4.1. ✓
- Дубль ключа → последний (`map.set`); `ownsCell` на несортируемой → no-op; SSR-safe (`matSort?.`, in-memory `filterStorage`) — покрыто реализацией 2.4; отдельными тестами не гоняем (низкий риск). ✓

**2. Плейсхолдеры:** нет — все шаги содержат полный код/команды/ожидаемый вывод. (`buildFilter($event)` в README — иллюстративный пользовательский метод в примере документации, не код реализации.) ✓

**3. Согласованность типов/имён:** `NgxAurHeaderCellDefDirective`, селектор `[ngxAurHeaderCellDef]`, инпуты `key`/`ownsCell`, `templateRef`; поля компонента `headerCellDefs`/`_headerCellDefs`/`headerCellDefsSub`; методы `rebuildHeaderCellTemplates`/`headerTpl`/`headerOwnsCell`/`isHeaderSortHeader`/`headerCtx` — одинаковы в спеке (Task 1), компоненте/HTML (Task 2), демо (Task 3), README (Task 4). Контекстные поля `$implicit/column/key/sort/filter` и поля хэндлов (`sortable/active/direction/toggle`; `apply/remove/active`) совпадают между `AurHeaderCellContext`, `headerCtx` и `let-`-привязками в тестах/демо. `isHeaderSortHeader`/`headerTpl`/`headerCtx`, используемые в HTML (2.6/2.7), объявлены в 2.4. `ColumnConfig` добавлен в импорт (2.1). ✓
