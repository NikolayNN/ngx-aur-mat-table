# Expanded-rows Decouple Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Развязать раскрытие detail-строки от внутреннего `highlighted` — сделать раскрытие самостоятельным состоянием с режимами row-click/controlled/manual, поддержкой нескольких строк и управлением из контейнера.

**Architecture:** Единый внутренний движок `_expanded: Map<key, rowSrc>` (ключ через `tableConfig.trackBy`, иначе ссылка на `rowSrc`). Рендер detail-строки управляется предикатом `isExpanded(row)` вместо `=== highlighted`. Режим (`extendedRowCfg.mode`) определяет, кто владеет состоянием: таблица (row-click), контейнер через инпуты (controlled/manual). Инпуты `[expandedRow]`/`[expandedRows]` и аутпуты `(expandedRowChange)`/`(expandedRowsChange)` говорят в `rowSrc` (`T`). `highlight` остаётся как есть и больше не раскрывает.

**Tech Stack:** Angular 19 (standalone:false компонент, OnPush), Angular Material table (`multiTemplateDataRows`), Karma + Jasmine, TypeScript.

## Global Constraints

- Релиз **19.9.0**, ветка `feat/expanded-rows-decouple` (уже создана; спека в ней закоммичена).
- Имена API строго: `extendedRowCfg`, `mode: 'row-click' | 'controlled' | 'manual'`, `multiple`, инпуты `expandedRow`/`expandedRows`, аутпуты `expandedRowChange`/`expandedRowsChange`.
- Дефолты: `mode` = `'row-click'`, `multiple` = `false`.
- Тип инпутов/аутпутов — `T` (`rowSrc`), не `TableRow<T>`.
- Идентичность раскрытия: `tableConfig.trackBy` если задан, иначе ссылка на `rowSrc`.
- Фича включается наличием `[extendedRowTemplate]`; `extendedRowCfg.enable` НЕ вводить.
- Не трогать highlight-логику: `handleHighlightChange`, `rowStyle`, `rowNgClass`, `aria-current`.
- `multiTemplateDataRows` остаётся завязан на `extendedRowTemplate !== null` (без изменений).
- Все правки только в `projects/ngx-aur-mat-table/src/lib/**` (+ демо/докзы). `public-api.ts` править не нужно — `ColumnConfig.ts` ре-экспортится через `export *`.
- Команда тестов: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` (можно ускорить флагом `--include='**/<spec>.ts'`).
- Команда сборки библиотеки: `npm run build_lib`.

---

## File Structure

- **Modify** `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` — `ExtendedRowConfig` + поле `TableConfig.extendedRowCfg`.
- **Modify** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` — состояние/хелперы/инпуты/аутпуты/обработка клика/синк из инпутов/ремап на смене данных.
- **Modify** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` — строки 477 и 486 (предикат раскрытия).
- **Create** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts` — все режимы × single/multiple + развязка/идентичность/edge.
- **Modify** `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.ts` + `.html` — секции controlled и multiple.
- **Modify** `README.md`; **Create** `changelog/19.9.0.md`, `docs/MIGRATION-19.9.0.md`.

---

### Task 1: Контракт конфига `ExtendedRowConfig`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (интерфейс `TableConfig`, ~строка 75; новый интерфейс рядом с `BodyRowConfig`, ~строка 135)

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `interface ExtendedRowConfig { mode?: 'row-click' | 'controlled' | 'manual'; multiple?: boolean; }`
  - поле `TableConfig<T>.extendedRowCfg?: ExtendedRowConfig;`

- [ ] **Step 1: Добавить поле в `TableConfig`**

В `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`, в интерфейс `TableConfig<T>`, сразу после строки `bodyRowCfg?: BodyRowConfig<T>;` (перед закрывающей `}` интерфейса):

```ts
  /**
   * Поведение раскрытия detail-строки (extendedRowTemplate).
   * Действует только при заданном [extendedRowTemplate]; иначе инертно.
   */
  extendedRowCfg?: ExtendedRowConfig,
```

- [ ] **Step 2: Добавить интерфейс `ExtendedRowConfig`**

