# Фидбек-фичи 19.6.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 7 фич из батча фидбека: align колонок, класс подсветки кликнутой строки (BREAKING: удаление `highlightClicked`), форматтер индекса, `fit`-размер колонки, клавиатурная a11y, настраиваемый padding + условный 25px, tooltipClass/позиция иконки. Релиз 19.6.0.

**Architecture:** Одна ветка `feature/feedback-19.6.0`, коммит на пункт, TDD. Контракты и механика — в спеке `docs/superpowers/specs/2026-06-10-feedback-features-design.md`; в плане — готовый код всех правок.

**Tech Stack:** Angular 19 + Material 18 (MDC), karma/jasmine. Тестовый запуск: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless` (точечный red/green — добавить `--include='**/<имя>.spec.ts'`).

**Конвенции:** JSDoc — русский; commit subjects — английский (как в git log). Тестовый паттерн — HostComponent + TestBed (образец: `ngx-aur-mat-table-row-style.spec.ts`).

---

### Task 1: #1 — `align` колонки

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.css`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-align.spec.ts`

- [ ] **Step 1: Ветка**

```powershell
git checkout -b feature/feedback-19.6.0 master
```

- [ ] **Step 2: Красный тест** — создать `ngx-aur-mat-table-align.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class AlignHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },                  // без align
      { key: 'age', name: 'Age', valueConverter: v => v.age, align: 'right',
        sort: {}, totalConverter: rows => rows.length },                            // right + sortable + total
      { key: 'mid', name: 'Mid', valueConverter: v => v.name, align: 'center' },
    ],
    indexCfg: { enable: true, align: 'center' },
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

describe('NgxAurMatTable column align', () => {
  let fixture: ComponentFixture<AlignHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [AlignHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AlignHostComponent);
    fixture.detectChanges();
  });

  // порядок колонок: [0]=tbl_index, [1]=name, [2]=age, [3]=mid
  function headerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell'));
  }
  function bodyCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td'));
  }
  function footerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-footer-row] td'));
  }

  it('right-колонка: th/td/footer-td несут aur-align-right (th — сортируемый)', () => {
    expect(headerCells()[2].classList.contains('aur-align-right')).toBeTrue();
    expect(bodyCells()[2].classList.contains('aur-align-right')).toBeTrue();
    expect(footerCells()[2].classList.contains('aur-align-right')).toBeTrue();
  });

  it('center-колонка: th/td/footer-td несут aur-align-center', () => {
    expect(headerCells()[3].classList.contains('aur-align-center')).toBeTrue();
    expect(bodyCells()[3].classList.contains('aur-align-center')).toBeTrue();
    expect(footerCells()[3].classList.contains('aur-align-center')).toBeTrue();
  });

  it('колонка без align не получает классов выравнивания', () => {
    expect(headerCells()[1].classList.contains('aur-align-center')).toBeFalse();
    expect(headerCells()[1].classList.contains('aur-align-right')).toBeFalse();
    expect(bodyCells()[1].classList.contains('aur-align-center')).toBeFalse();
    expect(bodyCells()[1].classList.contains('aur-align-right')).toBeFalse();
  });

  it('индексная колонка выравнивается из indexCfg.align', () => {
    expect(headerCells()[0].classList.contains('aur-align-center')).toBeTrue();
    expect(bodyCells()[0].classList.contains('aur-align-center')).toBeTrue();
  });
});
```

- [ ] **Step 3: Убедиться, что красный**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-align.spec.ts'`
Expected: FAIL — компиляция падает (`align` нет в `ColumnConfig`).

- [ ] **Step 4: Контракт** — `model/ColumnConfig.ts`. Перед `export interface ColumnConfig<T> {` добавить:

```ts
/** Горизонтальное выравнивание контента колонки. */
export type ColumnAlign = 'left' | 'center' | 'right';
```

В `ColumnConfig<T>` после `size?: ColumnSize;` добавить:

```ts
  /** Выравнивание заголовка, ячеек и итога колонки. По умолчанию 'left'. */
  align?: ColumnAlign;
```

В `IndexConfig` после `size?: ColumnSize;` добавить:

```ts
  /** Выравнивание колонки индекса. По умолчанию 'left'. */
  align?: ColumnAlign;
```

- [ ] **Step 5: Компонент** — `ngx-aur-mat-table.component.ts`.

В импорте из `'./model/ColumnConfig'` (строка ~21) добавить `ColumnAlign`:

```ts
import {ColumnAlign, ColumnView, TableConfig} from './model/ColumnConfig';
```

Рядом с полями `_headerStyle`/`_headerClass` добавить поле:

```ts
  /** Классы выравнивания по ключу колонки; 'left'/не задан → undefined (без класса). */
  _alignClass: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
```

В `initTable()` после строки `this._headerClass = ...` добавить:

```ts
    this._alignClass = this.buildAlignClassMap();
```

После метода `initTable()` добавить:

