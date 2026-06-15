# Условные hover/pointer/click по строке — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `HoverConfig<T>`/`ClickConfig<T>` параметризованы; `pointer`/`styleCfg.style`/`styleCfg.class` принимают `RowValue<T,R>` = значение или `(row: TableRow<T>) => значение`. Можно отключать hover/pointer/менять подсветку для отдельных строк. Обратносовместимо.

**Architecture:** Тип `RowValue<T,R>` + параметризация интерфейсов в `ColumnConfig.ts` (контракт) + резолвер `resolveRow` и правки `rowStyle`/`rowNgClass` в компоненте. Шаблон/SCSS не меняются. TDD: 3 красных + 1 пин.

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless).

**Спека:** `docs/superpowers/specs/2026-06-15-conditional-row-style-design.md`

**Контекст ветки:** `feat/19.7.0-feedback`, коммит на пункт. НЕ мержить. `public-api.ts` правки не требует.

---

### Task 1: Контракт + красный спек

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (тип `RowValue` ~после `Resolvable` строка 11; интерфейсы Click/Hover ~72-107; `BodyRowConfig` ~113-117)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-conditional-row-style.spec.ts`

- [ ] **Step 1.1: Тип `RowValue`.** Найти (около строки 11):

```ts
export type Resolvable<T, R> = T extends (arg: infer A) => any ? (arg: A) => R : R;
```

заменить на:

```ts
export type Resolvable<T, R> = T extends (arg: infer A) => any ? (arg: A) => R : R;

/** Значение, общее для строки, или вычисляемое по строке. */
export type RowValue<T, R> = R | ((row: TableRow<T>) => R);
```

- [ ] **Step 1.2: Параметризовать Click/Hover интерфейсы.** Найти блок:

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

export interface HoverConfig {
  /** Главный переключатель оверлея наведения; считается true, когда hoverCfg задан и это значение не false */
  enable?: boolean;
  /** Показывать cursor: pointer на строке тела */
  pointer?: boolean;
  /** Стиль/класс, применяемый при наведении на строку (оверлей, как подсветка) */
  styleCfg?: HoverStyleConfig;
}

export interface HoverStyleConfig {
  class?: string;
  style?: StyleBuilder.Row | string;
}
```

заменить на:

```ts
export interface ClickConfig<T = any> {
  /**
   * Стиль/класс, применяемый к кликнутой/подсвеченной строке.
   * Цвет текста ячеек при class задаётся селектором потребителя,
   * например `tr.my-highlight td { color: white; }`.
   */
  styleCfg?: ClickStyleConfig<T>;

  /**
   * По умолчанию false (от строки не зависит).
   * false: и первый, и второй клик испускают эту строку; выделение не сбрасывается.
   * true: первый клик испускает эту строку, второй клик испускает undefined; первый выделяет, второй снимает выделение.
   */
  cancelable?: boolean;
}

export interface ClickStyleConfig<T = any> {
  /** CSS-класс(ы) на подсвеченном <tr>; значение или (row) => значение. */
  class?: RowValue<T, string | null>;
  /** Инлайн-стиль; StyleBuilder.Row | строка, либо (row) => то же. */
  style?: RowValue<T, StyleBuilder.Row | string>;
}

export interface HoverConfig<T = any> {
  /** Главный переключатель оверлея наведения (табличный); считается true, когда hoverCfg задан и это значение не false */
  enable?: boolean;
  /** Показывать cursor: pointer на строке тела; значение или (row) => значение */
  pointer?: RowValue<T, boolean>;
  /** Стиль/класс, применяемый при наведении на строку (оверлей, как подсветка) */
  styleCfg?: HoverStyleConfig<T>;
}

export interface HoverStyleConfig<T = any> {
  /** CSS-класс(ы) при наведении; значение или (row) => значение. */
  class?: RowValue<T, string | null>;
  /** Инлайн-стиль при наведении; StyleBuilder.Row | строка, либо (row) => то же. */
  style?: RowValue<T, StyleBuilder.Row | string>;
}
```

- [ ] **Step 1.3: `BodyRowConfig` — прокинуть `<T>`.** Найти:

```ts
export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig;
  hoverCfg?: HoverConfig;
  styleCfg?: BodyStyleConfig<T>;
}
```

заменить на:

```ts
export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig<T>;
  hoverCfg?: HoverConfig<T>;
  styleCfg?: BodyStyleConfig<T>;
}
```