В том же файле, сразу после интерфейса `BodyRowConfig<T>` (после его закрывающей `}`):

```ts
export interface ExtendedRowConfig {
  /**
   * Как управляется раскрытие detail-строки.
   * 'row-click' (по умолчанию): таблица владеет состоянием, клик по строке раскрывает/сворачивает.
   * 'controlled': источник правды — [expandedRow]/[expandedRows]; клик шлёт
   *   (expandedRowChange)/(expandedRowsChange), контейнер применяет (см. two-way [(expandedRow)]).
   * 'manual': состояние только из [expandedRow]/[expandedRows]; клик не влияет на раскрытие.
   */
  mode?: 'row-click' | 'controlled' | 'manual';

  /**
   * Разрешить раскрытие нескольких строк одновременно.
   * false (по умолчанию): одна строка (аккордеон) — пара [expandedRow]/(expandedRowChange).
   * true: несколько — пара [expandedRows]/(expandedRowsChange).
   */
  multiple?: boolean;
}
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build_lib`
Expected: сборка проходит без ошибок типов (новый необязательный контракт никого не ломает).

- [ ] **Step 4: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts
git commit -m "feat(expand): ExtendedRowConfig contract (mode + multiple)"
```

---

### Task 2: Развязанный движок раскрытия (дефолт row-click)

Раскрытие становится своим состоянием; дефолтный клик по строке раскрывает/сворачивает; `[highlight]` больше не раскрывает.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (инпуты/аутпуты рядом с `extendedRowTemplate` ~стр.158; методы после `handleRowKeydown` ~стр.832; вызов в `handleRowClick` ~стр.818)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (строки 477, 486)
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts` (создать)

**Interfaces:**
- Consumes: `ExtendedRowConfig`, `TableConfig.extendedRowCfg` (Task 1); `TableRow<T>` (`id`, `rowSrc`); `tableConfig.trackBy`.
- Produces:
  - `@Input() expandedRow: T | null`; `@Output() expandedRowChange: EventEmitter<T | null>`
  - `@Input() expandedRows: T[]`; `@Output() expandedRowsChange: EventEmitter<T[]>`
  - `isExpanded(row: TableRow<T>): boolean` (используется шаблоном)
  - private `_expanded: Map<unknown, T>`, `expandKey(row): unknown`, `keyOfSrc(src): unknown`, `nextExpanded(row): Map<unknown, T>`, `emitExpanded(map): void`, `handleExpandOnClick(row): void`

- [ ] **Step 1: Написать падающий тест (row-click single + развязка от highlight)**

Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent, HighlightContainer } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { id: number; name: string; }

/** Базовый хост: дефолтный режим (row-click), single, + [highlight] для проверки развязки. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [highlight]="hl"
                   (expandedRowChange)="single.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class RowClickHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  single: (R | null)[] = [];
  hl: HighlightContainer<R> | undefined;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — row-click (default)', () => {
  let fixture: ComponentFixture<RowClickHostComponent>;
  let host: RowClickHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [RowClickHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RowClickHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('клик раскрывает строку и эмитит rowSrc', () => {
    mainRows()[0].click();
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
    expect(host.single).toEqual([host.data[0]]);
  });

  it('single = аккордеон: клик по другой строке закрывает первую', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    expect(markers()).toEqual(['b details']);
    expect(host.single).toEqual([host.data[0], host.data[1]]);
  });

  it('повторный клик по открытой строке сворачивает её и эмитит null', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual([]);
    expect(host.single).toEqual([host.data[0], null]);
  });

  it('[highlight] не раскрывает и не закрывает уже раскрытую деталь', () => {
    mainRows()[0].click(); fixture.detectChanges();   // раскрыта строка a
    host.hl = { value: host.data[1] };                // подсветить строку b
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);          // деталь a осталась, b не раскрылась
    expect(host.table.highlighted).toBe(host.data[1]); // highlight отработал
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: FAIL — `expandedRowChange`/`isExpanded` ещё нет; клик раскрывает по `highlighted` (старое поведение), `[highlight]` закрывает деталь.

- [ ] **Step 3: Добавить инпуты и аутпуты**

В `ngx-aur-mat-table.component.ts`, сразу после `@Input() extendedRowTemplate: TemplateRef<any> | null = null;` (стр.158):

```ts
  @Input() expandedRow: T | null = null;
  @Output() expandedRowChange = new EventEmitter<T | null>();

  @Input() expandedRows: T[] = [];
  @Output() expandedRowsChange = new EventEmitter<T[]>();
```

(`Input`, `Output`, `EventEmitter` уже импортированы — стр.10-16.)

- [ ] **Step 4: Добавить состояние и хелперы**

В `ngx-aur-mat-table.component.ts`, рядом с полем `highlighted` (после стр.249 `highlighted: T | undefined;`):

```ts
  /** Состояние раскрытия detail-строк: ключ идентичности → исходный объект (rowSrc). */
  private _expanded = new Map<unknown, T>();
