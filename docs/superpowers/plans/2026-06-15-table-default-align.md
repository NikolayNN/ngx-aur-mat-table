# Табличный align по умолчанию (tableViewCfg.align) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новое `TableViewConfig.align` — дефолтное выравнивание для обычных колонок И колонки индекса (вариант b); локальный `ColumnConfig.align`/`IndexConfig.align` приоритетнее. Non-breaking.

**Architecture:** Аддитивное опциональное поле → красная фаза компилируется без правок компонента (Task 1 = контракт + спек). Зелёная (Task 2) = две строки фолбэка `c.align ?? def` в `buildAlignClassMap`. Шаблон/SCSS не трогаем. TDD: 2 красных + 3 пина.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-15-table-default-align-design.md`

**Контекст ветки:** `feat/19.7.0-feedback`, коммит на пункт (последний в батче). НЕ мержить. `public-api.ts` правки не требует.

---

### Task 1: Контракт + красный спек

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (`TableViewConfig` ~309)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-table-align.spec.ts`

- [ ] **Step 1.1: Поле `align` в `TableViewConfig`.** Найти:

```ts
  /** Левый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingLeft?: string;
  /** Правый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingRight?: string;
}
```

заменить на:

```ts
  /** Левый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingLeft?: string;
  /** Правый отступ ячеек всей таблицы (CSS-значение), по умолчанию 4px. */
  cellPaddingRight?: string;
  /**
   * Выравнивание по умолчанию для обычных колонок и колонки индекса.
   * Локальный ColumnConfig.align / IndexConfig.align приоритетнее. По умолчанию 'left'.
   */
  align?: ColumnAlign;
}
```

(`ColumnAlign` объявлен в этом же файле — импорт не нужен.)

- [ ] **Step 1.2: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-table-align.spec.ts`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; city: string; }

function headerCells(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell'));
}
function bodyCells(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td'));
}
function footerCells(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-footer-row] td'));
}

// порядок колонок: [0]=tbl_index, [1]=name, [2]=age, [3]=city
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class TableAlignHostComponent {
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name },                         // нет align → наследует center
      { key: 'age', name: 'Age', valueConverter: v => v.age, align: 'left' },              // override → нет класса
      { key: 'city', name: 'City', valueConverter: v => v.city, align: 'right',
        totalConverter: rows => rows.length },                                             // override → right + footer
    ],
    indexCfg: { enable: true },          // без align → наследует center (вариант b)
    tableViewCfg: { align: 'center' },
  };
  data: R[] = [{ name: 'a', age: 1, city: 'x' }];
}

describe('NgxAurMatTable table-default align', () => {
  let fixture: ComponentFixture<TableAlignHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [TableAlignHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TableAlignHostComponent);
    fixture.detectChanges();
  });

  it('колонка без своего align наследует tableViewCfg.align (center)', () => {
    expect(headerCells(fixture)[1].classList.contains('aur-align-center')).toBeTrue();
    expect(bodyCells(fixture)[1].classList.contains('aur-align-center')).toBeTrue();
  });

  it('align: left перекрывает табличный center → класса нет', () => {
    expect(headerCells(fixture)[2].classList.contains('aur-align-center')).toBeFalse();
    expect(headerCells(fixture)[2].classList.contains('aur-align-right')).toBeFalse();
    expect(bodyCells(fixture)[2].classList.contains('aur-align-center')).toBeFalse();
  });

  it('align: right перекрывает табличный center → aur-align-right (header/body/footer)', () => {
    expect(headerCells(fixture)[3].classList.contains('aur-align-right')).toBeTrue();
    expect(headerCells(fixture)[3].classList.contains('aur-align-center')).toBeFalse();
    expect(bodyCells(fixture)[3].classList.contains('aur-align-right')).toBeTrue();
    expect(footerCells(fixture)[3].classList.contains('aur-align-right')).toBeTrue();
  });

  it('индекс без своего align наследует tableViewCfg.align (center) — вариант b', () => {
    expect(headerCells(fixture)[0].classList.contains('aur-align-center')).toBeTrue();
    expect(bodyCells(fixture)[0].classList.contains('aur-align-center')).toBeTrue();
    expect(footerCells(fixture)[0].classList.contains('aur-align-center')).toBeTrue();
  });
});

// Host B: индекс со своим align перекрывает табличный
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class IndexOwnAlignHostComponent {
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    indexCfg: { enable: true, align: 'right' },
    tableViewCfg: { align: 'center' },
  };
  data: R[] = [{ name: 'a', age: 1, city: 'x' }];
}

describe('NgxAurMatTable table-default align: index override', () => {
  let fixture: ComponentFixture<IndexOwnAlignHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [IndexOwnAlignHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(IndexOwnAlignHostComponent);
    fixture.detectChanges();
  });

  it('indexCfg.align: right перекрывает табличный center → aur-align-right', () => {
    expect(headerCells(fixture)[0].classList.contains('aur-align-right')).toBeTrue();
    expect(headerCells(fixture)[0].classList.contains('aur-align-center')).toBeFalse();
  });
});
```

