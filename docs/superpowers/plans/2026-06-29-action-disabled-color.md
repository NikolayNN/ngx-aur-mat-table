# Нейтральный disabled-стиль иконок действий — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** При `disabled` иконка action/пункта меню перестаёт навязывать свой `icon.color` и наследует нейтральный disabled-цвет Material (disabled-кнопка больше не выглядит активной).

**Architecture:** Презентационный хелпер `iconColorOf(el)` возвращает `el.disabled ? null : el.icon?.color`; в 5 точках шаблона `[style.color]` берётся через него. При disabled inline-цвет не ставится → `<mat-icon>` наследует disabled-цвет родительской кнопки/пункта. `ActionViewFactory` и тулбар выделения не трогаются. TDD: сначала спек на наличие/отсутствие inline-цвета (красный на текущем коде), затем хелпер + правки шаблона → зелёный.

**Tech Stack:** Angular 19.2 (компонент библиотеки `standalone:false`, `ChangeDetectionStrategy.OnPush`), Angular Material 18.2 (`mat-icon-button`, `mat-menu-item`, disabled-токены), Karma + Jasmine 3.10.

## Global Constraints

- Публичный API НЕ меняется (модель `Action`/`MenuItem`/`IconView` без правок; ни inputs/outputs). Это только fix отображения disabled.
- Angular pinned 19.x, Material 18.x; компонент остаётся `OnPush`.
- Хелпер `iconColorOf` принимает и `Action<string>`, и `MenuItem<string>` структурно: `{ disabled?: boolean; icon?: { color?: string } }` → `string | null`. `null` (не `undefined`) для явного «снять стиль».
- Охват — РОВНО 4 row-action иконки + 1 пункт меню (5 точек). Тулбар выделения (`selectionCfg.actions`, `<mat-icon>` рядом с кнопкой `(click)="emitSelectedRowsAction(...)"`, ~строка 208) **НЕ трогать** — там `disabled` не проброшен. НЕ использовать `replace_all` по `[style.color]="action.icon.color"` (5 совпадений, одно из них — тулбар выделения).
- Тесты — наличие/отсутствие inline `style.color` (НЕ вычисленный цвет): тема-/версия-независимо. Новые host-компоненты получают явные `selector` (избегаем NG0912, как в Spec A).
- Войдёт в minor 19.17.0 (с фиксом trackBy / Spec A) записью чейнджлога `fix`. Миграции нет.
- Ветка: `fix/19.17.0-actioncfg` (Spec A уже на ней; коммитим сюда же, не в master).

---

### Task 1: Спек на нейтральный цвет + хелпер `iconColorOf` + 5 точек шаблона

Один ревьюабельный юнит: спек воспроизводит «disabled-иконка остаётся цветной», затем хелпер + 5 правок шаблона делают её нейтральной. Красный→зелёный в одном коммите.

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-disabled.spec.ts` (дополнить новым describe + 3 host-компонента + helper `rowIcons`)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts` (новый метод `iconColorOf` после `isFeatureEnabled`, ≈ строка 873)
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html` (5 точек: ~267, ~281, ~289, ~307, ~316)

**Interfaces:**
- Consumes (публичный API, без изменений): `TableConfig<T>.actionCfg`; `Action` с `disabled?: (T)=>boolean`, `icon: { name:(T)=>string; color?:(T)=>string }`, `menu?: MenuItem[]`; `MenuItem` с `disabled?`, `icon?`.
- Produces: `NgxAurMatTableComponent.iconColorOf(el: { disabled?: boolean; icon?: { color?: string } }): string | null` (внутренний template-хелпер; не часть публичного API).

---

- [ ] **Step 1: Написать падающий спек (дополнить существующий файл)**

В КОНЕЦ `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-disabled.spec.ts` добавить (импорты `Component`, `TestBed`, `ComponentFixture`, `NoopAnimationsModule`, `NgxAurMatTableModule`, `TableConfig` и интерфейс `Row` уже есть в файле — новых импортов не требуется):

```ts
// ---------- disabled: нейтральный цвет иконки (Spec B) ----------

/** Все <mat-icon> в строках тела, в DOM-порядке. */
function rowIcons(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row mat-icon'));
}

@Component({
  selector: 'spec-disabled-color-direct-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DisabledColorDirectHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'edit',
          icon: { name: () => 'edit', color: () => 'red' },
          disabled: row => row.system,
        },
      ],
    },
  };
  // row0 system → disabled (цвет должен сняться); row1 → enabled (цвет на месте)
  data: Row[] = [{ name: 'a', system: true }, { name: 'b', system: false }];
}

@Component({
  selector: 'spec-disabled-color-menu-item-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DisabledColorMenuItemHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'more',
          icon: { name: () => 'more_vert' },
          menu: [
            { action: () => 'copy', text: () => 'Copy',
              icon: { name: () => 'content_copy', color: () => 'blue' } },
            { action: () => 'archive', text: () => 'Archive',
              icon: { name: () => 'archive', color: () => 'blue' },
              disabled: () => true },
          ],
        },
      ],
    },
  };
  data: Row[] = [{ name: 'a', system: false }];
}

