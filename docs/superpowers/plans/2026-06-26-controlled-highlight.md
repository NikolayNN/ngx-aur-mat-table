# Controlled Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать подсветке строки собственный конфиг (`highlightCfg`), выделенный two-way контракт `[(highlightedRow)]`/`(highlightedRowChange)` и три режима владения (`row-click`/`controlled`/`manual`), не ломая текущее поведение.

**Architecture:** Зеркалим уже узаконенный для expanded-rows controlled-паттерн. `highlightCfg.mode` решает, кто владеет состоянием; `manual` развязывает подсветку от клика. Старый `[highlight]` + `HighlightContainer` и `clickCfg.{cancelable,styleCfg}` депрекейтятся с fallback + dev-warn. Additive: без `highlightCfg` поведение 1:1 как сегодня.

**Tech Stack:** Angular 19, TypeScript 5.8, Jasmine/Karma (ChromeHeadless), Angular Material.

## Global Constraints

- Библиотека: `projects/ngx-aur-mat-table` — версия поднимается `19.14.0` → `19.15.0` (minor, additive).
- Angular/Material peer floor: `^19.2.17` (не трогать).
- Никаких breaking changes: старые `[highlight]`, `HighlightContainer`, `clickCfg.cancelable`, `clickCfg.styleCfg` продолжают работать как fallback.
- Highlight остаётся reference-based по `rowSrc` (`=== row.rowSrc`); `trackBy` для highlight НЕ вводим.
- Все dev-warn только под `isDevMode()` (импорт уже есть, `ngx-aur-mat-table.component.ts:12`) и срабатывают один раз (булев флаг), т.к. резолверы зовутся пер-рендер.
- Сборка либы: `npm run build_lib`. Тесты: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`.
- Стиль коммитов проекта: `type(scope): subject` на русском (см. недавние коммиты).
- Спека: `docs/superpowers/specs/2026-06-25-controlled-highlight-design.md`.

---

## File Structure

- **`projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts`** — новые интерфейсы `HighlightConfig`/`HighlightStyleConfig`, поле `highlightCfg` на `BodyRowConfig`, `@deprecated` JSDoc на `clickCfg.cancelable`/`styleCfg`.
- **`projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts`** — новые `@Input() highlightedRow`/`@Output() highlightedRowChange`, резолверы `resolvedHighlightCancelable`/`resolvedHighlightStyleCfg`, переписанный `handleRowClick` (ветвление по mode), `syncHighlightFromInput`/`scrollHighlightedIntoView`, ветка `ngOnChanges`, dev-warns.
- **`projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts`** — НОВЫЙ файл тестов (растёт по задачам).
- **`projects/ngx-aur-mat-table/src/public-api.ts`** — экспорт новых типов, если в файле экспортируются интерфейсы конфига (проверить в Task 1).
- **`projects/aur-demo/src/app/table-highlight-clicked-row/*`** — миграция демо на controlled API.
- **`README.md`**, **`changelog/`** — документация.
- **`projects/ngx-aur-mat-table/package.json`** — bump версии.

---

### Task 1: Контракт типов + fallback стайлинга

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts:85-141`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts:932-961`
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts`
- Check/Modify (экспорт типов): `projects/ngx-aur-mat-table/src/public-api.ts`

**Interfaces:**
- Produces:
  - `HighlightConfig<T>` = `{ mode?: 'row-click'|'controlled'|'manual'; cancelable?: boolean; styleCfg?: HighlightStyleConfig<T> }`
  - `HighlightStyleConfig<T>` = `{ class?: RowValue<T, string|null>; style?: RowValue<T, StyleBuilder.Row|string> }`
  - `BodyRowConfig<T>.highlightCfg?: HighlightConfig<T>`
  - `private resolvedHighlightStyleCfg(): HighlightStyleConfig<T> | undefined` (возвращает `highlightCfg.styleCfg ?? clickCfg.styleCfg`)

- [ ] **Step 1: Написать падающий тест (fallback стайлинга)**

Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts`:

```ts
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { StyleBuilder } from './style-builder/style-builder';
import Row = StyleBuilder.Row;

interface R { name: string; }

/** Хост: highlightCfg.styleCfg задан И clickCfg.styleCfg задан — должен победить highlightCfg. */
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class StyleWinnerHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: {
      clickCfg: { styleCfg: { class: 'click-class', style: Row.builder().background('red') } },
      highlightCfg: { styleCfg: { class: 'hl-class', style: Row.builder().background('green') } },
    },
  };
  data: R[] = [{ name: 'a' }];
}