```

После метода `handleRowKeydown` (после его закрывающей `}`, ~стр.832) добавить:

```ts
  /** Ключ идентичности раскрытия по строке таблицы — зеркало trackByRow. */
  private expandKey(row: TableRow<T>): unknown {
    return this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;
  }

  /** Ключ по исходному значению (инпуты приходят как rowSrc, а не TableRow). */
  private keyOfSrc(src: T): unknown {
    return this.tableConfig.trackBy ? this.tableConfig.trackBy(src) : src;
  }

  /** Рендер-предикат detail-строки (используется шаблоном). */
  isExpanded(row: TableRow<T>): boolean {
    return this._expanded.has(this.expandKey(row));
  }

  /** Следующее состояние раскрытия при клике/запросе по строке. */
  private nextExpanded(row: TableRow<T>): Map<unknown, T> {
    const key = this.expandKey(row);
    const multiple = !!this.tableConfig.extendedRowCfg?.multiple;
    const next = new Map(this._expanded);
    if (next.has(key)) {
      next.delete(key);                 // повторный клик по открытой — закрыть
    } else {
      if (!multiple) next.clear();      // single → аккордеон
      next.set(key, row.rowSrc);
    }
    return next;
  }

  /** Эмит активной пары по флагу multiple. */
  private emitExpanded(map: Map<unknown, T>): void {
    if (this.tableConfig.extendedRowCfg?.multiple) {
      this.expandedRowsChange.emit([...map.values()]);
    } else {
      this.expandedRowChange.emit([...map.values()][0] ?? null);
    }
  }

  /** Реакция на клик по строке (вызывается из handleRowClick после гейта enable). */
  private handleExpandOnClick(row: TableRow<T>): void {
    const mode = this.tableConfig.extendedRowCfg?.mode ?? 'row-click';
    if (mode === 'manual') return;                       // клик инертен для раскрытия
    if (mode === 'controlled') {
      this.emitExpanded(this.nextExpanded(row));         // только эмит, без мутации
      return;
    }
    this._expanded = this.nextExpanded(row);             // row-click: мутируем + эмитим
    this.emitExpanded(this._expanded);
  }
```

- [ ] **Step 5: Подключить раскрытие в `handleRowClick`**

В `ngx-aur-mat-table.component.ts`, в методе `handleRowClick` (стр.807-818) добавить вызов последней строкой перед закрывающей `}`:

```ts
    this.handleExpandOnClick(row);
```

Итог метода:

```ts
  handleRowClick(row: TableRow<T>) {
    if (this.tableConfig.bodyRowCfg?.clickCfg?.enable === false) return;
    if (row.rowSrc !== this.highlighted || (row.rowSrc === this.highlighted && !this.tableConfig.bodyRowCfg?.clickCfg?.cancelable)) {
      this.rowClick.emit(row.rowSrc);
      this.highlighted = row.rowSrc;
    } else {
      this.rowClick.emit(undefined);
      this.highlighted = undefined;
    }
    this.handleExpandOnClick(row);
  }
```

- [ ] **Step 6: Переключить шаблон на `isExpanded`**

В `ngx-aur-mat-table.component.html`:

Строка 477 — было:
```html
                   [@detailExpand]="element.rowSrc === highlighted ? expandedStateEnum.EXPANDED : expandedStateEnum.COLLAPSED">
