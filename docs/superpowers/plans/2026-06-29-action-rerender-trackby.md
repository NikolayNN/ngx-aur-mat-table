# Стабилизация action-колонок через `trackBy` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Action-колонки перестают показывать устаревшие/пустые ячейки при смене `[tableData]` — иконка/цвет/tooltip/код действия пересчитываются, ячейки наполняются при async-первой загрузке.

**Architecture:** Корень — `*ngFor` по `rowActionsProvider.columns` с `[matColumnDef]` без `trackBy`, тогда как провайдер пересоздаётся на каждую смену данных: новые идентичности `col` заставляют Angular пересоздавать `MatColumnDef`, а `MatTable` не перерисовывает уже отрисованные ячейки — они держат старый `col`. Фикс: `trackBy` по `col.columnName` (стабилен/уникален) переиспользует def и обновляет `col` на месте. TDD: сначала регрессионный спек, красный на текущем коде, затем 2-строчный фикс → зелёный.

**Tech Stack:** Angular 19.2 (standalone:false компонент библиотеки, `ChangeDetectionStrategy.OnPush`), Angular Material 18.2 (`MatTable`/`MatColumnDef`), Karma + Jasmine 3.10.

## Global Constraints

- Публичный API не меняется (ни модель, ни inputs/outputs) — это только fix рендера.
- Angular pinned 19.x, Material 18.x; компонент остаётся `OnPush`.
- Имя action-колонки стабильно и уникально: `RowActionProvider.resolveConfigs` (`providers/RowActionProvider.ts:46-65`) дедупит/отбрасывает коллизии ключей — поэтому `columnName` корректный ключ `trackBy`.
- Тесты по конвенции существующих спеков (`ngx-aur-mat-table-action-disabled.spec.ts`): host-компонент с `[tableConfig]`/`[tableData]`, `NgxAurMatTableModule` + `NoopAnimationsModule`, `declarations` (хосты `standalone:false`), селекторы `tr.mat-mdc-row` / `button` / `mat-icon`, описания `it(...)` на русском.
- Войдёт в следующий minor (вместе со Spec B), запись чейнджлога типа `fix`; миграции нет.
- Ветка: `fix/19.17.0-actioncfg` (уже создана; спека закоммичена).

---

### Task 1: Регрессионный спек + фикс `trackBy`

Один связный ревьюабельный юнит: тест воспроизводит оба бага (#1 динамическое обновление, #3 async-первая загрузка) + страж нескольких колонок, затем 2-строчный фикс делает их зелёными. Красный→зелёный в одном коммите.

**Files:**
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-rerender.spec.ts`
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (импорт строка 30; новый метод рядом с `trackByRow` ≈ строка 836)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (строка 242)

**Interfaces:**
- Consumes (публичный API, без изменений): `TableConfig<T>.actionCfg: ActionConfig<T> | ActionConfig<T>[]`; `Action.action: (T)=>string`, `Action.icon: IconView<(T)=>string>` (`name`/`color` — резолверы от строки); `@Input() tableConfig`, `@Input() tableData`, `@Output() rowAction: EventEmitter<{action:string; value:T}>`.
- Produces: `NgxAurMatTableComponent.trackByActionColumn = (index: number, col: ActionColumnView<T>) => string` (внутренний trackBy для шаблона; не часть публичного API).

---

- [ ] **Step 1: Написать падающий спек (воспроизводит #1, #3 и multi-column)**

Создать `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-rerender.spec.ts`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Rule { id: number; enabled: boolean; }

/** Все кнопки в строках тела (в этих тестах других кнопок в строках нет → это action-кнопки). */
function bodyButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row button'));
}

/** Тексты <mat-icon> в строках тела, в DOM-порядке. */
function bodyIconNames(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row mat-icon'))
    .map(el => (el as HTMLElement).textContent!.trim());
}

// #1 — действие со свойствами, зависящими от состояния строки
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"
                            (rowAction)="events.push($event)"></aur-mat-table>`,
})
class DynamicActionHostComponent {
  events: any[] = [];
  cfg: TableConfig<Rule> = {
    columnsCfg: [{ key: 'id', name: 'Id', valueConverter: r => r.id }],
    actionCfg: {
      actions: [{
        action: r => (r.enabled ? 'disable' : 'enable'),
        icon: {
          name: r => (r.enabled ? 'toggle_on' : 'toggle_off'),
          color: r => (r.enabled ? 'green' : 'gray'),
        },
      }],
    },
  };
  data: Rule[] = [{ id: 1, enabled: false }];
}