```ts
  private buildAlignClassMap(): Record<string, 'aur-align-center' | 'aur-align-right' | undefined> {
    const toClass = (a?: ColumnAlign) =>
      a === 'center' ? 'aur-align-center' as const
        : a === 'right' ? 'aur-align-right' as const
          : undefined;
    const map: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
    this.tableConfig.columnsCfg.forEach(c => map[c.key] = toClass(c.align));
    map[IndexProvider.COLUMN_NAME] = toClass(this.tableConfig.indexCfg?.align);
    return map;
  }
```

- [ ] **Step 6: Шаблон** — `ngx-aur-mat-table.component.html`, 7 точек (3 ячейки индекса + 4 ячейки колонок данных), добавить атрибут `[ngClass]`:

Индексная колонка (3 ячейки):

```html
<!-- th индекса (после [style.max-width]="indexProvider.size?.maxWidth") -->
[ngClass]="_alignClass[indexProvider.COLUMN_NAME]"
<!-- td индекса — так же -->
<!-- footer td индекса — так же -->
```

Колонки данных (4 ячейки — sortable th, notSortable th, td, footer td), везде после `[style.max-width]="columnConfig.size?.maxWidth"`:

```html
[ngClass]="_alignClass[columnConfig.key]"
```

- [ ] **Step 7: SCSS** — `ngx-aur-mat-table.component.scss`. Удалить мёртвый блок:

```scss
.aur-mat-table .text-right {
  text-align: right !important;
}
```

На его месте добавить:

```scss
.aur-mat-table th.aur-align-center, .aur-mat-table td.aur-align-center { text-align: center; }
.aur-mat-table th.aur-align-right,  .aur-mat-table td.aur-align-right  { text-align: right; }

/* контейнер Material внутри сортируемого заголовка — flex, text-align его не двигает */
.aur-mat-table th.aur-align-center ::ng-deep .mat-sort-header-container { justify-content: center; }
.aur-mat-table th.aur-align-right ::ng-deep .mat-sort-header-container { justify-content: flex-end; }
```

`column-view.component.css` — добавить в конец (контент-ячейки — flex, text-align не двигает):

```css
:host-context(.aur-align-center) .align-container { justify-content: center; }
:host-context(.aur-align-right) .align-container { justify-content: flex-end; }
```

- [ ] **Step 8: Зелёный + полный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS, 0 failures.

- [ ] **Step 9: Commit**

```powershell
git add -A; git commit -m "feat(columns): align (left/center/right) for column header, cells and total"
```

---

### Task 2: #2 — класс подсветки + удаление `highlightClicked` (BREAKING)

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (ClickConfig)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`rowStyle`, `rowNgClass`)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-row-style.spec.ts`
- Modify (миграция демо): `projects/aur-demo/src/app/table-expanding-row/expanding-row.component.ts`, `.../expanding-row.component.html`, `projects/aur-demo/src/app/table-highlight-clicked-row/table-highlight-clicked-row.component.ts`, `projects/aur-demo/src/app/table-with-sub-footer/table-with-sub-footer.component.ts`

- [ ] **Step 1: Красный тест** — в `ngx-aur-mat-table-row-style.spec.ts`:

В `HostComponent.cfg` заменить

```ts
      clickCfg: { highlightClicked: Row.builder().background('yellow') },
```

на

```ts
      clickCfg: { styleCfg: { style: Row.builder().background('yellow'), class: 'row-selected' }, cancelable: true },
```

В тесте `'layers the highlight overlay...'` заменить комментарий `// from highlightClicked` на `// from clickCfg.styleCfg.style`. Добавить два теста в describe `NgxAurMatTable bodyRowCfg`:

```ts
  it('добавляет styleCfg.class только подсвеченной строке', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgClass(boldRow)['row-selected']).toBeUndefined();

    host.table.handleRowClick(boldRow);
    expect(host.table.rowNgClass(boldRow)['row-selected']).toBeTrue();
    expect(host.table.rowNgClass(plainRow)['row-selected']).toBeUndefined();
  });

  it('повторный клик при cancelable снимает класс подсветки', () => {
    const [boldRow] = host.table.tableDataSource.data;
    host.table.handleRowClick(boldRow);
    expect(host.table.rowNgClass(boldRow)['row-selected']).toBeTrue();

    host.table.handleRowClick(boldRow);
    expect(host.table.rowNgClass(boldRow)['row-selected']).toBeUndefined();
  });
```

- [ ] **Step 2: Убедиться, что красный**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-row-style.spec.ts'`
Expected: FAIL — `styleCfg` не существует в `ClickConfig` (ошибка компиляции).

- [ ] **Step 3: Контракт** — `model/ColumnConfig.ts`, заменить `ClickConfig` целиком:

```ts
export interface ClickConfig {
  /**
   * Стиль/класс, применяемый к кликнутой/подсвеченной строке.
   * Цвет текста ячеек при class задаётся селектором потребителя,
   * например `tr.my-highlight td { color: white; }`.
   */
  styleCfg?: ClickStyleConfig;

  /**
   * По умолчанию false
   * false: и первый, и второй клик испускают эту строку; выделение не сбрасывается.
   * true: первый клик испускает эту строку, второй клик испускает undefined; первый выделяет, второй снимает выделение.
   */
  cancelable?: boolean;
}

export interface ClickStyleConfig {
  /** CSS-класс(ы) на подсвеченном <tr>; допускается несколько через пробел. */
  class?: string;
  /** Инлайн-стиль; StyleBuilder.Row или сырая CSS-строка. */
  style?: StyleBuilder.Row | string;
}
```

