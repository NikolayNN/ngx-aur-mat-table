# Кастомный `<ng-template>` для ячеек колонки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать потребителю escape-hatch — передавать произвольный `<ng-template ngxAurCellDef="key">` для тела ячеек конкретной колонки, когда декларативного `valueView` (icon/image/text) недостаточно.

**Architecture:** Директива-проекция `NgxAurCellDefDirective` (как `matCellDef` у Material) собирается компонентом через `@ContentChildren` в карту `key → TemplateRef`; ячейка `<td mat-cell>` получает ветку с наивысшим приоритетом: есть шаблон → `ngTemplateOutlet` с богатым контекстом, иначе текущая логика (`lib-column-view` / plain `<span>`). `valueConverter` остаётся обязательным — поиск/сортировка/Итого не меняются. Чисто аддитивно.

**Tech Stack:** Angular 19.2, Angular Material 18.2, Jasmine 3.10 + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-16-custom-cell-template-design.md`

**Контекст ветки:** `feat/cell-template` (создана от master, спека уже закоммичена). Один коммит на фичу в конце плана (Task 4) — промежуточные таски оставляют незакоммиченные изменения для следующего сабагента. Целевой релиз — minor (номер на момент релиза). Changelog — при бампе, не в этом коммите.

---

## File Structure

**Создаются:**
- `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-cell-def.directive.ts` — директива `[ngxAurCellDef]`, захватывает `TemplateRef` + ключ колонки.
- `projects/ngx-aur-mat-table/src/lib/model/AurCellContext.ts` — интерфейс контекста шаблона.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-custom-cell-template.spec.ts` — спек (10 тестов).
- `projects/aur-demo/src/app/table-with-cell-template/table-with-cell-template.component.ts` / `.html` / `.scss` — демо.

**Меняются:**
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` — declare + export директивы.
- `projects/ngx-aur-mat-table/src/public-api.ts` — экспорт директивы и интерфейса.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — `@ContentChildren`, карта, `cellCtx`, lifecycle.
- `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — ветка ячейки.
- `projects/aur-demo/src/app/app.module.ts` — регистрация демо.
- `projects/aur-demo/src/app/app.component.html` — вкладка демо.
- `README.md` — секция «Кастомный шаблон ячейки».

---

### Task 1: Директива + контекст + регистрация + красный спек

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-cell-def.directive.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/model/AurCellContext.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts`
- Modify: `projects/ngx-aur-mat-table/src/public-api.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-custom-cell-template.spec.ts`

Директива и интерфейс создаются и регистрируются **в этом таске**, чтобы спек компилировался (атрибут `ngxAurCellDef` был известен Angular). Компонент ещё НЕ рендерит шаблоны — поэтому новые тесты падают на ассертах (чистый красный), а не на ошибке компиляции шаблона.

- [ ] **Step 1.1: Директива.** Создать `projects/ngx-aur-mat-table/src/lib/directive/ngx-aur-cell-def.directive.ts`:

```ts
import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Кастомный шаблон тела ячеек одной колонки.
 * Ставится на <ng-template>, спроецированный внутрь <aur-mat-table>:
 *   <ng-template ngxAurCellDef="status" let-value let-row="row">…</ng-template>
 * Значение атрибута — ColumnConfig.key колонки, к ячейкам которой применяется шаблон.
 */
@Directive({
  selector: '[ngxAurCellDef]',
  standalone: false,
})
export class NgxAurCellDefDirective {
  /** Ключ колонки (ColumnConfig.key). */
  @Input('ngxAurCellDef') key!: string;

  constructor(public templateRef: TemplateRef<any>) {}
}
```

- [ ] **Step 1.2: Интерфейс контекста.** Создать `projects/ngx-aur-mat-table/src/lib/model/AurCellContext.ts`:

```ts
import { TableRow } from './TableRow';