// #3 — первый рендер с пустыми данными, затем async-непустой массив
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class AsyncFirstLoadHostComponent {
  cfg: TableConfig<Rule> = {
    columnsCfg: [{ key: 'id', name: 'Id', valueConverter: r => r.id }],
    actionCfg: {
      actions: [
        { action: () => 'edit', icon: { name: () => 'edit' } },
        { action: () => 'delete', icon: { name: () => 'delete' } },
      ],
    },
  };
  data: Rule[] = [];
}

// Несколько action-колонок
@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class MultiActionColumnHostComponent {
  cfg: TableConfig<Rule> = {
    columnsCfg: [{ key: 'id', name: 'Id', valueConverter: r => r.id }],
    actionCfg: [
      { key: 'tbl_toggle', actions: [{ action: () => 't', icon: { name: r => (r.enabled ? 'toggle_on' : 'toggle_off') } }] },
      { key: 'tbl_star', actions: [{ action: () => 's', icon: { name: r => (r.enabled ? 'star' : 'star_border') } }] },
    ],
  };
  data: Rule[] = [{ id: 1, enabled: false }];
}

describe('NgxAurMatTable action re-render (trackBy)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [DynamicActionHostComponent, AsyncFirstLoadHostComponent, MultiActionColumnHostComponent],
    }).compileComponents();
  });

  it('#1 иконка/цвет/код действия пересчитываются при смене [tableData] новым объектом', () => {
    const fixture = TestBed.createComponent(DynamicActionHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    expect(bodyIconNames(fixture)).toEqual(['toggle_off']);

    host.data = [{ id: 1, enabled: true }];   // REST вернул новый массив с новым объектом
    fixture.detectChanges();

    expect(bodyIconNames(fixture)).toEqual(['toggle_on']);
    const icon = fixture.nativeElement.querySelector('tr.mat-mdc-row mat-icon') as HTMLElement;
    expect(icon.style.color).toBe('green');

    bodyButtons(fixture)[0].click();
    expect(host.events[host.events.length - 1]).toEqual({ action: 'disable', value: { id: 1, enabled: true } });
  });

  it('#3 action-кнопки появляются, когда непустой [tableData] приходит после пустого первого рендера', () => {
    const fixture = TestBed.createComponent(AsyncFirstLoadHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    expect(bodyButtons(fixture).length).toBe(0);

    host.data = [{ id: 1, enabled: false }, { id: 2, enabled: false }, { id: 3, enabled: false }];
    fixture.detectChanges();

    expect(bodyButtons(fixture).length).toBe(6);   // 3 строки × 2 действия
  });

  it('несколько action-колонок: обе пересчитываются при смене [tableData]', () => {
    const fixture = TestBed.createComponent(MultiActionColumnHostComponent);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    expect(bodyIconNames(fixture)).toEqual(['toggle_off', 'star_border']);

    host.data = [{ id: 1, enabled: true }];
    fixture.detectChanges();

    expect(bodyIconNames(fixture)).toEqual(['toggle_on', 'star']);
  });
});
```

- [ ] **Step 2: Запустить спек — убедиться, что он КРАСНЫЙ (баг воспроизведён)**

Run:
```bash
npm test -- ngx-aur-mat-table --include='**/ngx-aur-mat-table-action-rerender.spec.ts' --watch=false --browsers=ChromeHeadless
```
(`npm test --` форвардит аргументы в `ng test`; `--include` сужает прогон до нового спека.)

Expected: **3 FAILED** на текущем коде —
- `#1 …`: `Expected [ 'toggle_off' ] to equal [ 'toggle_on' ].`
- `#3 …`: `Expected 0 to be 6.`
- `несколько action-колонок …`: `Expected [ 'toggle_off', 'star_border' ] to equal [ 'toggle_on', 'star' ].`

(Если `--include` не поддержан окружением — временно пометить `fdescribe`, прогнать `npm test -- ngx-aur-mat-table --watch=false --browsers=ChromeHeadless`, затем вернуть `describe`.)

- [ ] **Step 3: Применить фикс — часть 1 (`ngx-aur-mat-table.component.ts`)**

Расширить импорт `RowActionProvider` (строка 30), добавив `ActionColumnView`.

Было:
```ts
import {ActionEvent, RowActionProvider, RowActionProviderDummy} from './providers/RowActionProvider';
```
Стало:
```ts
import {ActionColumnView, ActionEvent, RowActionProvider, RowActionProviderDummy} from './providers/RowActionProvider';
```

Добавить метод сразу после `trackByRow` (≈ строки 834-836).