- [ ] **Step 4: Компонент** — `ngx-aur-mat-table.component.ts`.

В `rowStyle()` заменить строку с `highlightClicked`:

```ts
    if (this.highlighted === row.rowSrc) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg?.style ?? null);
    }
```

`rowNgClass()` заменить целиком:

```ts
  rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
    const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
    const click = this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
    const hl = click?.style;
    const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.colorValue : !!hl;
    const isHighlighted = this.highlighted === row.rowSrc;
    const cls: { [klass: string]: boolean } = {
      'pointer': hover?.pointer || false,
      'new-color': isHighlighted && hlHasColor,
    };
    const custom = this.rowStyles[row.id]?.class;
    if (custom) cls[custom] = true;
    const hcls = this.hoverActive(row) ? hover?.styleCfg?.class : null;
    if (hcls) cls[hcls] = true;
    if (isHighlighted && click?.class) cls[click.class] = true;
    return cls;
  }
```

- [ ] **Step 5: Миграция демо.** В трёх компонентах (`expanding-row.component.ts`, `table-highlight-clicked-row.component.ts`, `table-with-sub-footer.component.ts`) одинаковая замена:

```ts
      clickCfg: {
        styleCfg: {
          style: StyleBuilder.Row.builder()
            .background('blue').color('red')
            .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
        },
        cancelable: true,
      },
```

В `expanding-row.component.html` (блок `<pre>`, строки ~12–19) заменить фрагмент с `highlightClicked` на:

```html
  bodyRowCfg: &#123;
    clickCfg: &#123;
      styleCfg: &#123;
        style: StyleBuilder.Row.builder()
          .background('blue').color('red')
          .border(b =&gt; b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
      &#125;,
      cancelable: true
    &#125;,
    hoverCfg: &#123; pointer: true &#125;
  &#125;,
```

- [ ] **Step 6: Ни одного упоминания не осталось**

Run: `Grep "highlightClicked" по projects/` (инструмент Grep)
Expected: 0 совпадений.

- [ ] **Step 7: Зелёный + полный прогон + сборка демо**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS.
Run: `npx ng build aur-demo --configuration development`
Expected: сборка без ошибок (миграция демо полная).

- [ ] **Step 8: Commit**

```powershell
git add -A; git commit -m "feat(row-click)!: highlight class via clickCfg.styleCfg; remove highlightClicked (BREAKING)"
```

---

### Task 3: #3 — форматтер индекса

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (IndexConfig)
- Modify: `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (td индекса)
- Create: `projects/ngx-aur-mat-table/src/lib/providers/IndexProvider.spec.ts`

- [ ] **Step 1: Красный тест** — создать `providers/IndexProvider.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { IndexProvider } from './IndexProvider';
import { NgxAurMatTableComponent } from '../ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from '../ngx-aur-mat-table.module';
import { TableConfig } from '../model/ColumnConfig';

describe('IndexProvider.format', () => {
  it('без форматтера возвращает строку с применённым offset', () => {
    const p = new IndexProvider({ offset: 1 });
    expect(p.format(0)).toBe('1');
  });

  it('применяет форматтер к индексу с уже применённым offset', () => {
    const p = new IndexProvider({ offset: 1, formatter: i => `${i}.` });
    expect(p.format(0)).toBe('1.');
  });

  it('без конфига: offset 0, без форматтера', () => {
    const p = new IndexProvider();
    expect(p.format(2)).toBe('2');
  });
});

interface R { name: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IndexFormatHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { enable: true, offset: 1, formatter: i => `${i}.` },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable index formatter (render)', () => {
  let fixture: ComponentFixture<IndexFormatHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IndexFormatHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IndexFormatHostComponent);
    fixture.detectChanges();
  });

  it('рендерит отформатированный индекс в ячейках', () => {
    const idxCells = fixture.nativeElement.querySelectorAll('tr[mat-row] td:first-child');
    expect((idxCells[0].textContent ?? '').trim()).toBe('1.');
    expect((idxCells[1].textContent ?? '').trim()).toBe('2.');
  });
});
```

- [ ] **Step 2: Убедиться, что красный**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/IndexProvider.spec.ts'`
Expected: FAIL — `formatter` нет в `IndexConfig`, `format` нет в `IndexProvider`.

- [ ] **Step 3: Контракт** — `model/ColumnConfig.ts`, в `IndexConfig` после `align?: ColumnAlign;` добавить:

```ts
  /** Форматирует отображаемый индекс (offset уже применён), например i => `${i}.` */
  formatter?: (index: number) => string;
```

- [ ] **Step 4: Провайдер** — `providers/IndexProvider.ts`. К полям класса добавить:

```ts
  public formatter: ((index: number) => string) | undefined;
```

В конструкторе после `this.size = indexConfig?.size;` добавить:

```ts
    this.formatter = indexConfig?.formatter;
```

После геттера `COLUMN_NAME` добавить метод:

```ts
  /** Отображаемое значение индекса для строки с данным id: offset применён, затем форматтер. */
  public format(id: number): string {
    const index = id + this.offset;
    return this.formatter ? this.formatter(index) : String(index);
  }
```

- [ ] **Step 5: Шаблон** — `ngx-aur-mat-table.component.html`, td индексной колонки: заменить

```html
            {{ element.id + indexProvider.offset }}
```

на

```html
            {{ indexProvider.format(element.id) }}
```

- [ ] **Step 6: Зелёный + полный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS.

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat(index): display index formatter"
```

---

### Task 4: #4 — `fit`: колонка по содержимому

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (ColumnSize)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (19 ячеек)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-column-fit.spec.ts`

- [ ] **Step 1: Красный тест** — создать `ngx-aur-mat-table-column-fit.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class FitHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },
      { key: 'age', name: 'Age', valueConverter: v => v.age,
        size: { fit: true }, totalConverter: rows => rows.length },
    ],
    indexCfg: { enable: true, size: { fit: true } },
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

describe('NgxAurMatTable ColumnSize.fit', () => {
  let fixture: ComponentFixture<FitHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [FitHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(FitHostComponent);
    fixture.detectChanges();
  });

  // порядок колонок: [0]=tbl_index, [1]=name, [2]=age
  function headerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell'));
  }
  function bodyCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td'));
  }
  function footerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-footer-row] td'));
  }

  it('fit-колонка данных: th/td/footer-td несут aur-col-fit', () => {
    expect(headerCells()[2].classList.contains('aur-col-fit')).toBeTrue();
    expect(bodyCells()[2].classList.contains('aur-col-fit')).toBeTrue();
    expect(footerCells()[2].classList.contains('aur-col-fit')).toBeTrue();
  });

  it('индексная колонка с size.fit несёт aur-col-fit', () => {
    expect(headerCells()[0].classList.contains('aur-col-fit')).toBeTrue();
    expect(bodyCells()[0].classList.contains('aur-col-fit')).toBeTrue();
  });

  it('колонка без fit класса не имеет', () => {
    expect(headerCells()[1].classList.contains('aur-col-fit')).toBeFalse();
    expect(bodyCells()[1].classList.contains('aur-col-fit')).toBeFalse();
  });
});
```

- [ ] **Step 2: Убедиться, что красный**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-column-fit.spec.ts'`
Expected: FAIL — `fit` нет в `ColumnSize` (компиляция).

- [ ] **Step 3: Контракт** — `model/ColumnConfig.ts`, в `ColumnSize` после `maxWidth?: string;` добавить:

```ts
  /**
   * Сжать колонку по содержимому (width: 1% + white-space: nowrap — семантическая замена хака width: '1%').
   * При одновременно заданном width инлайновая ширина побеждает — не сочетать.
   */
  fit?: boolean;
```

- [ ] **Step 4: SCSS** — `ngx-aur-mat-table.component.scss`, добавить после блоков align:

```scss
.aur-mat-table .aur-col-fit {
  width: 1%;
  white-space: nowrap;
}
```

- [ ] **Step 5: Шаблон** — `ngx-aur-mat-table.component.html`. К **каждой** ячейке, где биндится `[style.width]` от `ColumnSize`, добавить атрибут `[class.aur-col-fit]`. Полный список — 19 точек: 5 спец-колонок × 3 ячейки (th/td/footer-td) + 4 ячейки колонок данных (везде вставлять после строки `[style.max-width]="...maxWidth"`):

| Колонко-деф | Ячейки | Атрибут |
|---|---|---|
| timeline | th, td, footer td | `[class.aur-col-fit]="timelineProvider.size?.fit"` |
| drag | th, td, footer td | `[class.aur-col-fit]="dragDropProvider.size?.fit"` |
| index | th, td, footer td | `[class.aur-col-fit]="indexProvider.size?.fit"` |
| selection | th, td, footer td | `[class.aur-col-fit]="selectionProvider.size?.fit"` |
| action | th, td, footer td | `[class.aur-col-fit]="rowActionsProvider.size?.fit"` |
| колонки данных | th (sortable), th (notSortable), td, footer td | `[class.aur-col-fit]="columnConfig.size?.fit"` |

Пример (td колонки данных):

```html
          <td mat-cell *matCellDef="let element;"
              [style.width]="columnConfig.size?.width"
              [style.min-width]="columnConfig.size?.minWidth"
              [style.max-width]="columnConfig.size?.maxWidth"
              [class.aur-col-fit]="columnConfig.size?.fit"
              [ngClass]="_alignClass[columnConfig.key]">
```

- [ ] **Step 6: Зелёный + полный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS.

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat(column-size): fit - size column to content"
```

---

### Task 5: #6 — клавиатурная доступность кликабельных строк

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (`<tr mat-row>`)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-a11y.spec.ts`