@Component({
  selector: 'spec-disabled-color-trigger-host',
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class DisabledColorTriggerHostComponent {
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    actionCfg: {
      actions: [
        {
          action: () => 'more',
          icon: { name: () => 'more_vert', color: () => 'blue' },
          disabled: () => true,
          menu: [{ action: () => 'x', text: () => 'X' }],
        },
      ],
    },
  };
  data: Row[] = [{ name: 'a', system: false }];
}

describe('NgxAurMatTable action disabled — нейтральный цвет иконки', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [
        DisabledColorDirectHostComponent,
        DisabledColorMenuItemHostComponent,
        DisabledColorTriggerHostComponent,
      ],
    }).compileComponents();
  });

  it('прямое действие: при disabled inline-цвет снят, при enabled — сохранён', () => {
    const fixture = TestBed.createComponent(DisabledColorDirectHostComponent);
    fixture.detectChanges();
    const icons = rowIcons(fixture);
    expect(icons[0].style.color).toBe('');     // disabled → нейтральный (нет inline-цвета)
    expect(icons[1].style.color).toBe('red');  // enabled → цвет на месте
  });

  it('пункт меню: disabled-пункт без inline-цвета, enabled-пункт с цветом', () => {
    const fixture = TestBed.createComponent(DisabledColorMenuItemHostComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('tr.mat-mdc-row button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const items = Array.from(
      document.querySelectorAll('.mat-mdc-menu-panel button mat-icon')
    ) as HTMLElement[];
    expect(items[0].style.color).toBe('blue');  // enabled (copy)
    expect(items[1].style.color).toBe('');      // disabled (archive) → снят
  });

  it('кнопка-триггер меню: при disabled inline-цвет иконки триггера снят', () => {
    const fixture = TestBed.createComponent(DisabledColorTriggerHostComponent);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('tr.mat-mdc-row mat-icon') as HTMLElement;
    expect(icon.style.color).toBe('');
  });
});
```

- [ ] **Step 2: Запустить спек — убедиться, что он КРАСНЫЙ**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-action-disabled.spec.ts'
```
Expected: **3 FAILED** (три новых теста; существующие disabled-тесты файла проходят) на текущем коде —
- `прямое действие …`: `Expected 'red' to be ''.` (disabled-иконка всё ещё красная)
- `пункт меню …`: `Expected 'blue' to be ''.` (disabled-пункт archive всё ещё синий)
- `кнопка-триггер меню …`: `Expected 'blue' to be ''.` (disabled-триггер всё ещё синий)

- [ ] **Step 3: Добавить хелпер в `ngx-aur-mat-table.component.ts`**

Найти метод `isFeatureEnabled` (≈ строки 871-873) и добавить `iconColorOf` сразу после него.

Было:
```ts
  isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
    return isFeatureEnabledFn(cfg);
  }
```
Стало:
```ts
  isFeatureEnabled(cfg: { enable?: boolean } | null | undefined): boolean {
    return isFeatureEnabledFn(cfg);
  }

  /** Цвет иконки действия/пункта меню: при disabled — null, чтобы не перекрывать
   *  своим icon.color нейтральный disabled-цвет Material (иначе disabled-кнопка
   *  выглядит активной). Принимает и Action, и MenuItem (структурно). */
  iconColorOf(el: { disabled?: boolean; icon?: { color?: string } }): string | null {
    return el.disabled ? null : (el.icon?.color ?? null);
  }
```

- [ ] **Step 4: Заменить 5 точек в `ngx-aur-mat-table.component.html`**

Изменение в каждой точке одно и то же: выражение `[style.color]` начинает читать цвет через хелпер. Поскольку строка `[style.color]="action.icon.color"` встречается 5 раз (4 нужных + тулбар выделения), править ТОЧЕЧНО, по контексту кнопки — НЕ `replace_all`. Прочитать файл для точных отступов; в каждой из 4 row-action кнопок и в пункте меню поменять ТОЛЬКО атрибут `<mat-icon>`:

1. **Пункт меню** (~строка 267, уникальная строка `item.icon.color`):
   - `<mat-icon *ngIf="item.icon" [style.color]="item.icon.color">` → `<mat-icon *ngIf="item.icon" [style.color]="iconColorOf(item)">`

2. **Кнопка-триггер меню, ветка с тултипом** (~281): `<mat-icon>` внутри кнопки, у которой `[matMenuTriggerFor]="actionMenu"` стоит на ОТДЕЛЬНОЙ строке:
   - `<mat-icon [style.color]="action.icon.color">` → `<mat-icon [style.color]="iconColorOf(action)">`