/** Контекст, передаваемый в кастомный шаблон ячейки (ngxAurCellDef). */
export interface AurCellContext<T = any> {
  /** Значение колонки = row[key] (то же, что получает lib-column-view). */
  $implicit: any;
  /** Именованный алиас $implicit (для let-value="value"). */
  value: any;
  /** Строка таблицы: .rowSrc — исходный объект T, .id — индекс строки. */
  row: TableRow<T>;
  /** Удобный алиас row.rowSrc. */
  rowSrc: T;
  /** Индекс строки = row.id. */
  index: number;
}
```

- [ ] **Step 1.3: Регистрация в модуле.** В `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.module.ts` добавить импорт после строки с `NgxAurTableSearchSuffixDirective` (строка 17):

```ts
import {NgxAurCellDefDirective} from './directive/ngx-aur-cell-def.directive';
```

В массиве `declarations` после `NgxAurTableSearchSuffixDirective` добавить строку `NgxAurCellDefDirective,`. В массиве `exports` после `NgxAurTableSearchSuffixDirective` добавить строку `NgxAurCellDefDirective`. Итог — `declarations` и `exports` содержат `NgxAurCellDefDirective`:

```ts
  declarations: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe,
    ColumnViewComponent,
    IconViewComponent,
    NgxTableSubFooterRowDirective,
    NgxAurTableSearchPrefixDirective,
    NgxAurTableSearchSuffixDirective,
    NgxAurCellDefDirective
  ],
  imports: [ /* без изменений */ ],
  exports: [
    NgxAurMatTableComponent,
    DataPropertyGetterPipe,
    NgxTableSubFooterRowDirective,
    NgxAurTableSearchPrefixDirective,
    NgxAurTableSearchSuffixDirective,
    NgxAurCellDefDirective
  ]
```

- [ ] **Step 1.4: Экспорт из public-api.** В `projects/ngx-aur-mat-table/src/public-api.ts` после строки `export * from './lib/directive/ngx-aur-table-search-suffix.directive'` добавить:

```ts
export * from './lib/directive/ngx-aur-cell-def.directive'
export * from './lib/model/AurCellContext';
```

- [ ] **Step 1.5: Спек.** Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-custom-cell-template.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; status: string; }

// ---------- основной host: рендер, контекст, приоритет, fallback, обёртка td ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurCellDef="status" let-value let-row="row" let-i="index">
        <button class="status-btn" [attr.data-idx]="i" [attr.data-src]="row.rowSrc.name">{{ value }}</button>
      </ng-template>
    </aur-mat-table>`,
})
class CellTemplateHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [
      { key: 'plain', name: 'Plain', valueConverter: v => v.name },
      { key: 'withIcon', name: 'Icon', valueConverter: v => v.name, valueView: { icon: { name: () => 'home' } } },
      {
        key: 'status', name: 'Status', valueConverter: v => v.status,
        align: 'right',
        valueView: { text: { color: () => 'red' } }, // должен быть проигнорирован шаблоном
      },
    ],
  };
  data: Row[] = [{ name: 'Alice', status: 'OK' }, { name: 'Bob', status: 'FAIL' }];
}