- [ ] **Step 1: Красный тест** — создать `ngx-aur-mat-table-a11y.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data" (rowClick)="events.push($event)"></aur-mat-table>`,
})
class A11yHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  events: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { cancelable: true } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ReadOnlyHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable keyboard a11y (clickCfg задан)', () => {
  let fixture: ComponentFixture<A11yHostComponent>;
  let host: A11yHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [A11yHostComponent, ReadOnlyHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(A11yHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]'));
  }

  it('строки фокусируемы: tabindex="0"', () => {
    expect(rows()[0].getAttribute('tabindex')).toBe('0');
  });

  it('Enter активирует строку (rowClick) и ставит aria-current', () => {
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([host.data[0]]);
    expect(rows()[0].getAttribute('aria-current')).toBe('true');
    expect(rows()[1].hasAttribute('aria-current')).toBeFalse();
  });

  it('Space активирует строку и подавляет скролл (preventDefault)', () => {
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    rows()[0].dispatchEvent(ev);
    fixture.detectChanges();
    expect(host.events).toEqual([host.data[0]]);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('keydown с вложенного элемента (td) игнорируется — клик строки не дублируется', () => {
    const cell = rows()[0].querySelector('td')!;
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([]);
  });

  it('повторный Enter при cancelable снимает выделение (эмитит undefined)', () => {
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    rows()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.events).toEqual([host.data[0], undefined]);
    expect(rows()[0].hasAttribute('aria-current')).toBeFalse();
  });
});

describe('NgxAurMatTable keyboard a11y (без clickCfg)', () => {
  let fixture: ComponentFixture<ReadOnlyHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [A11yHostComponent, ReadOnlyHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ReadOnlyHostComponent);
    fixture.detectChanges();
  });

  it('строки не фокусируемы: атрибута tabindex нет', () => {
    const row = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement;
    expect(row.hasAttribute('tabindex')).toBeFalse();
  });
});
```

- [ ] **Step 2: Убедиться, что красный**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-a11y.spec.ts'`
Expected: FAIL — нет tabindex, rowClick по keydown не эмитится.

- [ ] **Step 3: Компонент** — `ngx-aur-mat-table.component.ts`.

Рядом с `_alignClass` добавить поле:

```ts
  /** Строки интерактивны (clickCfg задан) → tabindex/клавиатурная активация. */
  _rowsInteractive = false;
```

В `initTable()` после `this._alignClass = ...` добавить:

```ts
    this._rowsInteractive = isFeatureEnabledFn(this.tableConfig.bodyRowCfg?.clickCfg);
```

После `handleRowClick` добавить метод:

```ts
  /**
   * Клавиатурная активация строки: Enter/Space ведут себя как клик.
   * Обрабатываются только события самой строки — Enter/Space на вложенных
   * интерактивных элементах (чекбокс, кнопки действий) всплывают и не должны
   * дублировать клик по строке. preventDefault у Space подавляет скролл страницы.
   */
  handleRowKeydown(event: KeyboardEvent, row: TableRow<T>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleRowClick(row);
    }
  }
```

- [ ] **Step 4: Шаблон** — `ngx-aur-mat-table.component.html`, `<tr mat-row #rowLink ...>` дополнить тремя строками (после `(click)="handleRowClick(row)"`):

```html
            (keydown)="handleRowKeydown($event, row)"
            [attr.tabindex]="_rowsInteractive ? 0 : null"
            [attr.aria-current]="highlighted === row.rowSrc ? 'true' : null"
```

- [ ] **Step 5: SCSS** — `ngx-aur-mat-table.component.scss`, добавить:

```scss
/* видимый фокус клавиатурной навигации по кликабельным строкам (WCAG 2.4.7) */
.aur-mat-table tr.mat-mdc-row:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
```

- [ ] **Step 6: Зелёный + полный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS.

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat(a11y): keyboard access for clickable rows (tabindex, Enter/Space, aria-current, focus-visible)"
```

---

### Task 6: #7 — padding: CSS-переменные, конфиг, условный 25px

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (TableViewConfig, ColumnSize)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (`<table>` + 19 ячеек)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.scss`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-padding.spec.ts`

- [ ] **Step 1: Красный тест** — создать `ngx-aur-mat-table-padding.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PaddingHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },
      { key: 'age', name: 'Age', valueConverter: v => v.age,
        size: { paddingLeft: '10px', paddingRight: '12px' } },
    ],
    tableViewCfg: { cellPaddingLeft: '8px', cellPaddingRight: '9px' },
    headerButtonCfg: { icon: 'settings' },
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class NoButtonHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