/** Хост: только clickCfg.styleCfg (legacy) — должен работать как fallback. */
@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class StyleFallbackHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { clickCfg: { styleCfg: { class: 'click-class', style: Row.builder().background('red') } } },
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable highlight — styling source', () => {
  function make<H>(type: new () => H): { fixture: ComponentFixture<H>; host: H } {
    const fixture = TestBed.createComponent(type);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, host };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [StyleWinnerHost, StyleFallbackHost],
    }).compileComponents();
  });

  it('highlightCfg.styleCfg побеждает clickCfg.styleCfg на подсвеченной строке', () => {
    const { host } = make(StyleWinnerHost);
    const [row] = host.table.tableDataSource.data;
    host.table.highlighted = row.rowSrc;
    expect(host.table.rowNgClass(row)['hl-class']).toBeTrue();
    expect(host.table.rowNgClass(row)['click-class']).toBeUndefined();
    expect(host.table.rowStyle(row)!).toContain('background: green;');
  });

  it('clickCfg.styleCfg работает как fallback при отсутствии highlightCfg.styleCfg', () => {
    const { host } = make(StyleFallbackHost);
    const [row] = host.table.tableDataSource.data;
    host.table.highlighted = row.rowSrc;
    expect(host.table.rowNgClass(row)['click-class']).toBeTrue();
    expect(host.table.rowStyle(row)!).toContain('background: red;');
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: FAIL — компиляция падает на `highlightCfg` (нет в типе `BodyRowConfig`).

- [ ] **Step 3: Добавить типы в `ColumnConfig.ts`**

В `ClickConfig` (`:85-108`) пометить два поля `@deprecated` (тело без изменений):

```ts
  /**
   * Стиль/класс, применяемый к кликнутой/подсвеченной строке.
   * Цвет текста ячеек при class задаётся селектором потребителя,
   * например `tr.my-highlight td { color: white; }`.
   * @deprecated Используйте highlightCfg.styleCfg. Поле работает как fallback и будет удалено в мажоре.
   */
  styleCfg?: ClickStyleConfig<T>;

  /**
   * По умолчанию false (от строки не зависит).
   * false: и первый, и второй клик испускают эту строку; выделение не сбрасывается.
   * true: первый клик испускает эту строку, второй клик испускает undefined; первый выделяет, второй снимает выделение.
   * @deprecated Используйте highlightCfg.cancelable. Поле работает как fallback и будет удалено в мажоре.
   */
  cancelable?: boolean;
```

В `BodyRowConfig<T>` (`:137-141`) добавить поле:

```ts
export interface BodyRowConfig<T> {
  clickCfg?: ClickConfig<T>;
  hoverCfg?: HoverConfig<T>;
  styleCfg?: BodyStyleConfig<T>;
  /** Подсветка строки: режим владения, cancelable, выделенный styling contract. */
  highlightCfg?: HighlightConfig<T>;
}
```

Сразу после `BodyRowConfig` добавить новые интерфейсы:

```ts
export interface HighlightConfig<T = any> {
  /**
   * Кто владеет состоянием подсветки.
   * 'row-click' (по умолчанию): таблица владеет, клик подсвечивает/снимает (текущее поведение).
   * 'controlled': источник правды — [highlightedRow]; клик шлёт (highlightedRowChange),
   *   контейнер применяет (см. two-way [(highlightedRow)]); highlighted не мутируется кликом.
   * 'manual': состояние только из [highlightedRow]; клик НЕ подсвечивает (rowClick всё равно летит).
   */
  mode?: 'row-click' | 'controlled' | 'manual';

  /**
   * По умолчанию false. Повторный клик по подсвеченной строке:
   * false — оставляет подсветку (эмит той же строки);
   * true — снимает подсветку (эмит null в row-click / запрос null в controlled).
   * В manual нерелевантно.
   */
  cancelable?: boolean;

  /** Выделенный styling contract подсвеченной строки. */
  styleCfg?: HighlightStyleConfig<T>;
}

export interface HighlightStyleConfig<T = any> {
  /** CSS-класс(ы) на подсвеченном <tr>; значение или (row) => значение. */
  class?: RowValue<T, string | null>;
  /** Инлайн-стиль; StyleBuilder.Row | строка, либо (row) => то же. */
  style?: RowValue<T, StyleBuilder.Row | string>;
}
```

- [ ] **Step 4: Добавить резолвер и переключить стайлинг в компоненте**

В `ngx-aur-mat-table.component.ts` импортировать новый тип в существующем import из `./model/ColumnConfig` (добавить `HighlightStyleConfig` к списку импортируемых типов).

Заменить `rowStyle` highlight-ветку (`:937-939`):

```ts
    if (this.highlighted === row.rowSrc) {
      const sc = this.resolvedHighlightStyleCfg();
      acc = this.mergeStyle(acc, this.resolveRow(sc?.style, row) ?? null);
    }
```

Заменить в `rowNgClass` строку `:945`:

```ts
    const click = this.resolvedHighlightStyleCfg();
```

(остальное тело `rowNgClass` — `click?.style`, `click?.class` — без изменений).

Добавить приватный метод рядом с `rowNgClass` (после `:961`):

```ts
  /** Источник highlight-стиля: highlightCfg.styleCfg, с fallback на устаревший clickCfg.styleCfg. */
  private resolvedHighlightStyleCfg(): HighlightStyleConfig<T> | undefined {
    return this.tableConfig.bodyRowCfg?.highlightCfg?.styleCfg
        ?? this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
  }
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: PASS (2 теста).

- [ ] **Step 6: Проверить экспорт типов**

Открыть `projects/ngx-aur-mat-table/src/public-api.ts`. Если оттуда реэкспортируются интерфейсы конфига (`TableConfig`, `BodyRowConfig` и т.п.) из `model/ColumnConfig`, убедиться, что `HighlightConfig`/`HighlightStyleConfig` тоже попадают в экспорт (обычно это `export * from './lib/model/ColumnConfig'` — тогда ничего не надо). Если экспорт точечный — добавить два новых имени.

- [ ] **Step 7: Сборка либы**

Run: `npm run build_lib`
Expected: компиляция без ошибок.

- [ ] **Step 8: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts \
        projects/ngx-aur-mat-table/src/public-api.ts
git commit -m "feat(table): highlightCfg.styleCfg + fallback на clickCfg.styleCfg"
```

---

### Task 2: Новый input/output + row-click эмиссия + cancelable fallback + scroll

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (после `:301`; `:320-393`; `:963-975`)
- Modify (test): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts`

**Interfaces:**
- Consumes: `HighlightConfig` (Task 1), `resolvedHighlightStyleCfg` (Task 1).
- Produces:
  - `@Input() highlightedRow: T | null` / `@Output() highlightedRowChange: EventEmitter<T | null>`
  - `private resolvedHighlightCancelable(): boolean` (= `highlightCfg.cancelable ?? clickCfg.cancelable ?? false`)
  - `private syncHighlightFromInput(): void`
  - `private scrollHighlightedIntoView(src: T): void`
  - `handleRowClick` теперь эмитит `highlightedRowChange` (режим row-click).

- [ ] **Step 1: Написать падающие тесты (row-click эмиссия, cancelable, seed)**

Добавить в `ngx-aur-mat-table-highlight.spec.ts` (новый хост + describe). Хост биндит новый input/output и собирает эмиты:

```ts
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlightedRow]="sel"
                   (highlightedRowChange)="hlChanges.push($event)"
                   (rowClick)="clicks.push($event)"></aur-mat-table>
  `,
})
class RowClickHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  sel: R | null = null;
  hlChanges: (R | null)[] = [];
  clicks: (R | undefined)[] = [];
  cancelable = false;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'row-click', cancelable: false } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}
```

```ts
describe('NgxAurMatTable highlight — row-click', () => {
  let fixture: ComponentFixture<RowClickHost>;
  let host: RowClickHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [RowClickHost],
    }).compileComponents();
    fixture = TestBed.createComponent(RowClickHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик подсвечивает, эмитит highlightedRowChange и rowClick', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBe(host.data[0]);
    expect(host.hlChanges).toEqual([host.data[0]]);
    expect(host.clicks).toEqual([host.data[0]]);
  });

  it('cancelable: повторный клик снимает подсветку, эмитит null / undefined', () => {
    host.cfg.bodyRowCfg!.highlightCfg!.cancelable = true;
    fixture.detectChanges();
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.hlChanges).toEqual([host.data[0], null]);
    expect(host.clicks).toEqual([host.data[0], undefined]);
  });

  it('[highlightedRow] сидит состояние только на первом изменении (row-click владеет дальше)', () => {
    host.sel = host.data[0];
    fixture.detectChanges();                    // firstChange -> seed
    expect(host.table.highlighted).toBe(host.data[0]);
    host.sel = host.data[1];
    fixture.detectChanges();                    // НЕ firstChange -> row-click игнорирует
    expect(host.table.highlighted).toBe(host.data[0]);
  });

  it('clickCfg.enable:false глушит клик (нет подсветки, нет эмитов)', () => {
    host.cfg.bodyRowCfg = { clickCfg: { enable: false }, highlightCfg: { mode: 'row-click' } };
    fixture.detectChanges();
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.hlChanges).toEqual([]);
    expect(host.clicks).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: FAIL — нет инпута `highlightedRow` (template binding error) / нет эмиссии.

- [ ] **Step 3: Добавить input/output**

В `ngx-aur-mat-table.component.ts` сразу после `@Input() highlight` (`:301`):

```ts
  @Input()  highlightedRow: T | null = null;
  @Output() highlightedRowChange = new EventEmitter<T | null>();
```

- [ ] **Step 4: Добавить резолвер cancelable + scroll-хелперы; отрефакторить handleHighlightChange**

Добавить рядом с `resolvedHighlightStyleCfg`:

```ts
  /** cancelable подсветки: highlightCfg.cancelable, с fallback на устаревший clickCfg.cancelable. */
  private resolvedHighlightCancelable(): boolean {
    return this.tableConfig.bodyRowCfg?.highlightCfg?.cancelable
        ?? this.tableConfig.bodyRowCfg?.clickCfg?.cancelable
        ?? false;
  }

  /** Применяет [highlightedRow] во внутреннее состояние (controlled/manual + первый seed row-click). */
  private syncHighlightFromInput(): void {
    this.highlighted = this.highlightedRow ?? undefined;
    if (this.highlighted !== undefined) this.scrollHighlightedIntoView(this.highlighted);
  }

  /** Прокрутка строки с данным rowSrc в видимую область (smooth/center). */
  private scrollHighlightedIntoView(src: T): void {
    const index = this.tableDataSource.data.findIndex(row => row.rowSrc === src);
    if (index >= 0) {
      this.rows?.toArray()[index]?.nativeElement.scrollIntoView({
        behavior: "smooth", block: "center", inline: "center",
      });
    }
  }
```

Заменить тело `handleHighlightChange` (`:378-393`) на использование общего scroll-хелпера:

```ts
  private handleHighlightChange(h: HighlightContainer<T>) {
    if (this.highlighted === h.value) {
      this.highlight = undefined;
      this.highlighted = undefined;
    } else {
      this.highlighted = h.value;
      this.scrollHighlightedIntoView(h.value);
    }
  }
```

- [ ] **Step 5: Добавить ветку ngOnChanges + эмиссию в handleRowClick**

В `ngOnChanges`, сразу после существующей ветки `highlight` (`:324-326`), добавить:

```ts
    if (changes['highlightedRow']) {
      const mode = this.tableConfig.bodyRowCfg?.highlightCfg?.mode ?? 'row-click';
      const authoritative = mode === 'controlled' || mode === 'manual';
      const firstSeed = mode === 'row-click' && !!changes['highlightedRow'].firstChange;
      if (authoritative || firstSeed) {
        this.syncHighlightFromInput();
      }
    }
```

Заменить тело `handleRowClick` (`:963-975`) — row-click путь с cancelable-fallback и новой эмиссией (ветки controlled/manual добавятся в Task 3):

```ts
  handleRowClick(row: TableRow<T>) {
    // clickCfg.enable: false — строка полностью неинтерактивна (Group 2 opt-out):
    // ни rowClick, ни highlight, ни авто-раскрытие. Покрывает и клавиатуру (handleRowKeydown делегирует сюда).
    if (this.tableConfig.bodyRowCfg?.clickCfg?.enable === false) return;

    const cancelable = this.resolvedHighlightCancelable();
    const src = row.rowSrc;
    const toggleOff = src === this.highlighted && cancelable;

    this.rowClick.emit(toggleOff ? undefined : src);
    this.highlighted = toggleOff ? undefined : src;
    this.highlightedRowChange.emit(this.highlighted ?? null);

    this.handleExpandOnClick(row);
  }
```

- [ ] **Step 6: Запустить тесты — убедиться, что проходят**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: PASS (Task 1 + Task 2 блоки).

- [ ] **Step 7: Регрессия — существующие highlight/row-style спеки зелёные**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS все (в т.ч. `ngx-aur-mat-table-row-style.spec.ts`, `...-expanded-rows.spec.ts`).

- [ ] **Step 8: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts
git commit -m "feat(table): [(highlightedRow)] + row-click эмиссия highlightedRowChange"
```

---

### Task 3: Режимы controlled и manual

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`handleRowClick`)
- Modify (test): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts`

**Interfaces:**
- Consumes: `highlightedRow`/`highlightedRowChange`, `resolvedHighlightCancelable`, `syncHighlightFromInput` (Task 2).
- Produces: `handleRowClick` с финальным ветвлением по `mode` (`manual` не подсвечивает; `controlled` не мутирует, эмитит запрос).

- [ ] **Step 1: Написать падающие тесты (controlled + manual)**

Добавить в `ngx-aur-mat-table-highlight.spec.ts` хост с two-way эхо и хост manual:

```ts
/** Controlled: контейнер владеет; эхо highlightedRowChange -> sel замыкает [(highlightedRow)]. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlightedRow]="sel"
                   (highlightedRowChange)="sel = $event; hlChanges.push($event)"
                   (rowClick)="clicks.push($event)"></aur-mat-table>
  `,
})
class ControlledHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  sel: R | null = null;
  hlChanges: (R | null)[] = [];
  clicks: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'controlled', cancelable: true } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

/** Manual: клик не подсвечивает; только [highlightedRow] управляет подсветкой. */
@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlightedRow]="sel"
                   (highlightedRowChange)="hlChanges.push($event)"
                   (rowClick)="clicks.push($event)"></aur-mat-table>
  `,
})
class ManualHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  sel: R | null = null;
  hlChanges: (R | null)[] = [];
  clicks: (R | undefined)[] = [];
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'manual' } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}
```