describe('NgxAurMatTable custom cell template', () => {
  let fixture: ComponentFixture<CellTemplateHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [CellTemplateHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CellTemplateHostComponent);
  });

  function bodyRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
  }
  function cell(rowEl: HTMLElement, colIdx: number): HTMLElement {
    return rowEl.querySelectorAll('td.mat-mdc-cell')[colIdx] as HTMLElement;
  }

  it('рендерит кастомный шаблон в ячейке колонки status', () => {
    fixture.detectChanges();
    const btn = cell(bodyRows()[0], 2).querySelector('button.status-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent!.trim()).toBe('OK');
  });

  it('контекст: value, rowSrc и index прокинуты в шаблон', () => {
    fixture.detectChanges();
    const btn0 = cell(bodyRows()[0], 2).querySelector('button.status-btn') as HTMLElement;
    const btn1 = cell(bodyRows()[1], 2).querySelector('button.status-btn') as HTMLElement;
    expect(btn0.textContent!.trim()).toBe('OK');
    expect(btn0.getAttribute('data-src')).toBe('Alice');
    expect(btn0.getAttribute('data-idx')).toBe('0');
    expect(btn1.getAttribute('data-src')).toBe('Bob');
    expect(btn1.getAttribute('data-idx')).toBe('1');
  });

  it('шаблон побеждает valueView: в ячейке status нет lib-column-view', () => {
    fixture.detectChanges();
    const statusCell = cell(bodyRows()[0], 2);
    expect(statusCell.querySelector('button.status-btn')).not.toBeNull();
    expect(statusCell.querySelector('lib-column-view')).toBeNull();
  });

  it('fallback: колонка без шаблона рендерит lib-column-view (с valueView) и span (без)', () => {
    fixture.detectChanges();
    const plainCell = cell(bodyRows()[0], 0);
    const iconCell = cell(bodyRows()[0], 1);
    expect(plainCell.querySelector('span.aur-plain-cell')).not.toBeNull();
    expect(plainCell.querySelector('button.status-btn')).toBeNull();
    expect(iconCell.querySelector('lib-column-view')).not.toBeNull();
  });

  it('обёртка td сохраняется: ячейка status несёт класс выравнивания aur-align-right', () => {
    fixture.detectChanges();
    const statusCell = cell(bodyRows()[0], 2);
    expect(statusCell.classList).toContain('aur-align-right');
    expect(statusCell.querySelector('button.status-btn')).not.toBeNull();
  });
});

// ---------- value host: поиск, сортировка, Итого по колонке с шаблоном ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurCellDef="status" let-value let-row="row">
        <button class="status-btn" [attr.data-src]="row.rowSrc.name">{{ value }}</button>
      </ng-template>
    </aur-mat-table>`,
})
class ValueHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    filterCfg: {},
    totalRowCfg: {},
    columnsCfg: [
      {
        key: 'status', name: 'Status', valueConverter: v => v.status,
        sort: {},
        totalConverter: rows => rows.length + ' rows',
      },
    ],
  };
  data: Row[] = [{ name: 'Alice', status: 'OK' }, { name: 'Bob', status: 'FAIL' }];
}

describe('NgxAurMatTable custom cell template — значение колонки', () => {
  let fixture: ComponentFixture<ValueHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ValueHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ValueHostComponent);
  });

  it('поиск фильтрует строки по значению колонки с шаблоном', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    const input = fixture.nativeElement.querySelector('.search-container input') as HTMLInputElement;
    input.value = 'FAIL';
    input.dispatchEvent(new Event('keyup'));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows.length).toBe(1);
    expect((rows[0] as HTMLElement).querySelector('button.status-btn')!.textContent!.trim()).toBe('FAIL');
  });

  it('сортировка: значение колонки с шаблоном доступно sortingDataAccessor', () => {
    fixture.detectChanges();
    const ds = fixture.componentInstance.table.tableDataSource;
    expect(ds.sortingDataAccessor(ds.data[0], 'status')).toBe('OK');
  });

  it('Итого: футер показывает totalConverter, не шаблон', () => {
    fixture.detectChanges();
    const footerCell = fixture.nativeElement.querySelector('tr.mat-mdc-footer-row td.mat-mdc-footer-cell') as HTMLElement;
    expect(footerCell).not.toBeNull();
    expect(footerCell.textContent!.trim()).toBe('2 rows');
    expect(footerCell.querySelector('button.status-btn')).toBeNull();
  });
});

// ---------- dynamic host: появление/исчезновение шаблона через *ngIf ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-container *ngIf="show">
        <ng-template ngxAurCellDef="status" let-value>
          <button class="status-btn">{{ value }}</button>
        </ng-template>
      </ng-container>
    </aur-mat-table>`,
})
class DynamicCellTemplateHostComponent {
  show = false;
  cfg: TableConfig<Row> = { columnsCfg: [{ key: 'status', name: 'Status', valueConverter: v => v.status }] };
  data: Row[] = [{ name: 'Alice', status: 'OK' }];
}