describe('NgxAurMatTable padding config', () => {
  let fixture: ComponentFixture<PaddingHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PaddingHostComponent, NoButtonHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PaddingHostComponent);
    fixture.detectChanges();
  });

  function tableEl(): HTMLElement {
    return fixture.nativeElement.querySelector('table');
  }

  it('tableViewCfg.cellPadding* выставляет переменные на <table>', () => {
    expect(tableEl().style.getPropertyValue('--aur-cell-padding-left')).toBe('8px');
    expect(tableEl().style.getPropertyValue('--aur-cell-padding-right')).toBe('9px');
  });

  it('size.padding* выставляет переменные на ячейках колонки (и только её)', () => {
    const tds = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td')) as HTMLElement[];
    // [0]=name, [1]=age
    expect(tds[1].style.getPropertyValue('--aur-cell-padding-left')).toBe('10px');
    expect(tds[1].style.getPropertyValue('--aur-cell-padding-right')).toBe('12px');
    expect(tds[0].style.getPropertyValue('--aur-cell-padding-left')).toBe('');
  });

  it('с headerButtonCfg таблица несёт класс aur-has-header-button', () => {
    expect(tableEl().classList.contains('aur-has-header-button')).toBeTrue();
  });

  it('без headerButtonCfg класса aur-has-header-button нет', () => {
    const f2 = TestBed.createComponent(NoButtonHostComponent);
    f2.detectChanges();
    const t2 = f2.nativeElement.querySelector('table') as HTMLElement;
    expect(t2.classList.contains('aur-has-header-button')).toBeFalse();
  });
});
```

- [ ] **Step 2: Убедиться, что красный**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-padding.spec.ts'`
Expected: FAIL — `cellPaddingLeft`/`paddingLeft` нет в типах (компиляция).

- [ ] **Step 3: Контракт** — `model/ColumnConfig.ts`.

`TableViewConfig` — после `maxHeight?: string;` добавить:

```ts
  /** Левый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingLeft?: string;
  /** Правый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingRight?: string;
```

`ColumnSize` — после `fit?: boolean;` добавить:

```ts
  /** Левый отступ ячеек этой колонки; приоритетнее табличного cellPaddingLeft. */
  paddingLeft?: string;
  /** Правый отступ ячеек этой колонки; приоритетнее табличного cellPaddingRight. */
  paddingRight?: string;
```

- [ ] **Step 4: SCSS** — `ngx-aur-mat-table.component.scss`.

Заменить блок (фикс скоупа `td` + переменные; `!important` остаётся — он перебивает падинги Material MDC, чьи селекторы различаются между версиями; потребитель теперь управляет значением через переменную, без specificity-войн):

```scss
.aur-mat-table th, td {
  padding-right: 4px !important;
  padding-left: 4px !important;
}
```

на

```scss
.aur-mat-table th, .aur-mat-table td {
  padding-right: var(--aur-cell-padding-right, 4px) !important;
  padding-left: var(--aur-cell-padding-left, 4px) !important;
}
```

Заменить блок:

```scss
.mat-mdc-header-row th:last-child {
  padding-right: 25px !important;
}
```

на

```scss
/* зазор под абсолютную кнопку настроек (headerButtonCfg) — только когда она есть */
.aur-mat-table table.aur-has-header-button .mat-mdc-header-row th:last-child {
  padding-right: var(--aur-last-header-padding-right, 25px) !important;
}
```

- [ ] **Step 5: Шаблон** — `ngx-aur-mat-table.component.html`.

На `<table #table mat-table matSort ...>` добавить (после `[trackBy]="trackByRow"`):

```html
             [class.aur-has-header-button]="headerButtonProvider.isEnabled"
             [style.--aur-cell-padding-left]="tableConfig.tableViewCfg?.cellPaddingLeft"
             [style.--aur-cell-padding-right]="tableConfig.tableViewCfg?.cellPaddingRight"
```

К 19 ячейкам с биндингом `ColumnSize` добавить по два атрибута (после `[class.aur-col-fit]="..."` из Task 4):

| Колонко-деф | Ячейки | Источник |
|---|---|---|
| timeline | th, td, footer td | `timelineProvider.size` |
| drag | th, td, footer td | `dragDropProvider.size` |
| index | th, td, footer td | `indexProvider.size` |
| selection | th, td, footer td | `selectionProvider.size` |
| action | th, td, footer td | `rowActionsProvider.size` |
| колонки данных | th (sortable), th (notSortable), td, footer td | `columnConfig.size` |

Атрибуты (пример для колонок данных; для остальных подставить источник из таблицы):

```html
              [style.--aur-cell-padding-left]="columnConfig.size?.paddingLeft"
              [style.--aur-cell-padding-right]="columnConfig.size?.paddingRight"
```

- [ ] **Step 6: Зелёный + полный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS.

- [ ] **Step 7: Commit**

```powershell
git add -A; git commit -m "feat(padding): cell padding CSS vars + table/column config; last-header 25px only with header button"
```

---

### Task 7: #8 — иконка: `tooltipClass` + позиция относительно текста

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (IconView)
- Modify: `projects/ngx-aur-mat-table/src/lib/components/icon-view/icon-view.component.html`
- Modify: `projects/ngx-aur-mat-table/src/lib/components/column-value/column-view.component.html`, `.css`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (2 тултип-кнопки действий)
- Modify: `projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/factories/ActionViewFactory.spec.ts`, `projects/ngx-aur-mat-table/src/lib/model/TableViewFactory.spec.ts`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-icon-view.spec.ts`
- Modify (демо): `projects/aur-demo/src/app/table-with-icons/table-with-icons.component.ts`, `projects/aur-demo/src/styles.scss`

- [ ] **Step 1: Красные тесты фабрик.**

`factories/ActionViewFactory.spec.ts` — в `configWithMenu()` иконку action дополнить:

```ts
          icon: {name: () => 'more_vert', tooltipClass: () => 'tt-danger', position: 'end'},