```ts
describe('NgxAurMatTable highlight — controlled', () => {
  let fixture: ComponentFixture<ControlledHost>;
  let host: ControlledHost;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ControlledHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ControlledHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик НЕ мутирует highlighted напрямую, а эмитит запрос; эхо замыкает цикл', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);            // эмит -> host.sel = data[0]
    expect(host.hlChanges).toEqual([host.data[0]]);
    fixture.detectChanges();                    // authoritative sync из [highlightedRow]
    expect(host.table.highlighted).toBe(host.data[0]);
  });

  it('[highlightedRow] авторитетен на каждое изменение', () => {
    host.sel = host.data[1];
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
    host.sel = null;
    fixture.detectChanges();
    expect(host.table.highlighted).toBeUndefined();
  });

  it('cancelable: повторный клик по подсвеченной эмитит null', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA); fixture.detectChanges();   // sel=data[0]
    host.table.handleRowClick(rowA); fixture.detectChanges();   // toggleOff -> null
    expect(host.hlChanges).toEqual([host.data[0], null]);
    expect(host.table.highlighted).toBeUndefined();
  });
});

describe('NgxAurMatTable highlight — manual', () => {
  let fixture: ComponentFixture<ManualHost>;
  let host: ManualHost;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ManualHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ManualHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('клик не подсвечивает и не эмитит highlightedRowChange, но rowClick летит', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    expect(host.table.highlighted).toBeUndefined();
    expect(host.hlChanges).toEqual([]);
    expect(host.clicks).toEqual([host.data[0]]);
  });

  it('только [highlightedRow] подсвечивает', () => {
    host.sel = host.data[1];
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: FAIL — controlled клик мутирует `highlighted` (нет ветвления), manual клик подсвечивает.

- [ ] **Step 3: Финальный handleRowClick с ветвлением по mode**

Заменить тело `handleRowClick` целиком:

```ts
  handleRowClick(row: TableRow<T>) {
    // clickCfg.enable: false — строка полностью неинтерактивна (Group 2 opt-out):
    // ни rowClick, ни highlight, ни авто-раскрытие. Покрывает и клавиатуру (handleRowKeydown делегирует сюда).
    if (this.tableConfig.bodyRowCfg?.clickCfg?.enable === false) return;

    const mode = this.tableConfig.bodyRowCfg?.highlightCfg?.mode ?? 'row-click';
    const cancelable = this.resolvedHighlightCancelable();
    const src = row.rowSrc;
    const toggleOff = src === this.highlighted && cancelable;

    if (mode === 'manual') {
      this.rowClick.emit(src);                 // только action-намерение; highlight не трогаем
      this.handleExpandOnClick(row);
      return;
    }

    this.rowClick.emit(toggleOff ? undefined : src);

    if (mode === 'controlled') {
      this.highlightedRowChange.emit(toggleOff ? null : src);   // запрос, без мутации
    } else {                                                    // row-click
      this.highlighted = toggleOff ? undefined : src;
      this.highlightedRowChange.emit(this.highlighted ?? null);
    }

    this.handleExpandOnClick(row);
  }
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: PASS (Task 1-3 блоки).