```
стало:
```html
                   [@detailExpand]="isExpanded(element) ? expandedStateEnum.EXPANDED : expandedStateEnum.COLLAPSED">
```

Строка 486 — было:
```html
                <ng-container *ngIf="element.rowSrc === highlighted">
```
стало:
```html
                <ng-container *ngIf="isExpanded(element)">
```

- [ ] **Step 7: Запустить тест — убедиться, что проходит**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: PASS — все 4 теста зелёные.

- [ ] **Step 8: Прогнать весь suite библиотеки (регрессия highlight/раскрытие)**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — существующие спеки (включая `ngx-aur-mat-table-row-click-disable.spec.ts`, a11y, row-style) зелёные.

- [ ] **Step 9: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts
git commit -m "feat(expand): decouple detail-row expansion from highlight (row-click engine)"
```

---

### Task 3: Несколько раскрытых строк (`multiple: true`)

**Files:**
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts` (дополнить)

**Interfaces:**
- Consumes: движок Task 2 (`nextExpanded`/`emitExpanded` уже читают `multiple`); `expandedRowsChange`.
- Produces: подтверждённое мультираскрытие (кода-изменений может не потребоваться — задача закрывает поведение тестом).

- [ ] **Step 1: Написать тест мультираскрытия**

Добавить в `ngx-aur-mat-table-expanded-rows.spec.ts` новый хост и блок:

```ts
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   (expandedRowsChange)="multi.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class MultipleHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  multi: R[][] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { multiple: true },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — multiple', () => {
  let fixture: ComponentFixture<MultipleHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MultipleHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MultipleHostComponent);
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('две строки раскрыты одновременно; эмитит массив rowSrc', () => {
    const host = fixture.componentInstance;
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    expect(markers()).toEqual(['a details', 'b details']);
    expect(host.multi[host.multi.length - 1]).toEqual([host.data[0], host.data[1]]);
  });

  it('повторный клик закрывает только свою строку', () => {
    mainRows()[0].click(); fixture.detectChanges();
    mainRows()[1].click(); fixture.detectChanges();
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual(['b details']);
  });
});
```

- [ ] **Step 2: Запустить тест**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: PASS — движок Task 2 уже поддерживает `multiple`. Если упал — проверить, что `nextExpanded` НЕ чистит Map при `multiple:true` и `emitExpanded` шлёт `expandedRowsChange`.

- [ ] **Step 3: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts
git commit -m "test(expand): multiple-row expansion coverage"
```

---