```

и в тест `'resolves menu item functions to booleans per row'` добавить проверки:

```ts
    expect(action.icon.tooltipClass).toBe('tt-danger');
    expect(action.icon.position).toBe('end');
```

`model/TableViewFactory.spec.ts` — добавить describe в конец файла (использует уже импортированные `TableViewFactory`, `TableRow`; если `TableConfig` не импортирован — добавить в существующий import из `'./ColumnConfig'`):

```ts
describe('TableViewFactory icon tooltipClass/position', () => {
  it('резолвит tooltipClass per-row и переносит position как есть', () => {
    const row = new TableRow<{sev: string}>(0, {sev: 'high'});
    const cfg: TableConfig<{sev: string}> = {
      columnsCfg: [{
        key: 'sev', name: 'Severity', valueConverter: v => v.sev,
        valueView: {
          icon: {
            name: () => 'warning',
            tooltip: () => 'hint',
            tooltipClass: r => `tt-${r.rowSrc.sev}`,
            position: 'end',
          },
        },
      }],
    };
    const view = TableViewFactory.toView([row], cfg);
    const icon = view[0].get('sev')!.icon!;
    expect(icon.tooltipClass).toBe('tt-high');
    expect(icon.position).toBe('end');
  });
});
```

- [ ] **Step 2: Красный рендер-тест** — создать `ngx-aur-mat-table-icon-view.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatTooltip } from '@angular/material/tooltip';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IconHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{
      key: 'name', name: 'Name', valueConverter: v => v.name,
      valueView: {
        icon: {
          name: () => 'info',
          tooltip: () => 'hint',
          tooltipClass: () => 'tt-custom',
          position: 'end',
        },
      },
    }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable icon tooltipClass/position (render)', () => {
  let fixture: ComponentFixture<IconHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IconHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
  });

  it('lib-icon-view с position end несёт класс icon-end', () => {
    const iconView = fixture.nativeElement.querySelector('tr[mat-row] lib-icon-view') as HTMLElement;
    expect(iconView.classList.contains('icon-end')).toBeTrue();
  });

  it('tooltipClass доезжает до MatTooltip иконки', () => {
    const tooltipDe = fixture.debugElement
      .queryAll(By.directive(MatTooltip))
      .find(de => de.nativeElement.tagName.toLowerCase() === 'mat-icon')!;
    expect(tooltipDe.injector.get(MatTooltip).tooltipClass).toBe('tt-custom');
  });
});
```

- [ ] **Step 3: Убедиться, что красные**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ActionViewFactory.spec.ts' --include='**/TableViewFactory.spec.ts' --include='**/ngx-aur-mat-table-icon-view.spec.ts'`
Expected: FAIL — `tooltipClass`/`position` нет в `IconView` (компиляция).

- [ ] **Step 4: Контракт** — `model/ColumnConfig.ts`, в `IconView<T>` после `tooltip?: T;` добавить:

```ts
  /** CSS-класс(ы) тултипа; прокидывается в matTooltipClass. */
  tooltipClass?: T;

  /**
   * Позиция иконки относительно текста ячейки: 'start' (по умолчанию) — перед текстом,
   * 'end' — после. Действует в ячейках/заголовках; для кнопок действий и drag-иконки игнорируется.
   */
  position?: 'start' | 'end';
```

- [ ] **Step 5: Фабрики.**

`factories/ActionViewFactory.ts`, `prepareIconConfig` — заменить return:

```ts
    return {
      name: iconSource.name(value),
      color: iconSource.color ? iconSource.color(value) : undefined,
      tooltip: iconSource.tooltip ? iconSource.tooltip(value) : undefined,
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(value) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper ? {color: iconSource.wrapper.color(value)} : undefined
    }
```

`model/TableViewFactory.ts`, `configureIcon` — заменить return:

```ts
    return {
      name: iconSource.name(row),
      color: iconSource.color ? iconSource.color(row) : undefined,
      tooltip: iconSource.tooltip ? iconSource.tooltip(row) : undefined,
      tooltipClass: iconSource.tooltipClass ? iconSource.tooltipClass(row) : undefined,
      position: iconSource.position,
      wrapper: iconSource.wrapper? {color: iconSource.wrapper.color(row)}: undefined,
      visible: iconSource.visible? iconSource.visible(row): true
    }
```

- [ ] **Step 6: Шаблоны.**

`components/icon-view/icon-view.component.html` — в ветке с тултипом добавить `[matTooltipClass]`:

```html
    <mat-icon *ngIf="view.tooltip as tooltip; else plainIcon"
              [matTooltip]="tooltip"
              [matTooltipClass]="view.tooltipClass || ''"
              [style.color]="view.color">
```