- [ ] **Step 5: Регрессия**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS все.

- [ ] **Step 6: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts
git commit -m "feat(table): режимы highlight controlled и manual"
```

---

### Task 4: Депрекейт `[highlight]`, конфликт входов, dev-warns

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (`:301` JSDoc; `ngOnChanges`; резолверы)
- Modify (test): `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts`

**Interfaces:**
- Consumes: резолверы и ngOnChanges-ветки из Task 1-2.
- Produces: dev-warn-once для `clickCfg.cancelable`, `clickCfg.styleCfg`, `[highlight]`, и конфликта `[highlight]`+`[highlightedRow]` (выигрывает `[highlightedRow]`).

- [ ] **Step 1: Написать падающие тесты (back-compat + warns + конфликт)**

Добавить в `ngx-aur-mat-table-highlight.spec.ts`. Хост с обоими входами:

```ts
import { HighlightContainer } from './ngx-aur-mat-table.component';

@Component({
  standalone: false,
  template: `
    <aur-mat-table #t [tableConfig]="cfg" [tableData]="data"
                   [highlight]="legacy"
                   [highlightedRow]="sel"></aur-mat-table>
  `,
})
class ConflictHost {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  legacy: HighlightContainer<R> | undefined;
  sel: R | null = null;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { mode: 'controlled' } },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}