### Task 4: Управление из контейнера — controlled / manual / seed + синк из инпутов

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`ngOnChanges` ~стр.282; новый метод `syncExpandedFromInputs`)
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts` (дополнить)

**Interfaces:**
- Consumes: `expandedRow`/`expandedRows` инпуты, `extendedRowCfg.mode`/`multiple`, `keyOfSrc`, `_expanded` (Task 2); `isDevMode` (импортирован, стр.12).
- Produces: `syncExpandedFromInputs(multiple: boolean): void`; ветка синка в `ngOnChanges`.

- [ ] **Step 1: Написать тесты controlled / manual / seed / dev-warning**

Добавить в `ngx-aur-mat-table-expanded-rows.spec.ts`:

```ts
/** Controlled: контейнер — источник правды, без авто-echo. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class ControlledHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: (R | null)[] = [];
  exp: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { mode: 'controlled' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

/** Manual: только инпут, клик инертен. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class ManualHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: (R | null)[] = [];
  exp: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { mode: 'manual' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

/** multiple:false, но привязан [expandedRows] — dev-warning, активна пара [expandedRow]. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp" [expandedRows]="rows"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class MismatchHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  exp: R | null = null;
  rows: R[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    extendedRowCfg: { mode: 'controlled' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

function markersOf(f: ComponentFixture<unknown>): string[] {
  return Array.from(f.nativeElement.querySelectorAll('.detail-marker'))
    .map(e => (e as HTMLElement).textContent!.trim());
}
function mainRowsOf(f: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(f.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
}

describe('NgxAurMatTable expanded rows — controlled', () => {
  let fixture: ComponentFixture<ControlledHostComponent>;
  let host: ControlledHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ControlledHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlledHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('инпут раскрывает строку', () => {
    host.exp = host.data[0];
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['a details']);
  });

  it('клик НЕ меняет DOM сам по себе, но эмитит запрос', () => {
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual([]);            // нет echo — нет раскрытия
    expect(host.changes).toEqual([host.data[0]]);      // запрос ушёл
  });

  it('клик по уже раскрытой (через инпут) эмитит null', () => {
    host.exp = host.data[0];
    fixture.detectChanges();
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(host.changes).toEqual([null]);
  });
});

describe('NgxAurMatTable expanded rows — manual', () => {
  let fixture: ComponentFixture<ManualHostComponent>;
  let host: ManualHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ManualHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ManualHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('инпут раскрывает', () => {
    host.exp = host.data[1];
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['b details']);
  });

  it('клик не раскрывает и не эмитит', () => {
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual([]);
    expect(host.changes).toEqual([]);
  });
});

describe('NgxAurMatTable expanded rows — mismatch warning', () => {
  it('multiple:false + [expandedRows] → warn, работает [expandedRow]', async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [MismatchHostComponent],
    }).compileComponents();
    const warn = spyOn(console, 'warn');
    const fixture = TestBed.createComponent(MismatchHostComponent);
    const host = fixture.componentInstance;
    host.rows = [host.data[1]];      // в неактивной паре
    host.exp = host.data[0];         // активная пара
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['a details']);
    expect(warn).toHaveBeenCalled();
  });
});
```

Дополнительный хост — `clickCfg.enable:false` + `mode:'controlled'` (edge-case: клик не раскрывает, инпут раскрывает):

```ts
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"
                   [expandedRow]="exp"
                   (expandedRowChange)="changes.push($event)"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class DisabledControlledHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  changes: (R | null)[] = [];
  exp: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { enable: false } },
    extendedRowCfg: { mode: 'controlled' },
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — clickCfg.enable:false', () => {
  let fixture: ComponentFixture<DisabledControlledHostComponent>;
  let host: DisabledControlledHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DisabledControlledHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DisabledControlledHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик по неинтерактивной строке не раскрывает и не эмитит', () => {
    mainRowsOf(fixture)[0].click();
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual([]);
    expect(host.changes).toEqual([]);
  });

  it('инпут раскрывает даже при enable:false', () => {
    host.exp = host.data[0];
    fixture.detectChanges();
    expect(markersOf(fixture)).toEqual(['a details']);
  });
});
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: FAIL — инпуты ещё не синкаются в `_expanded` (нет ветки в `ngOnChanges`), dev-warning не эмитится.

- [ ] **Step 3: Добавить `syncExpandedFromInputs`**

В `ngx-aur-mat-table.component.ts`, рядом с остальными expand-методами (после `handleExpandOnClick`):

```ts
  /** Перестраивает _expanded из активного инпута (выбор пары по multiple). */
  private syncExpandedFromInputs(multiple: boolean): void {
    const next = new Map<unknown, T>();
    if (multiple) {
      (this.expandedRows ?? []).forEach(src => next.set(this.keyOfSrc(src), src));
      if (isDevMode() && this.expandedRow != null) {
        console.warn('[aur-mat-table] multiple:true — используйте [expandedRows], [expandedRow] игнорируется.');
      }
    } else {
      if (this.expandedRow != null) next.set(this.keyOfSrc(this.expandedRow), this.expandedRow);
      if (isDevMode() && this.expandedRows?.length) {
        console.warn('[aur-mat-table] multiple:false — используйте [expandedRow], [expandedRows] игнорируется.');
      }
    }
    this._expanded = next;
  }