- [ ] **Step 1.4: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-conditional-row-style.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; system?: boolean; vip?: boolean; }

function bodyRows(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row'));
}

// ---------- pointer per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PointerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { pointer: row => !row.rowSrc.system } },
  };
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('conditional row style: pointer per-row', () => {
  let fixture: ComponentFixture<PointerHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PointerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PointerHostComponent);
  });

  it('системная строка без класса pointer, обычная — с ним', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);
    expect(r0.classList.contains('pointer')).withContext('system row').toBeFalse();
    expect(r1.classList.contains('pointer')).withContext('обычная row').toBeTrue();
  });
});

// ---------- hover style per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HoverStyleHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { styleCfg: { style: row => row.rowSrc.system ? '' : 'color: red' } } },
  };
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

describe('conditional row style: hover style per-row', () => {
  let fixture: ComponentFixture<HoverStyleHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HoverStyleHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HoverStyleHostComponent);
  });

  it('mouseenter: обычная строка → color red, системная → пусто', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);

    r1.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(r1.style.color).toBe('red');

    r1.dispatchEvent(new MouseEvent('mouseleave'));
    r0.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(r0.style.color).toBe(''); // system → ''
  });
});

// ---------- click style per-row ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClickStyleHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { styleCfg: { style: row => 'color: ' + (row.rowSrc.vip ? 'gold' : 'gray') } } },
  };
  data: Row[] = [{ name: 'a', vip: true }, { name: 'b', vip: false }];
}

describe('conditional row style: click style per-row', () => {
  let fixture: ComponentFixture<ClickStyleHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClickStyleHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClickStyleHostComponent);
  });

  it('клик по vip-строке → gold; по обычной → gray', () => {
    fixture.detectChanges();
    const [r0, r1] = bodyRows(fixture);

    r0.click(); // vip
    fixture.detectChanges();
    expect(r0.style.color).toBe('gold');

    r1.click(); // обычная
    fixture.detectChanges();
    expect(r1.style.color).toBe('gray');
  });
});

// ---------- регрессия: статичный pointer ----------

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class StaticPointerHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { hoverCfg: { pointer: true } },
  };
  data: Row[] = [{ name: 'a' }, { name: 'b' }];
}

describe('conditional row style: статичный pointer (регрессия)', () => {
  let fixture: ComponentFixture<StaticPointerHostComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [StaticPointerHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(StaticPointerHostComponent);
  });

  it('pointer: true → класс pointer на всех строках', () => {
    fixture.detectChanges();
    bodyRows(fixture).forEach(r => expect(r.classList.contains('pointer')).toBeTrue());
  });
});
```

- [ ] **Step 1.5: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-conditional-row-style.spec.ts'
```

Ожидание — 3 FAIL и 1 PASS:
- FAIL «pointer per-row» — компонент делает `hover?.pointer || false`; функция truthy → класс `pointer` навешивается и на системную строку (assertion fail);
- FAIL «hover style per-row» — после mouseenter компонент передаёт функцию в `toCss()`, та зовёт `.build()` у функции → TypeError при detectChanges (падение по ошибке — это валидный red, фича не реализована);
- FAIL «click style per-row» — то же при клике (функция → toCss → throw);
- PASS «статичный pointer» — `true || false` = true → класс на всех (пин обратной совместимости).

Иное распределение — остановиться, разобраться, доложить с логами.

---

### Task 2: Зелёный — резолвер + правки методов

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`resolveRow` после `resolveTotal` ~строка 663; `rowStyle` ~711; `rowNgClass` ~723; импорт `RowValue`)

- [ ] **Step 2.1: Импорт `RowValue`.** Найти строку импорта из `./model/ColumnConfig`:

```ts
import {ColumnAlign, ColumnView, TableConfig} from './model/ColumnConfig';
```

заменить на:

```ts
import {ColumnAlign, ColumnView, RowValue, TableConfig} from './model/ColumnConfig';
```

- [ ] **Step 2.2: Резолвер.** Найти метод `resolveTotal` и сразу ПОСЛЕ его закрывающей скобки добавить:

```ts
  /** RowValue<T,R> → R: статика как есть, функция вызывается со строкой. */
  private resolveRow<R>(v: RowValue<T, R> | undefined, row: TableRow<T>): R | undefined {
    return typeof v === 'function' ? (v as (row: TableRow<T>) => R)(row) : v;
  }
```

(`resolveTotal` заканчивается так:)