- [ ] **Step 1.3: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-table-align.spec.ts'
```

Ожидание — 2 FAIL и 3 PASS:
- FAIL «колонка без align наследует center» (фолбэка нет → класса нет);
- PASS «align: left перекрывает → класса нет» (left и так без класса — пин override-down);
- PASS «align: right перекрывает → right» (right и так применён — пин override);
- FAIL «индекс наследует center (b)» (фолбэка нет → у индекса класса нет);
- PASS «индекс own right перекрывает» (right и так применён — пин override).

Иное распределение — остановиться, разобраться, доложить.

---

### Task 2: Зелёный — фолбэк в `buildAlignClassMap`

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`buildAlignClassMap` ~468)

- [ ] **Step 2.1: Фолбэк.** Найти:

```ts
    const map: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
    this.tableConfig.columnsCfg.forEach(c => map[c.key] = toClass(c.align));
    map[IndexProvider.COLUMN_NAME] = toClass(this.tableConfig.indexCfg?.align);
```

заменить на:

```ts
    const map: Record<string, 'aur-align-center' | 'aur-align-right' | undefined> = {};
    const def = this.tableConfig.tableViewCfg?.align;
    this.tableConfig.columnsCfg.forEach(c => map[c.key] = toClass(c.align ?? def));
    map[IndexProvider.COLUMN_NAME] = toClass(this.tableConfig.indexCfg?.align ?? def);
```

- [ ] **Step 2.2: Зелёный прогон** того же спека (команда из Step 1.3). Ожидание: 5 PASS, 0 FAIL.

- [ ] **Step 2.3: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **185 of 185 SUCCESS** (180 существующих + 5 новых), 0 FAILED. Особое внимание: `ngx-aur-mat-table-align.spec.ts` (поколоночный align — не должен сломаться, в нём нет `tableViewCfg.align`, значит `def` undefined и поведение прежнее). Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (секция «Row config & styling», после абзаца **Tooltip position**, ~строка 188)

- [ ] **Step 3.1: README.** Найти абзац:

```md
**Tooltip position:** `icon.tooltipPosition` / `text.tooltipPosition` (and the same on action icons) set `matTooltipPosition` (`'left' | 'right' | 'above' | 'below' | 'before' | 'after'`, default `'below'`) — useful for narrow or edge columns.
```

и добавить ПОСЛЕ него отдельный абзац (пустая строка до и после):

```md
**Default alignment:** `tableViewCfg.align` (`'left' | 'center' | 'right'`) sets the default for all data columns and the index column at once; a per-column `ColumnConfig.align` / `IndexConfig.align` overrides it. Without it columns stay left-aligned as before.
```

- [ ] **Step 3.2: Сборка**:

```bash
npm run build_lib
```

Ожидание: успешно, без ошибок.

- [ ] **Step 3.3: Коммит** (один на пункт):

```powershell
git add projects/ngx-aur-mat-table/src/lib README.md
git commit -m @'
feat(columns): tableViewCfg.align — table-wide default column alignment

tableViewCfg.align sets the default alignment for all data columns and the
index column (variant b — the index inherits it too); a per-column
ColumnConfig.align / IndexConfig.align still wins via `c.align ?? def` in
buildAlignClassMap. Spec columns (selection/action/drag/timeline) are
unaffected. Template/SCSS unchanged — the default flows to header/sortable/
body/footer through the existing [ngClass] binding. Non-breaking: unset keeps
left alignment.
'@
```

После коммита `git show --stat HEAD`: ровно 4 файла — `model/ColumnConfig.ts`, `ngx-aur-mat-table.component.ts`, `ngx-aur-mat-table-table-align.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