`components/column-value/column-view.component.html` — иконка получает класс позиции:

```html
  <lib-icon-view *ngIf="config?.icon" [view]="config?.icon"
                 [class.icon-end]="config?.icon?.position === 'end'">
  </lib-icon-view>
```

`components/column-value/column-view.component.css` — добавить в конец:

```css
/* иконка после текста: flex order; зеркальный отступ (зазор start-иконки даёт margin-left у span) */
lib-icon-view.icon-end {
  order: 1;
  margin-left: 4px;
}
```

`ngx-aur-mat-table.component.html` — обе тултип-кнопки действий (menu-ветка `*ngIf="action.icon.tooltip; else menuBtnPlain"` и direct-ветка `*ngIf="action.icon.tooltip; else directBtnPlain"`) дополнить после `[matTooltip]="action.icon.tooltip"`:

```html
                          [matTooltipClass]="action.icon.tooltipClass || ''"
```

- [ ] **Step 7: Зелёный + полный прогон**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS.

- [ ] **Step 8: Демо-пример (под визуальную проверку).**

`projects/aur-demo/src/app/table-with-icons/table-with-icons.component.ts` — в колонке `'age'` иконку `valueView.icon` дополнить двумя полями (после `tooltip: () => '...'`):

```ts
            tooltipClass: () => 'demo-tooltip',
            position: 'end',
```

`projects/aur-demo/src/styles.scss` — добавить в конец (тултип рендерится в overlay вне компонента — класс глобальный):

```scss
/* демо #8: кастомный класс тултипа иконки */
.demo-tooltip .mdc-tooltip__surface {
  background-color: #7b1fa2 !important;
  font-style: italic;
}
```

- [ ] **Step 9: Сборка демо**

Run: `npx ng build aur-demo --configuration development`
Expected: сборка без ошибок.

- [ ] **Step 10: Commit**

```powershell
git add -A; git commit -m "feat(icon-view): tooltipClass and icon position relative to cell text"
```

---

### Task 8: Финал — проверка, релиз 19.6.0, merge

- [ ] **Step 1: Полный прогон + сборки**

Run: `npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: SUCCESS, 0 failures.
Run: `npm run build_lib`
Expected: сборка библиотеки без ошибок.
Run: `npx ng build aur-demo --configuration development`
Expected: сборка демо без ошибок.

- [ ] **Step 2: Визуальная проверка #8** (выполняет главная сессия, skill `verify`/`run`): поднять демо `npx ng serve aur-demo`, открыть пример table-with-icons → у иконки в колонке возраста: иконка справа от текста, тултип с фиолетовым фоном (класс `demo-tooltip`). Скриншот в чат.

- [ ] **Step 3: Версия** — `projects/ngx-aur-mat-table/package.json`: `"version": "19.5.0"` → `"version": "19.6.0"`.

- [ ] **Step 4: Changelog** (выполняет главная сессия, skill `writing-changelog`): запись 19.6.0 — 7 фич; блок **BREAKING**: `highlightClicked` удалён → миграция `clickCfg.styleCfg.style`; заметка о визуальном изменении: 25px у последнего заголовка теперь только при `headerButtonCfg`.

- [ ] **Step 5: Релизный коммит**

```powershell
git add -A; git commit -m "chore(release): bump to 19.6.0 + changelog"
```

- [ ] **Step 6: Merge** (после подтверждения пользователя)

```powershell
git checkout master; git merge feature/feedback-19.6.0; git branch -d feature/feedback-19.6.0
```

---

## Сверка со спекой (самопроверка)

- #1 align → Task 1 (тип `ColumnAlign`, `ColumnConfig.align`, `IndexConfig.align`, precompute `_alignClass`, SCSS + `::ng-deep` sort-header, `:host-context` column-view, удаление мёртвого `.text-right`).
- #2 класс подсветки + BREAKING → Task 2 (`ClickStyleConfig`, `rowStyle`/`rowNgClass`, миграция спеки и демо ×3 + html-сниппет, grep-проверка нуля упоминаний).
- #3 форматтер → Task 3 (`IndexConfig.formatter`, `IndexProvider.format`, шаблон).
- #4 fit → Task 4 (`ColumnSize.fit`, `.aur-col-fit`, 19 точек биндинга).
- #6 a11y → Task 5 (`_rowsInteractive`, `handleRowKeydown` c guard, tabindex/aria-current, focus-visible).
- #7 padding → Task 6 (переменные + фикс скоупа, условный 25px через `aur-has-header-button`, `TableViewConfig.cellPadding*`, `ColumnSize.padding*`, биндинги на `<table>` и 19 ячейках).
- #8 иконки → Task 7 (`IconView.tooltipClass/position`, фабрики ×2, icon-view/column-view, кнопки действий ×2, демо-пример + глобальный стиль).
- Релиз/changelog/merge → Task 8. Новые типы уезжают в public API через существующий `export *` от `ColumnConfig` — отдельной правки `public-api.ts` не требуется.