```

```ts
describe('NgxAurMatTable highlight — депрекейты и конфликт', () => {
  let fixture: ComponentFixture<ConflictHost>;
  let host: ConflictHost;
  let warn: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ConflictHost],
    }).compileComponents();
    fixture = TestBed.createComponent(ConflictHost);
    host = fixture.componentInstance;
    warn = spyOn(console, 'warn');
    fixture.detectChanges();
  });

  it('старый [highlight] всё ещё подсвечивает (back-compat) и предупреждает один раз', () => {
    host.legacy = { value: host.data[0] };
    fixture.detectChanges();
    host.legacy = { value: host.data[1] };
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
    expect(warn.calls.allArgs().filter(a => String(a[0]).includes('[highlight]')).length).toBe(1);
  });

  it('при обоих входах выигрывает [highlightedRow]', () => {
    host.legacy = { value: host.data[0] };
    host.sel = host.data[1];
    fixture.detectChanges();
    expect(host.table.highlighted).toBe(host.data[1]);
  });
});

describe('NgxAurMatTable highlight — fallback clickCfg предупреждает', () => {
  @Component({
    standalone: false,
    template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
  })
  class LegacyClickHost {
    @ViewChild('t') table!: NgxAurMatTableComponent<R>;
    cfg: TableConfig<R> = {
      columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
      bodyRowCfg: { clickCfg: { cancelable: true, styleCfg: { class: 'click-class' } } },
    };
    data: R[] = [{ name: 'a' }];
  }

  let fixture: ComponentFixture<LegacyClickHost>;
  let host: LegacyClickHost;
  let warn: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [LegacyClickHost],
    }).compileComponents();
    fixture = TestBed.createComponent(LegacyClickHost);
    host = fixture.componentInstance;
    warn = spyOn(console, 'warn');
    fixture.detectChanges();
  });

  it('clickCfg.cancelable работает как fallback и предупреждает', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.handleRowClick(rowA);
    host.table.handleRowClick(rowA);            // cancelable -> снимется
    expect(host.table.highlighted).toBeUndefined();
    expect(warn.calls.allArgs().some(a => String(a[0]).includes('clickCfg.cancelable'))).toBeTrue();
  });

  it('clickCfg.styleCfg работает как fallback и предупреждает', () => {
    const [rowA] = host.table.tableDataSource.data;
    host.table.highlighted = rowA.rowSrc;
    expect(host.table.rowNgClass(rowA)['click-class']).toBeTrue();
    expect(warn.calls.allArgs().some(a => String(a[0]).includes('clickCfg.styleCfg'))).toBeTrue();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: FAIL — варнингов нет; при обоих входах `highlighted` может оказаться `data[0]` (порядок), нет dev-warn.

- [ ] **Step 3: Добавить флаги и dev-warns в резолверы**

Добавить приватные поля рядом с `highlighted` (`:284`):

```ts
  private _warnedClickCancelable = false;
  private _warnedClickStyleCfg = false;
  private _warnedHighlightInput = false;
```

Заменить `resolvedHighlightCancelable` на версию с предупреждением:

```ts
  private resolvedHighlightCancelable(): boolean {
    const hl = this.tableConfig.bodyRowCfg?.highlightCfg?.cancelable;
    const click = this.tableConfig.bodyRowCfg?.clickCfg?.cancelable;
    if (hl === undefined && click !== undefined) {
      if (isDevMode() && !this._warnedClickCancelable) {
        this._warnedClickCancelable = true;
        console.warn('[aur-mat-table] clickCfg.cancelable устарел — используйте highlightCfg.cancelable.');
      }
      return click;
    }
    return hl ?? false;
  }
```

Заменить `resolvedHighlightStyleCfg` на версию с предупреждением:

```ts
  private resolvedHighlightStyleCfg(): HighlightStyleConfig<T> | undefined {
    const hl = this.tableConfig.bodyRowCfg?.highlightCfg?.styleCfg;
    const click = this.tableConfig.bodyRowCfg?.clickCfg?.styleCfg;
    if (!hl && click) {
      if (isDevMode() && !this._warnedClickStyleCfg) {
        this._warnedClickStyleCfg = true;
        console.warn('[aur-mat-table] clickCfg.styleCfg устарел — используйте highlightCfg.styleCfg.');
      }
      return click;
    }
    return hl;
  }
```

- [ ] **Step 4: Депрекейт `[highlight]` (JSDoc + warn) и разрешение конфликта в ngOnChanges**

Заменить JSDoc-коммент над `@Input() highlight` (`:299-301`):

```ts
  //Значение передаётся в контейнере, иначе OnChange не видит изменений, когда передаются одинаковые значения, и подсветка строки не отключается
  /** @deprecated Используйте [(highlightedRow)] (controlled) или [highlightedRow] (row-click seed). Поле работает и будет удалено в мажоре. */
  // @ts-ignore
  @Input() highlight: HighlightContainer<T> | undefined;
```

Обновить ветку `highlight` в `ngOnChanges` (`:324-326`) — предупредить один раз о депрекейте и пропустить применение, если в этом же цикле пришёл `[highlightedRow]` (тот побеждает):

```ts
    if (changes['highlight'] && this.highlight) {
      if (isDevMode() && !this._warnedHighlightInput) {
        this._warnedHighlightInput = true;
        console.warn('[aur-mat-table] [highlight] устарел — используйте [(highlightedRow)].');
      }
      if (!changes['highlightedRow']) {        // конфликт: [highlightedRow] авторитетнее
        this.handleHighlightChange(this.highlight);
      }
    }
```

(Ветка `highlightedRow` стоит ниже и применяет состояние сама — поэтому при обоих входах выигрывает `[highlightedRow]`.)

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-highlight.spec.ts'`
Expected: PASS все блоки highlight-спеки.

- [ ] **Step 6: Регрессия (особенно `[highlight]`-зависимые спеки)**

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS все (включая `...-expanded-rows.spec.ts`, использующий `[highlight]`).

- [ ] **Step 7: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-highlight.spec.ts
git commit -m "feat(table): депрекейт [highlight]/clickCfg + конфликт-резолюция входов"
```

---

### Task 5: Демо, README, changelog, bump версии

**Files:**
- Modify: `projects/aur-demo/src/app/table-highlight-clicked-row/table-highlight-clicked-row.component.ts`
- Modify: `projects/aur-demo/src/app/table-highlight-clicked-row/table-highlight-clicked-row.component.html`
- Modify: `README.md`
- Create: `changelog/19.15.0.md` (+ обновить индекс) — через скилл `writing-changelog`
- Modify: `projects/ngx-aur-mat-table/package.json:3`

**Interfaces:**
- Consumes: весь публичный контракт из Task 1-4.

- [ ] **Step 1: Мигрировать демо на controlled API**

Заменить `table-highlight-clicked-row.component.ts` (убрать `HighlightContainer`, перейти на `[(highlightedRow)]` + `mode:'controlled'`):

```ts
import {Component} from '@angular/core';
import {StyleBuilder, TableConfig} from "ngx-aur-mat-table";
import {Customer} from "../shared/model/customer";
import {CustomerGenerator} from "../shared/generator/CustomerGenerator";

@Component({
    selector: 'app-table-highlight-clicked-row',
    templateUrl: './table-highlight-clicked-row.component.html',
    styleUrls: ['./table-highlight-clicked-row.component.scss'],
    standalone: false
})
export class TableHighlightClickedRowComponent {

  highlightedCustomer: Customer | null = null;

  tableConfig: TableConfig<Customer> = {
    columnsCfg: [
      { name: 'customers name', key: 'name', valueConverter: v => v.name },
      { name: 'customers age', key: 'age', valueConverter: v => v.age },
    ],
    bodyRowCfg: {
      highlightCfg: {
        mode: 'controlled',
        cancelable: true,
        styleCfg: {
          style: StyleBuilder.Row.builder()
            .background('blue').color('red')
            .border(b => b.allBorders('2px', StyleBuilder.BorderStyle.SOLID, 'green')),
        },
      },
      hoverCfg: { pointer: true },
    },
    stickyCfg: { header: true }
  }
  tableData: Customer[] = CustomerGenerator.generate(30);
}
```

Заменить `table-highlight-clicked-row.component.html` (two-way + чипы как внешний источник):

```html
<div>
  Управляемый highlight (mode: 'controlled'): подсветка — внешнее состояние,
  клик по строке и клик по чипу меняют его через [(highlightedRow)].
</div>

<aur-mat-table
  class="limit-size"
  [tableData]="tableData"
  [tableConfig]="tableConfig"
  [(highlightedRow)]="highlightedCustomer"
></aur-mat-table>

<mat-chip-listbox>
  <mat-chip-option *ngFor="let customer of tableData" (click)="highlightedCustomer = customer"> {{customer.name}} </mat-chip-option>
</mat-chip-listbox>
```

- [ ] **Step 2: Проверить сборку демо**

Run: `npm run build`
Expected: демо-приложение собирается без ошибок (подтверждает, что публичный API экспортирован и типы сходятся в реальном потребителе).

- [ ] **Step 3: Обновить README**

В `README.md` найти секцию про `clickCfg`/подсветку (поиск по `clickCfg` или `highlight`). Добавить новую секцию «Управляемый highlight» с таблицей режимов и примером:

```markdown
### Управляемый highlight (`highlightCfg`)

Подсветка строки настраивается через `bodyRowCfg.highlightCfg` и поддерживает
two-way `[(highlightedRow)]`.

| mode | владелец | клик подсвечивает | `(highlightedRowChange)` | `(rowClick)` |
|---|---|---|---|---|
| `row-click` (default) | таблица | да | да | да |
| `controlled` | `[highlightedRow]` | нет (эмит-запрос) | да | да |
| `manual` | `[highlightedRow]` | нет | нет | да |

```html
<aur-mat-table [tableConfig]="cfg" [tableData]="data"
               [(highlightedRow)]="selected"></aur-mat-table>
```

```ts
bodyRowCfg: {
  highlightCfg: {
    mode: 'controlled',
    cancelable: true,
    styleCfg: { class: 'is-selected', style: Row.builder().background('blue') },
  },
}
```

> Устарело: `[highlight]`/`HighlightContainer`, `clickCfg.cancelable`, `clickCfg.styleCfg` —
> работают как fallback, переезжают в `highlightCfg`/`[(highlightedRow)]`, удаление в мажоре.
```

- [ ] **Step 4: Changelog 19.15.0**

Использовать скилл `writing-changelog` для записи `changelog/19.15.0.md` (формат Keep-a-Changelog, русский):
- **Добавлено:** `highlightCfg` (mode `row-click`/`controlled`/`manual`, `cancelable`, `styleCfg`); пара `[(highlightedRow)]`/`(highlightedRowChange)`.
- **Устарело:** `[highlight]`/`HighlightContainer`, `clickCfg.cancelable`, `clickCfg.styleCfg` (работают как fallback, удаление в мажоре).
Обновить индекс changelog.

- [ ] **Step 5: Bump версии**

В `projects/ngx-aur-mat-table/package.json:3` заменить `"version": "19.14.0"` на `"version": "19.15.0"`.

- [ ] **Step 6: Финальная верификация**

Run: `npm run build_lib`
Expected: чистая сборка.

Run: `ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`
Expected: PASS все тесты.

- [ ] **Step 7: Коммит**

```bash
git add projects/aur-demo/src/app/table-highlight-clicked-row/ README.md changelog/ \
        projects/ngx-aur-mat-table/package.json
git commit -m "docs(table): controlled highlight — демо, README, changelog 19.15.0"
```

---

## Self-Review

**1. Spec coverage:**
- Контракт типов (`HighlightConfig`/`HighlightStyleConfig`/`highlightCfg`) → Task 1. ✓
- `[(highlightedRow)]`/`(highlightedRowChange)` → Task 2. ✓
- Режимы row-click/controlled/manual → Task 2 (row-click) + Task 3 (controlled/manual). ✓
- cancelable по режимам + fallback на `clickCfg.cancelable` → Task 2 (fallback) + Task 4 (warn). ✓
- Стайлинг `highlightCfg.styleCfg ?? clickCfg.styleCfg` → Task 1 + Task 4 (warn). ✓
- ngOnChanges sync (authoritative / firstSeed) → Task 2. ✓
- scroll-into-view хардкод → Task 2 (`scrollHighlightedIntoView`). ✓
- Депрекейт `[highlight]` + конфликт входов → Task 4. ✓
- aria-current без изменений → не трогаем (нет задачи — корректно). ✓
- Тесты (11 групп спеки) → распределены по Task 1-4. ✓
- Демо/README/changelog/bump → Task 5. ✓
- Out of scope (Tier 2 multiple, Tier 3 breaking) → не планируется. ✓

**2. Placeholder scan:** нет TODO/TBD; весь код приведён целиком в шагах. ✓

**3. Type consistency:**
- `resolvedHighlightStyleCfg(): HighlightStyleConfig<T> | undefined` — одинаково в Task 1 (plain) и Task 4 (с warn). ✓
- `resolvedHighlightCancelable(): boolean` — Task 2 (plain) и Task 4 (с warn). ✓
- `highlightedRow: T | null` / `highlightedRowChange: EventEmitter<T | null>` — консистентно в Task 2-4. ✓
- `syncHighlightFromInput()`/`scrollHighlightedIntoView(src: T)` — определены Task 2, используются Task 2/4. ✓
- Флаги `_warnedClickCancelable`/`_warnedClickStyleCfg`/`_warnedHighlightInput` — введены Task 4, используются там же. ✓

Замечание для исполнителя: `handleRowClick` эволюционирует Task 2 → Task 3 (добавляются ветки mode). В каждом шаге тело приведено целиком — копировать показанную версию, а не дописывать поверх.