describe('NgxAurMatTable custom cell template — динамика', () => {
  let fixture: ComponentFixture<DynamicCellTemplateHostComponent>;
  let host: DynamicCellTemplateHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DynamicCellTemplateHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DynamicCellTemplateHostComponent);
    host = fixture.componentInstance;
  });

  it('появление шаблона через *ngIf переключает ячейку с builtin на кастом', () => {
    fixture.detectChanges();
    let statusCell = fixture.nativeElement.querySelector('tr.mat-mdc-row td.mat-mdc-cell') as HTMLElement;
    expect(statusCell.querySelector('button.status-btn')).toBeNull();
    expect(statusCell.querySelector('span.aur-plain-cell')).not.toBeNull();

    host.show = true;
    fixture.detectChanges();  // 1-й проход: QueryList.changes → rebuild + markForCheck
    fixture.detectChanges();  // 2-й проход: перерисовка ячейки с обновлённой картой
    statusCell = fixture.nativeElement.querySelector('tr.mat-mdc-row td.mat-mdc-cell') as HTMLElement;
    expect(statusCell.querySelector('button.status-btn')).not.toBeNull();
  });
});

// ---------- bad key host: dev-warning ----------
@Component({
  standalone: false,
  template: `
    <aur-mat-table [tableConfig]="cfg" [tableData]="data">
      <ng-template ngxAurCellDef="does-not-exist" let-value>{{ value }}</ng-template>
    </aur-mat-table>`,
})
class BadKeyHostComponent {
  cfg: TableConfig<Row> = { columnsCfg: [{ key: 'status', name: 'Status', valueConverter: v => v.status }] };
  data: Row[] = [{ name: 'Alice', status: 'OK' }];
}