```

- [ ] **Step 4: Добавить ветку синка в `ngOnChanges`**

В `ngx-aur-mat-table.component.ts`, в `ngOnChanges` (стр.282-316), перед закрывающей `}` метода добавить:

```ts
    if (changes['expandedRow'] || changes['expandedRows']) {
      const mode = this.tableConfig.extendedRowCfg?.mode ?? 'row-click';
      const multiple = !!this.tableConfig.extendedRowCfg?.multiple;
      const authoritative = mode === 'controlled' || mode === 'manual';
      const firstSeed = mode === 'row-click'
        && (!!changes['expandedRow']?.firstChange || !!changes['expandedRows']?.firstChange);
      if (authoritative || firstSeed) {
        this.syncExpandedFromInputs(multiple);
      }
    }
```

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: PASS — controlled/manual/mismatch зелёные, прежние группы (row-click, multiple) не сломаны.

- [ ] **Step 6: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts
git commit -m "feat(expand): controlled/manual modes via [expandedRow(s)] inputs"
```

---

### Task 5: Идентичность через trackBy + ремап на смене данных

Раскрытие переживает серверный reload (объекты пересозданы) при заданном `trackBy`; исчезнувшие строки выпадают из состояния.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (новый метод `remapExpandedToData`; вызов в `prepareTableData` ~стр.498)
- Test: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts` (дополнить)

**Interfaces:**
- Consumes: `_expanded`, `expandKey`, `tableDataSource.data` (Task 2).
- Produces: `remapExpandedToData(): void`, вызываемый в `prepareTableData`.

- [ ] **Step 1: Написать тест переживания reload**

Добавить в `ngx-aur-mat-table-expanded-rows.spec.ts` хост с `trackBy` и блок:

```ts
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [extendedRowTemplate]="detail"></aur-mat-table>
    <ng-template #detail let-row><span class="detail-marker">{{ row.rowSrc.name }} details</span></ng-template>
  `,
})
class TrackByHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    trackBy: r => r.id,
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
}

describe('NgxAurMatTable expanded rows — trackBy identity', () => {
  let fixture: ComponentFixture<TrackByHostComponent>;
  let host: TrackByHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TrackByHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TrackByHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function mainRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]:not(.expanded-row)'));
  }
  function markers(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.detail-marker'))
      .map(e => (e as HTMLElement).textContent!.trim());
  }

  it('раскрытая строка остаётся раскрытой после пересоздания данных (reload)', () => {
    mainRows()[0].click(); fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
    host.data = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];   // новые объекты, те же id
    fixture.detectChanges();
    expect(markers()).toEqual(['a details']);
  });

  it('исчезнувшая строка выпадает из раскрытия', () => {
    mainRows()[0].click(); fixture.detectChanges();
    host.data = [{ id: 2, name: 'b' }];                          // строки id=1 больше нет
    fixture.detectChanges();
    expect(markers()).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: FAIL — после смены `data` Map хранит старый ключ, но строки рендерятся из новых; без ремапа `_expanded` ссылается на устаревший rowSrc, а вторая проверка не очищает исчезнувшую строку. (При `trackBy=id` membership по ключу совпадёт, поэтому первый тест может пройти; второй — упадёт, т.к. ключ id=1 не удаляется.)

- [ ] **Step 3: Добавить `remapExpandedToData`**

В `ngx-aur-mat-table.component.ts`, рядом с expand-методами:

```ts
  /** На смене данных: обновляет rowSrc по совпадающим ключам и выкидывает исчезнувшие. */
  private remapExpandedToData(): void {
    if (this._expanded.size === 0) return;
    const byKey = new Map<unknown, T>();
    this.tableDataSource.data.forEach(r => byKey.set(this.expandKey(r), r.rowSrc));
    const next = new Map<unknown, T>();
    this._expanded.forEach((_src, key) => {
      if (byKey.has(key)) next.set(key, byKey.get(key)!);
    });
    this._expanded = next;
  }
```

- [ ] **Step 4: Вызвать ремап в `prepareTableData`**

В `ngx-aur-mat-table.component.ts`, в конце метода `prepareTableData` (после строки `this._displayExtraHeaderBottomCell = ...`, ~стр.497, перед закрывающей `}`):

```ts
    this.remapExpandedToData();
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-expanded-rows.spec.ts'`
Expected: PASS — обе trackBy-проверки зелёные.

- [ ] **Step 6: Полный suite библиотеки + сборка**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS — весь suite зелёный.