3. **Кнопка-триггер меню, ветка без тултипа** (~289): `<mat-icon>` внутри кнопки `<button mat-icon-button [matMenuTriggerFor]="actionMenu"` (триггер на ТОЙ ЖЕ строке, что и `<button`):
   - `<mat-icon [style.color]="action.icon.color">` → `<mat-icon [style.color]="iconColorOf(action)">`

4. **Прямое действие, ветка с тултипом** (~307): `<mat-icon>` внутри `<span *ngIf="action.icon.tooltip; else directBtnPlain">` (кнопка с `(click)="emitRowAction(...)"`):
   - `<mat-icon [style.color]="action.icon.color">` → `<mat-icon [style.color]="iconColorOf(action)">`

5. **Прямое действие, ветка без тултипа** (~316): `<mat-icon>` внутри `<ng-template #directBtnPlain>` (кнопка с `(click)="emitRowAction(...)"`):
   - `<mat-icon [style.color]="action.icon.color">` → `<mat-icon [style.color]="iconColorOf(action)">`

Поскольку строки 4 и 5 (и их кнопки) идентичны локально, различать по обрамлению: №4 — внутри `<span [matTooltip]...>`, №5 — внутри `<ng-template #directBtnPlain>`. Использовать многострочный `old_string` с этим обрамлением, чтобы каждый Edit был однозначным.

**НЕ менять** `<mat-icon [style.color]="action.icon.color">` в тулбаре выделения — это кнопка с `(click)="emitSelectedRowsAction(...)"` (~строка 208). После правок в файле должно остаться РОВНО одно вхождение `action.icon.color` (в тулбаре выделения) и ни одного `item.icon.color`.

- [ ] **Step 5: Запустить спек — убедиться, что он ЗЕЛЁНЫЙ**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-action-disabled.spec.ts'
```
Expected: все тесты файла **SUCCESS** (0 failures), вывод чистый (без NG0912 — у новых хостов явные селекторы).

- [ ] **Step 6: Прогнать весь сьют библиотеки**

Run:
```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```
Expected: `TOTAL: 292 SUCCESS` (было 289 + 3 новых). Регрессий нет.
(Примечание: в общем прогоне может всплыть ПРЕД-СУЩЕСТВУЮЩИЙ NG0912 от `EnabledHostComponent`/`BareHostComponent` в ДРУГОМ спеке — он не из этой задачи, игнорировать.)

- [ ] **Step 7: Коммит**

```bash
git add projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-action-disabled.spec.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.ts \
        projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html
git commit -F - <<'EOF'
fix(table): disabled-действия получают нейтральный цвет иконки

Inline icon.color перекрывал Material-оформление disabled → disabled-кнопка/
пункт меню выглядели активными. Хелпер iconColorOf(el)=el.disabled?null:el.icon?.color
в 5 точках шаблона (4 кнопки действий + пункт меню): при disabled цвет не
ставится, иконка наследует нейтральный disabled-цвет Material. Фабрика и тулбар
выделения не тронуты. Отзыв #2 батча actionCfg (19.17.0).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
```

---

## Self-Review

**1. Spec coverage** (против `docs/superpowers/specs/2026-06-29-action-disabled-color-design.md`):
- Решение M1 (хелпер `iconColorOf`, `disabled ? null : color`) → Step 3. ✓
- 5 точек шаблона (267/281/289/307/316) → Step 4, с точечными анкерами. ✓
- Тулбар выделения (208) не трогаем; фабрика не трогается → Step 4 (явный carve-out) + Global Constraints. ✓
- Тесты: контракт наличие/отсутствие inline `style.color`; кейсы прямое (disabled+enabled), пункт меню (disabled+enabled), триггер (disabled) → Step 1, 3 теста. ✓
- Явные селекторы хостов (NG0912) → Step 1 (selector на всех 3). ✓
- Edge: enabled → цвет как раньше (кейс с `'red'`/`'blue'` на enabled-элементах); пункт без icon → `*ngIf="item.icon"` (не зовём хелпер) — структурно покрыто шаблоном. ✓
- Версия/доки/changelog `fix` — на бампе (Spec A/релиз), вне этой задачи. ✓

**2. Placeholder scan:** полный код спека и хелпера; точные old→new для .ts; для .html — однозначные анкеры + единый токен-замена `action.icon.color`→`iconColorOf(action)` / `item.icon.color`→`iconColorOf(item)`, с явным запретом трогать тулбар выделения и `replace_all`. Команды и ожидаемый вывод заданы. Плейсхолдеров нет. ✓

**3. Type consistency:** `iconColorOf(el: { disabled?: boolean; icon?: { color?: string } }): string | null` — вызовы `iconColorOf(action)` и `iconColorOf(item)` совместимы структурно (`Action<string>`/`MenuItem<string>` оба имеют `disabled: boolean` и `icon?.color?: string` после резолва `ActionViewFactory`). Возврат `string | null` валиден для `[style.color]`. Хелпер не конфликтует с `trackByActionColumn` (Spec A) — другой метод. ✓