describe('NgxAurMatTable custom cell template — dev warning', () => {
  let fixture: ComponentFixture<BadKeyHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [BadKeyHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BadKeyHostComponent);
  });

  it('предупреждает о ngxAurCellDef с несуществующим ключом', () => {
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
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-custom-cell-template.spec.ts'
```

Ожидание — спек компилируется (директива известна), из 10 тестов **6 FAIL / 4 PASS**:
- FAIL: «рендерит кастомный шаблон», «контекст…», «шаблон побеждает valueView», «обёртка td…», «появление шаблона через *ngIf…», «предупреждает о ngxAurCellDef…» (компонент ещё не рендерит шаблоны и не пишет warn);
- PASS: «fallback…», «поиск…», «сортировка…», «Итого…» (это регресс-гварды, сегодня уже зелёные).

Иное распределение (особенно ошибка компиляции шаблона `ngxAurCellDef`) — остановиться, проверить Steps 1.1–1.4, доложить.

---

### Task 2: Зелёный — сбор шаблонов в компоненте + ветка ячейки

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`

- [ ] **Step 2.1: Импорты `@angular/core`.** В `ngx-aur-mat-table.component.ts` заменить блок импорта (строки 1–20):

```ts
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewChildren,
  ViewContainerRef
} from '@angular/core';
```

на:

```ts
import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  isDevMode,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewChildren,
  ViewContainerRef
} from '@angular/core';
```

- [ ] **Step 2.2: Импорт директивы и интерфейса.** Сразу после строки `import {Subscription} from 'rxjs';` (строка 51) добавить:

```ts
import {NgxAurCellDefDirective} from './directive/ngx-aur-cell-def.directive';
import {AurCellContext} from './model/AurCellContext';
```

- [ ] **Step 2.3: `implements AfterContentInit`.** Заменить:

```ts
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterViewInit, OnDestroy, NgxAurMatTablePublic<T>, AurDragDropComponent<TableRow<T>> {
```

на:

```ts
export class NgxAurMatTableComponent<T> implements OnInit, OnChanges, AfterContentInit, AfterViewInit, OnDestroy, NgxAurMatTablePublic<T>, AurDragDropComponent<TableRow<T>> {
```

- [ ] **Step 2.4: `@ContentChildren` + карта.** Найти строку:

```ts
  @ContentChild(NgxTableSubFooterRowDirective) subFooterRowTemplate: TemplateRef<any> | null | undefined;
```

заменить на:

```ts
  @ContentChild(NgxTableSubFooterRowDirective) subFooterRowTemplate: TemplateRef<any> | null | undefined;

  @ContentChildren(NgxAurCellDefDirective, {descendants: true})
  cellDefs!: QueryList<NgxAurCellDefDirective>;

  /** key → шаблон тела ячейки, собранный из спроецированных ngxAurCellDef. */
  _cellTemplates = new Map<string, TemplateRef<any>>();
  private cellDefsSub?: Subscription;
```

- [ ] **Step 2.5: Lifecycle + хелперы.** Найти метод `ngOnInit` целиком:

```ts
  ngOnInit(): void {
    if (!this.tableConfig) {
      throw new Error("init inputs [tableConfig] is mandatory!")
    }
    if (this.isServerWiring() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
  }
```

заменить на (тот же `ngOnInit` + три новых метода после него):

```ts
  ngOnInit(): void {
    if (!this.tableConfig) {
      throw new Error("init inputs [tableConfig] is mandatory!")
    }
    if (this.isServerWiring() && !this.paginatorState) {
      this.paginatorState = PaginatorState.empty();
    }
  }

  ngAfterContentInit(): void {
    this.rebuildCellTemplates();
    this.cellDefsSub = this.cellDefs.changes.subscribe(() => {
      this.rebuildCellTemplates();
      this.cdr.markForCheck();            // таблица OnPush
    });
  }

  /** Пересобирает карту key → шаблон из спроецированных ngxAurCellDef. */
  private rebuildCellTemplates(): void {
    this._cellTemplates.clear();
    const keys = new Set(this.tableConfig.columnsCfg.map(c => c.key));
    this.cellDefs.forEach(def => {
      this._cellTemplates.set(def.key, def.templateRef);   // дубль ключа → побеждает последний
      if (isDevMode() && !keys.has(def.key)) {
        console.warn(`[aur-mat-table] ngxAurCellDef="${def.key}" не соответствует ни одной колонке.`);
      }
    });
  }

  /** Контекст кастомного шаблона ячейки (пересобирается в CD — как у extendedRowTemplate). */
  cellCtx(element: TableRow<T>, key: string): AurCellContext<T> {
    const value = element[key];
    return { $implicit: value, value, row: element, rowSrc: element.rowSrc, index: element.id };
  }
```

- [ ] **Step 2.6: Отписка в `ngOnDestroy`.** Найти:

```ts
  ngOnDestroy() {
    this.resizeColumnOffsetsObserver?.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
  }
```

заменить на:

```ts
  ngOnDestroy() {
    this.resizeColumnOffsetsObserver?.disconnect();
    this.serverPageController?.stop();
    this.externalPaginatorSub?.unsubscribe();
    this.cellDefsSub?.unsubscribe();
  }
```

- [ ] **Step 2.7: Ветка ячейки.** В `ngx-aur-mat-table.component.html` найти блок `<td mat-cell>` (текущие строки 378–394):

```html
          <td mat-cell *matCellDef="let element;"
              [style.width]="columnConfig.size?.width"
              [style.min-width]="columnConfig.size?.minWidth"
              [style.max-width]="columnConfig.size?.maxWidth"
              [class.aur-col-fit]="columnConfig.size?.fit"
              [style.--aur-cell-padding-left]="columnConfig.size?.paddingLeft"
              [style.--aur-cell-padding-right]="columnConfig.size?.paddingRight"
              [ngClass]="_alignClass[columnConfig.key]">
            <!-- колонки без valueView минуют компоненты ячейки: лёгкий span дешевле пары компонентов с обёртками -->
            <lib-column-view *ngIf="columnConfig.valueView; else plainCell"
                             [config]="tableView[element.id]?.get(columnConfig.key)"
                             [value]="element | dataPropertyGetter: columnConfig.key">
            </lib-column-view>
            <ng-template #plainCell>
              <span class="aur-plain-cell">{{ element | dataPropertyGetter: columnConfig.key }}</span>
            </ng-template>
          </td>
```

заменить на:

```html
          <td mat-cell *matCellDef="let element;"
              [style.width]="columnConfig.size?.width"
              [style.min-width]="columnConfig.size?.minWidth"
              [style.max-width]="columnConfig.size?.maxWidth"
              [class.aur-col-fit]="columnConfig.size?.fit"
              [style.--aur-cell-padding-left]="columnConfig.size?.paddingLeft"
              [style.--aur-cell-padding-right]="columnConfig.size?.paddingRight"
              [ngClass]="_alignClass[columnConfig.key]">
            <!-- кастомный шаблон ячейки (ngxAurCellDef) имеет приоритет над valueView -->
            <ng-container *ngIf="_cellTemplates.get(columnConfig.key) as cellTpl; else builtinCell">
              <ng-container *ngTemplateOutlet="cellTpl; context: cellCtx(element, columnConfig.key)"></ng-container>
            </ng-container>
            <ng-template #builtinCell>
              <!-- колонки без valueView минуют компоненты ячейки: лёгкий span дешевле пары компонентов с обёртками -->
              <lib-column-view *ngIf="columnConfig.valueView; else plainCell"
                               [config]="tableView[element.id]?.get(columnConfig.key)"
                               [value]="element | dataPropertyGetter: columnConfig.key">
              </lib-column-view>
              <ng-template #plainCell>
                <span class="aur-plain-cell">{{ element | dataPropertyGetter: columnConfig.key }}</span>
              </ng-template>
            </ng-template>
          </td>
```

- [ ] **Step 2.8: Зелёный прогон** нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-custom-cell-template.spec.ts'
```

Ожидание: **10 of 10 SUCCESS**, 0 FAILED. Любое падение — разбираться, не подгонять.

- [ ] **Step 2.9: Полный прогон библиотеки** (регрессия):

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: всё SUCCESS, 0 FAILED. Новые 10 тестов добавляются к прежнему baseline; ни один ранее зелёный спек не падает. Особое внимание — `ngx-aur-mat-table-plain-cells.spec.ts` (та же ячейка): должен остаться зелёным (ветка `builtinCell` повторяет прежнее поведение). Любое падение — разбираться.

---

### Task 3: Демо-вкладка «Шаблон ячейки»

**Files:**
- Create: `projects/aur-demo/src/app/table-with-cell-template/table-with-cell-template.component.ts`
- Create: `projects/aur-demo/src/app/table-with-cell-template/table-with-cell-template.component.html`
- Create: `projects/aur-demo/src/app/table-with-cell-template/table-with-cell-template.component.scss`
- Modify: `projects/aur-demo/src/app/app.module.ts`
- Modify: `projects/aur-demo/src/app/app.component.html`

- [ ] **Step 3.1: Компонент.** Создать `…/table-with-cell-template/table-with-cell-template.component.ts`:

```ts
import { Component } from '@angular/core';
import { TableConfig } from 'ngx-aur-mat-table';

interface Task { title: string; status: 'todo' | 'doing' | 'done'; progress: number; }

@Component({
  selector: 'app-table-with-cell-template',
  templateUrl: './table-with-cell-template.component.html',
  styleUrls: ['./table-with-cell-template.component.scss'],
  standalone: false,
})
export class TableWithCellTemplateComponent {
  tableConfig: TableConfig<Task> = {
    filterCfg: {},
    columnsCfg: [
      { key: 'title', name: 'Задача', valueConverter: v => v.title },
      { key: 'status', name: 'Статус', valueConverter: v => v.status, align: 'center' },
      { key: 'progress', name: 'Прогресс', valueConverter: v => v.progress, align: 'center' },
      { key: 'actions', name: '', valueConverter: () => '' },
    ],
  };

  tableData: Task[] = [
    { title: 'Свёрстать страницу', status: 'done', progress: 100 },
    { title: 'Написать тесты', status: 'doing', progress: 60 },
    { title: 'Code review', status: 'todo', progress: 0 },
  ];

  statusColor(status: string): string {
    return status === 'done' ? '#4caf50' : status === 'doing' ? '#ff9800' : '#9e9e9e';
  }

  onAction(t: Task): void {
    alert('Действие по задаче: ' + t.title);
  }
}
```

- [ ] **Step 3.2: Шаблон.** Создать `…/table-with-cell-template/table-with-cell-template.component.html`:

```html
<h2>Кастомный шаблон ячейки (ngxAurCellDef)</h2>
<p>Колонку, которую не описать через valueView, рендерим произвольным &lt;ng-template&gt;. Поиск/сортировка по-прежнему работают по valueConverter.</p>

<aur-mat-table [tableData]="tableData" [tableConfig]="tableConfig">

  <!-- chip статуса -->
  <ng-template ngxAurCellDef="status" let-value>
    <span class="status-chip" [style.background-color]="statusColor(value)">{{ value }}</span>
  </ng-template>

  <!-- прогресс-бар из числового значения -->
  <ng-template ngxAurCellDef="progress" let-value>
    <div class="progress-track">
      <div class="progress-fill" [style.width.%]="value"></div>
      <span class="progress-label">{{ value }}%</span>
    </div>
  </ng-template>

  <!-- инлайн-кнопка: исходный объект через row.rowSrc -->
  <ng-template ngxAurCellDef="actions" let-row="row">
    <button class="action-btn" (click)="onAction(row.rowSrc)">Открыть</button>
  </ng-template>

</aur-mat-table>
```

- [ ] **Step 3.3: Стили.** Создать `…/table-with-cell-template/table-with-cell-template.component.scss`:

```scss
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  text-transform: uppercase;
}

.progress-track {
  position: relative;
  width: 120px;
  height: 16px;
  background: #eee;
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto;
}

.progress-fill {
  height: 100%;
  background: #3f51b5;
  transition: width .2s ease;
}

.progress-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #222;
}