```ts
  private resolveTotal<R>(
    v: R | ((t: Map<string, any>, d: TableRow<T>[]) => R) | undefined,
    totals: Map<string, any>, data: TableRow<T>[],
  ): R | undefined {
    return typeof v === 'function' ? (v as any)(totals, data) : v;
  }
```

— добавляй `resolveRow` сразу после неё.

- [ ] **Step 2.3: `rowStyle`.** Найти:

```ts
  rowStyle(row: TableRow<T>): string | null {
    let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
    if (this.hoverActive(row)) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style ?? null);
    }
    if (this.highlighted === row.rowSrc) {
      acc = this.mergeStyle(acc, this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg?.style ?? null);
    }
    return this.toCss(acc);
  }
```

заменить на:

```ts
  rowStyle(row: TableRow<T>): string | null {
    let acc: StyleBuilder.Row | string | null = this.rowStyles[row.id]?.style ?? null;
    if (this.hoverActive(row)) {
      acc = this.mergeStyle(acc, this.resolveRow(this.tableConfig.bodyRowCfg?.hoverCfg?.styleCfg?.style, row) ?? null);
    }
    if (this.highlighted === row.rowSrc) {
      acc = this.mergeStyle(acc, this.resolveRow(this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg?.style, row) ?? null);
    }
    return this.toCss(acc);
  }
```

- [ ] **Step 2.4: `rowNgClass`.** Найти:

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

заменить на:

```ts
  rowNgClass(row: TableRow<T>): { [klass: string]: boolean } {
    const hover = this.tableConfig.bodyRowCfg?.hoverCfg;
    const click = this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
    const isHighlighted = this.highlighted === row.rowSrc;
    // click-style резолвим только для подсвеченной строки (иначе функция зря зовётся на каждую)
    const hl = isHighlighted ? this.resolveRow(click?.style, row) : null;
    const hlHasColor = hl instanceof StyleBuilder.Row ? !!hl.colorValue : !!hl;
    const cls: { [klass: string]: boolean } = {
      'pointer': this.resolveRow(hover?.pointer, row) || false,
      'new-color': isHighlighted && hlHasColor,
    };
    const custom = this.rowStyles[row.id]?.class;
    if (custom) cls[custom] = true;
    const hcls = this.hoverActive(row) ? this.resolveRow(hover?.styleCfg?.class, row) : null;
    if (hcls) cls[hcls] = true;
    const ccls = isHighlighted ? this.resolveRow(click?.class, row) : null;
    if (ccls) cls[ccls] = true;
    return cls;
  }
```

- [ ] **Step 2.5: Зелёный прогон** того же спека (команда из Step 1.5). Ожидание: 4 PASS, 0 FAIL.

- [ ] **Step 2.6: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **174 of 174 SUCCESS** (170 существующих + 4 новых), 0 FAILED. Особое внимание: `ngx-aur-mat-table-row-style.spec.ts`, `ngx-aur-mat-table.component.spec.ts` (клик/подсветка/hover), `RowStyleFactory.spec.ts`. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (буллеты секции «Row config & styling», ~строка 183)

- [ ] **Step 3.1: README.** Найти буллет:

```md
- `bodyRowCfg.hoverCfg` drives a mouse-enter/leave overlay; the `#f2f2f2` hardcoded hover background is gone — configure it via `hoverCfg.styleCfg` or suppress hover entirely by omitting `hoverCfg`.
```

и добавить ПОСЛЕ него новый буллет:

```md
- `hoverCfg.pointer` / `hoverCfg.styleCfg.*` / `clickCfg.styleCfg.*` accept a static value **or** a `(row: TableRow<T>) => value` function — e.g. `pointer: row => !row.rowSrc.system` disables the pointer/hover for system rows while leaving others interactive.
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
feat(row): per-row hover/pointer/click via RowValue<T,R>

HoverConfig<T>/ClickConfig<T> are now generic; pointer, styleCfg.style and
styleCfg.class accept a static value or a (row: TableRow<T>) => value
function, so hover/pointer/highlight can be disabled or varied per row
(e.g. pointer: row => !row.rowSrc.system). resolveRow() resolves them in
rowStyle()/rowNgClass(); click/hover functions run only for the
highlighted/hovered row, pointer for all. Static config is unchanged
(backward compatible); enable/cancelable stay table-wide.
'@
```

После коммита `git show --stat HEAD`: ровно 4 файла — `model/ColumnConfig.ts`, `ngx-aur-mat-table.component.ts`, `ngx-aur-mat-table-conditional-row-style.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