Было:
```ts
  /** trackBy для всех дефов строк (row defs) таблицы: бизнес-ключ из конфига или ссылка на rowSrc. */
  trackByRow = (_: number, row: TableRow<T>): unknown =>
    this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;
```
Стало:
```ts
  /** trackBy для всех дефов строк (row defs) таблицы: бизнес-ключ из конфига или ссылка на rowSrc. */
  trackByRow = (_: number, row: TableRow<T>): unknown =>
    this.tableConfig.trackBy ? this.tableConfig.trackBy(row.rowSrc) : row.rowSrc;

  /** trackBy для *ngFor по action-колонкам: columnName стабилен/уникален (RowActionProvider
   *  дедупит ключи), поэтому MatColumnDef переиспользуется между сменами [tableData] —
   *  пересозданный провайдер обновляет col на месте, а не пересоздаёт def (иначе уже
   *  отрисованные ячейки держат старый col → устаревший/пустой actionView). Фикс #1 (иконки
   *  не обновляются) и #3 (пустые ячейки при async-первой загрузке). */
  trackByActionColumn = (_: number, col: ActionColumnView<T>): string => col.columnName;
```

- [ ] **Step 4: Применить фикс — часть 2 (`ngx-aur-mat-table.component.html`, строка 242)**

Было:
```html
        <ng-container *ngFor="let col of rowActionsProvider.columns" [matColumnDef]="col.columnName">
```
Стало:
```html
        <ng-container *ngFor="let col of rowActionsProvider.columns; trackBy: trackByActionColumn"
                      [matColumnDef]="col.columnName">
```

- [ ] **Step 5: Запустить спек — убедиться, что он ЗЕЛЁНЫЙ**

Run:
```bash
npm test -- ngx-aur-mat-table --include='**/ngx-aur-mat-table-action-rerender.spec.ts' --watch=false --browsers=ChromeHeadless
```
Expected: **Executed 3 of 3 SUCCESS** (0 failures).

- [ ] **Step 6: Прогнать весь сьют библиотеки — регрессия не пройдена**

Run:
```bash
npm test -- ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```
Expected: все спеки SUCCESS (особое внимание — существующие `*action*`/`*menu*`/`*multiple-action-columns*` спеки: 0 failures).

- [ ] **Step 7: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-rerender.spec.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -F - <<'EOF'
fix(table): action-колонки переиспользуют MatColumnDef через trackBy

*ngFor по rowActionsProvider.columns без trackBy + пересоздание провайдера
на смену [tableData] заставляли Angular пересоздавать MatColumnDef, а уже
отрисованные ячейки держали старый col → устаревший/пустой actionView.
trackBy по col.columnName переиспользует def и обновляет col на месте.

Фикс #1 (иконки/цвет/tooltip/код не обновлялись после смены состояния
строки) и #3 (пустые action-ячейки при async-первой загрузке). Регресс-спек
ngx-aur-mat-table-action-rerender.spec.ts (динамика, async-first, multi-column).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Self-Review

**1. Spec coverage** (против `docs/superpowers/specs/2026-06-29-action-rerender-trackby-design.md`):
- Корень/фикс #1 → Task 1 Steps 3-4 (trackBy) + тест `#1` (Step 1). ✓
- Корень/фикс #3 → те же правки + тест `#3 async-первая загрузка`. ✓
- `trackBy` по `columnName`, обоснование стабильности/уникальности → Step 3 (метод + JSDoc), Global Constraints. ✓
- Тесты по конвенции (host, модуль, селекторы, русский) → Step 1. ✓
- Несколько action-колонок (страж уникальности ключа) → тест multi-column. ✓
- Edge `RowActionProviderDummy` (пустой columns) → покрыт неявно: спеки с actionCfg всегда дают реальный провайдер; пустой случай безопасен (ngFor ничего не рисует, trackBy не зовётся) — отдельного теста не требует (нет действий = нет колонки). ✓
- Вне области (F2, #2 disabled-стиль) → не входит в задачи. ✓
- Версия/доки: changelog `fix` — делается на бампе (Spec B/релиз), не в этой задаче. ✓

**2. Placeholder scan:** код полон в каждом шаге (полный спек, точные old→new для .ts/.html), команды и ожидаемый вывод заданы. Плейсхолдеров нет. ✓

**3. Type consistency:** `trackByActionColumn = (_: number, col: ActionColumnView<T>): string` — `ActionColumnView` импортируется в Step 3 из `./providers/RowActionProvider` (там `export interface ActionColumnView<T>` со свойством `columnName: string`). Шаблонный `trackBy: trackByActionColumn` ссылается на тот же метод. Типы хостов (`Rule`), `TableConfig<Rule>`, резолверы `(Rule)=>string` согласованы с публичной моделью `Action`/`IconView`. ✓