.action-btn {
  cursor: pointer;
  border: 1px solid #3f51b5;
  background: #fff;
  color: #3f51b5;
  border-radius: 4px;
  padding: 2px 10px;
}
```

- [ ] **Step 3.4: Регистрация в `app.module.ts`.** Добавить импорт рядом с другими импортами демо-компонентов (например после импорта `TableWithRowStyleComponent`):

```ts
import {
  TableWithCellTemplateComponent
} from "./table-with-cell-template/table-with-cell-template.component";
```

В массив `declarations` добавить `TableWithCellTemplateComponent,` (после `TableWithRowStyleComponent`).

- [ ] **Step 3.5: Вкладка в `app.component.html`.** Перед закрывающим `</mat-tab-group>` (после вкладки «Timeline») добавить:

```html
  <mat-tab label="Шаблон ячейки">
    <ng-template matTabContent>
      <app-table-with-cell-template></app-table-with-cell-template>
    </ng-template>
  </mat-tab>
```

- [ ] **Step 3.6: Сборка демо (проверка компиляции).**

Run:
```bash
npx ng build aur-demo --configuration development
```

Ожидание: сборка успешна, без ошибок шаблонов/типов. (Долгая команда; цель — убедиться, что демо и `ngxAurCellDef` компилируются в приложении-потребителе.)

---

### Task 4: README + полный прогон + сборка библиотеки + коммит

**Files:**
- Modify: `README.md`

- [ ] **Step 4.1: README.** В `README.md` после строки `больше примеров: в проекте aur-demo` (строка 82, конец секции «Использование») и перед `## Server pagination via `pageSource` (recommended)` вставить:

```md
### Кастомный шаблон ячейки (`ngxAurCellDef`)

Когда декларативного `valueView` (icon/image/text) мало, тело ячеек колонки можно отрисовать
произвольным `<ng-template>`. Положите его внутрь `<aur-mat-table>` и привяжите к колонке по её
`key` через директиву `ngxAurCellDef`:

```html
<aur-mat-table [tableData]="data" [tableConfig]="cfg">
  <ng-template ngxAurCellDef="status" let-value let-row="row" let-i="index">
    <span class="chip" [class.on]="row.rowSrc.active">{{ value }} (#{{ i }})</span>
  </ng-template>
</aur-mat-table>
```

Контекст шаблона: `$implicit`/`value` — значение колонки (`valueConverter`), `row` — `TableRow`
(`row.rowSrc` — исходный объект, `row.id` — индекс), `rowSrc` — алиас `row.rowSrc`, `index` — индекс
строки. Шаблон заменяет только тело ячеек данных и имеет приоритет над `valueView`; `valueConverter`
остаётся обязательным, поэтому поиск, сортировка и строка «Итого» работают как обычно. Заголовок и
«Итого» через шаблон не настраиваются (используйте `headerView` и `totalConverter`).
```

- [ ] **Step 4.2: Полный прогон библиотеки (финальная проверка).**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: всё SUCCESS, 0 FAILED (включая 10 новых тестов custom-cell-template).

- [ ] **Step 4.3: Сборка библиотеки.**

Run:
```bash
npm run build_lib
```

Ожидание: успешно, без ошибок (public-api экспортирует директиву и интерфейс; ng-packagr собирает).

- [ ] **Step 4.4: Коммит** (один на фичу).

Run:
```powershell
git add projects/ README.md
git commit -m @'
feat(columns): ngxAurCellDef — custom <ng-template> for column cells

Projection directive ngxAurCellDef lets a consumer render a column's data
cells with an arbitrary <ng-template> when the declarative valueView
(icon/image/text) is not enough. Templates are collected via @ContentChildren
into a key → TemplateRef map; the cell renders the matching template (with a
rich context: $implicit/value/row/rowSrc/index) and falls back to the existing
lib-column-view / plain span otherwise. Template wins over valueView.

valueConverter stays required, so search/sort/total are unchanged. Cell body
only; header/total are out of scope. New demo tab + README section.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
'@
```

- [ ] **Step 4.5: Проверка коммита.**

Run:
```bash
git show --stat HEAD
```

Ожидание — 11 файлов: `directive/ngx-aur-cell-def.directive.ts`, `model/AurCellContext.ts`,
`ngx-aur-mat-table.module.ts`, `public-api.ts`, `ngx-aur-mat-table.component.ts`,
`ngx-aur-mat-table.component.html`, `ngx-aur-mat-table-custom-cell-template.spec.ts`,
демо `table-with-cell-template.component.{ts,html,scss}`, `app.module.ts`, `app.component.html`,
`README.md`. (Файл `.claude/settings.local.json` в коммит попасть НЕ должен — он вне `projects/`.)

Changelog-запись — при бампе версии (feat), скилл writing-changelog (RU). Не в этом коммите.

---

## Self-Review

**1. Покрытие спеки:**
- Директива-проекция `ngxAurCellDef` → Task 1.1, 2.4, 2.7. ✓
- Контекст `$implicit/value/row/rowSrc/index` → `AurCellContext` (1.2) + `cellCtx` (2.5) + тест «контекст…». ✓
- valueConverter обязателен, поиск/сортировка/Итого без изменений → тесты «поиск»/«сортировка»/«Итого». ✓
- Template побеждает valueView → тест «шаблон побеждает valueView» + ветка `builtinCell`. ✓
- Fallback (lib-column-view / span) → тест «fallback». ✓
- `@ContentChildren {descendants:true}` + `QueryList.changes` + `markForCheck` → 2.4/2.5 + тест «динамика». ✓
- dev-warning на неизвестный ключ → 2.5 + тест «dev warning». ✓
- Обёртка td (align/size/padding) сохраняется → 2.7 (td не тронут) + тест «обёртка td». ✓
- Регистрация module/public-api → 1.3/1.4. ✓
- Демо + README → Task 3 / 4.1. ✓
- Дубль ключа → последний (`map.set`), SSR-safe — покрыто реализацией 2.5; отдельным тестом не гоняем (низкий риск). ✓

**2. Плейсхолдеры:** нет — все шаги содержат полный код/команды/ожидаемый вывод. ✓

**3. Согласованность типов/имён:** `NgxAurCellDefDirective`, селектор `[ngxAurCellDef]`, `key`, `templateRef`, `_cellTemplates`, `cellDefs`, `cellDefsSub`, `rebuildCellTemplates`, `cellCtx`, `AurCellContext` — одинаковы в спеке (Task 1), компоненте (Task 2), демо (Task 3), README (Task 4). Контекстные поля `$implicit/value/row/rowSrc/index` совпадают между `AurCellContext`, `cellCtx` и `let-`-привязками в тестах/демо. ✓