Run: `npm run build_lib`
Expected: сборка без ошибок.

- [ ] **Step 7: Commit**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-expanded-rows.spec.ts
git commit -m "feat(expand): trackBy identity survives data reload (remap on data change)"
```

---

### Task 6: Демо — controlled и multiple

**Files:**
- Modify: `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.ts`
- Modify: `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.html`

**Interfaces:**
- Consumes: публичное API (config `extendedRowCfg`, инпуты/аутпуты) из Task 1-5.
- Produces: визуальные примеры (нет автотестов).

- [ ] **Step 1: Добавить в компонент конфиги и состояние для двух новых примеров**

В `expanding-row.component.ts`, в класс `ExpandingRowComponent` (после поля `tableData`, ~стр.43):

```ts
  // --- controlled ---
  controlledConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    extendedRowCfg: { mode: 'controlled' },
    indexCfg: { enable: true, offset: 1 },
  };
  controlledData: Customer[] = CustomerGenerator.generate(5);
  expandedCustomer: Customer | null = null;

  // --- multiple ---
  multipleConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    extendedRowCfg: { multiple: true },
    indexCfg: { enable: true, offset: 1 },
  };
  multipleData: Customer[] = CustomerGenerator.generate(5);
  expandedCustomers: Customer[] = [];
```

- [ ] **Step 2: Добавить разметку примеров**

В `expanding-row.component.html`, в конец файла (после существующего `<aur-mat-table ...>` блока):

```html
<hr/>
<h3>Controlled (источник правды — контейнер, two-way)</h3>
<p>Раскрытая строка хранится в контейнере: <code>{{ expandedCustomer?.name ?? '—' }}</code></p>
<aur-mat-table
  [tableData]="controlledData"
  [tableConfig]="controlledConfig"
  [extendedRowTemplate]="rowTemplate"
  [(expandedRow)]="expandedCustomer">
</aur-mat-table>

<hr/>
<h3>Multiple (несколько раскрытых строк)</h3>
<p>Раскрыто строк: <code>{{ expandedCustomers.length }}</code></p>
<aur-mat-table
  [tableData]="multipleData"
  [tableConfig]="multipleConfig"
  [extendedRowTemplate]="rowTemplate"
  [(expandedRows)]="expandedCustomers">
</aur-mat-table>
```

(Шаблон `#rowTemplate` уже объявлен в этом файле и переиспользуется.)

- [ ] **Step 3: Собрать демо**

Run: `ng build aur-demo --configuration development`
Expected: сборка проходит без ошибок (или `npm run build` если в проекте принят такой алиас — проверить package.json).

- [ ] **Step 4: Commit**

```bash
git add projects/aur-demo/src/app/table-expanding-row/expanding-row.component.ts projects/aur-demo/src/app/table-expanding-row/expanding-row.component.html
git commit -m "docs(demo): controlled and multiple expanded-row examples"
```

---

### Task 7: Документация — README, changelog 19.9.0, migration

**Files:**
- Modify: `README.md` (секция expanded-row)
- Create: `changelog/19.9.0.md` (+ запись в индексе changelog, через скилл writing-changelog)
- Create: `docs/MIGRATION-19.9.0.md`

**Interfaces:**
- Consumes: финальное API из Task 1-6.
- Produces: пользовательская документация (нет автотестов).

- [ ] **Step 1: README — описать extendedRowCfg и пары инпутов/аутпутов**

В `README.md` найти секцию про `extendedRowTemplate` (поиск по `extendedRowTemplate`) и добавить после неё подсекцию:

```markdown
#### Управление раскрытием (`extendedRowCfg`)

Раскрытие detail-строки — самостоятельное состояние, не связанное с подсветкой (`highlight`).

| Поле | Значения | По умолчанию | Смысл |
|---|---|---|---|
| `mode` | `'row-click'` \| `'controlled'` \| `'manual'` | `'row-click'` | кто владеет состоянием раскрытия |
| `multiple` | `boolean` | `false` | разрешить несколько раскрытых строк |

Режимы:
- **row-click** — таблица сама раскрывает/сворачивает по клику.
- **controlled** — источник правды контейнер: `[(expandedRow)]` (или `[(expandedRows)]` при `multiple`). Клик шлёт `(expandedRowChange)`/`(expandedRowsChange)`.
- **manual** — состояние только из инпутов; клик не раскрывает.

Single (`multiple:false`) → `[expandedRow]`/`(expandedRowChange)` (`T | null`).
Multiple (`multiple:true`) → `[expandedRows]`/`(expandedRowsChange)` (`T[]`).

Идентичность раскрытой строки определяется `tableConfig.trackBy` (иначе ссылкой на объект), поэтому раскрытие переживает серверный reload при заданном `trackBy`.

> **Миграция с ≤19.8.x:** `[highlight]` больше не раскрывает detail-строку (только подсветка/скролл). Для программного раскрытия используйте `[expandedRow]`/`[expandedRows]`.
```

- [ ] **Step 2: Changelog 19.9.0 через скилл**

Запустить скилл `writing-changelog` и создать `changelog/19.9.0.md` со следующим содержанием (русский Keep-a-Changelog):

- **Добавлено:** `extendedRowCfg` (`mode: 'row-click' | 'controlled' | 'manual'`, `multiple`); инпуты `[expandedRow]`/`[expandedRows]` и аутпуты `(expandedRowChange)`/`(expandedRowsChange)` для независимого управления раскрытием detail-строки; поддержка нескольких раскрытых строк; идентичность раскрытия через `trackBy` (переживает reload).
- **Изменено:** повторный клик по уже раскрытой строке в `row-click` сворачивает её независимо от `clickCfg.cancelable` (`cancelable` теперь относится только к highlight/`rowClick`).
- **Удалено / Breaking:** `[highlight]` больше не раскрывает detail-строку — только подсветка + scrollIntoView; программное раскрытие переезжает на `[expandedRow]`/`[expandedRows]`.

Обновить индекс changelog (как того требует скилл writing-changelog).

- [ ] **Step 3: Migration note**

Создать `docs/MIGRATION-19.9.0.md`:

```markdown
# Миграция на 19.9.0

## `[highlight]` больше не раскрывает detail-строку (breaking)

Раскрытие detail-строки (`extendedRowTemplate`) стало самостоятельным состоянием,
развязанным от подсветки. `[highlight]` теперь только подсвечивает строку и скроллит к ней.

**Было (≤19.8.x):** программное раскрытие через `[highlight]`.

**Стало (19.9.0):** используйте новые инпуты.

```html
<!-- single -->
<aur-mat-table [extendedRowTemplate]="tpl" [(expandedRow)]="openRow" ...></aur-mat-table>

<!-- multiple: extendedRowCfg.multiple = true -->
<aur-mat-table [extendedRowTemplate]="tpl" [(expandedRows)]="openRows" ...></aur-mat-table>
```

Если вы НЕ использовали `[highlight]` для раскрытия — изменений в вашем коде не требуется,
клик по строке раскрывает её как раньше (дефолт `mode: 'row-click'`).

## Поведение повторного клика

В режиме `row-click` повторный клик по уже раскрытой строке теперь сворачивает её
независимо от `clickCfg.cancelable`. Раньше без `cancelable` строка оставалась раскрытой.
```

- [ ] **Step 4: Commit**

```bash
git add README.md changelog/ docs/MIGRATION-19.9.0.md
git commit -m "docs(expand): README section, changelog 19.9.0, migration note"
```

---

## Финальная верификация

- [ ] `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` — весь suite зелёный.
- [ ] `npm run build_lib` — сборка библиотеки без ошибок.
- [ ] `ng build aur-demo --configuration development` — демо собирается.
- [ ] Ручная проверка демо (`ng serve aur-demo`): дефолтный пример раскрывает по клику; controlled синхронизируется с контейнером; multiple держит несколько раскрытых строк; смена highlight (если настроена) не закрывает деталь.

## Замечания по версии/релизу

Бамп версии в `package.json` библиотеки до 19.9.0 и мерж ветки — отдельным шагом по завершении (вне этого плана, как принято в проекте: changelog-запись в коммитах фичи, бамп — при релизе).
