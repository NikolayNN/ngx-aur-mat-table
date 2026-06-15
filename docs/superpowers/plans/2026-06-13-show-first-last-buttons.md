# paginationCfg.showFirstLastButtons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новое опциональное `PaginationConfig.showFirstLastButtons` (default `true`) управляет кнопками «в начало/в конец» встроенного пагинатора; биндинг напрямую к конфигу → смена ссылки `tableConfig` в рантайме скрывает/показывает кнопки без пересборки данных.

**Architecture:** Поле в `PaginationConfig` (контракт) + замена захардкоженного `showFirstLastButtons` на биндинг `[showFirstLastButtons]="tableConfig.paginationCfg?.showFirstLastButtons !== false"`. Код компонента не меняется. TDD: 2 красных + 1 пин (default).

**Tech Stack:** Angular 19, Jasmine + Karma (ChromeHeadless). Material 18 (классы `.mat-mdc-paginator-navigation-first` / `-last`).

**Спека:** `docs/superpowers/specs/2026-06-13-show-first-last-buttons-design.md`

**Контекст ветки:** `feat/19.7.0-feedback`, коммит на пункт. НЕ мержить. `public-api.ts` правки не требует.

---

### Task 1: Контракт + красный спек

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/model/ColumnConfig.ts` (интерфейс `PaginationConfig`, ~строка 292)
- Create: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-paginator-buttons.spec.ts`

- [ ] **Step 1.1: Поле в `PaginationConfig`.** Найти конец интерфейса:

```ts
  /** 'client' (по умолчанию) позволяет MatTableDataSource нарезать в памяти; 'server' использует pageSource / paginatorState. */
  mode?: 'client' | 'server';
}
```

заменить на:

```ts
  /** 'client' (по умолчанию) позволяет MatTableDataSource нарезать в памяти; 'server' использует pageSource / paginatorState. */
  mode?: 'client' | 'server';

  /**
   * Показывать кнопки «в начало/в конец» у встроенного пагинатора. По умолчанию true.
   * Биндится напрямую к конфигу — смена ССЫЛКИ на tableConfig в рантайме (например, по
   * брейкпоинту) скрывает/показывает кнопки без пересборки данных; мутация на месте не сработает.
   * На externalPaginator не влияет — им управляет хост.
   */
  showFirstLastButtons?: boolean;
}
```

- [ ] **Step 1.2: Создать спек** `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table-paginator-buttons.spec.ts`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; }

/** Базовый конфиг с включённой клиентской пагинацией; paginationCfg переопределяется через extra. */
function cfgWith(pagination: TableConfig<Row>['paginationCfg']): TableConfig<Row> {
  return {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    paginationCfg: pagination,
  };
}

function hasFirstLastButtons(fixture: ComponentFixture<unknown>): boolean {
  const first = fixture.nativeElement.querySelector('.mat-mdc-paginator-navigation-first');
  const last = fixture.nativeElement.querySelector('.mat-mdc-paginator-navigation-last');
  return !!first && !!last;
}

@Component({
  standalone: false,
  template: `<aur-mat-table [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PaginatorButtonsHostComponent {
  cfg: TableConfig<Row> = cfgWith({ enable: true, size: 5 });
  data: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: 'r' + i }));
}

describe('NgxAurMatTable paginator first/last buttons', () => {
  let fixture: ComponentFixture<PaginatorButtonsHostComponent>;
  let host: PaginatorButtonsHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PaginatorButtonsHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PaginatorButtonsHostComponent);
    host = fixture.componentInstance;
  });

  it('по умолчанию кнопки first/last показаны (пин текущего поведения)', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeTrue();
  }));

  it('showFirstLastButtons: false скрывает кнопки', fakeAsync(() => {
    host.cfg = cfgWith({ enable: true, size: 5, showFirstLastButtons: false });
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeFalse();
  }));

  it('смена ссылки tableConfig в рантайме переключает кнопки', fakeAsync(() => {
    host.cfg = cfgWith({ enable: true, size: 5, showFirstLastButtons: false });
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeFalse();

    // хост заменяет ССЫЛКУ на конфиг (как по брейкпоинту) — без пересборки данных
    host.cfg = cfgWith({ enable: true, size: 5, showFirstLastButtons: true });
    fixture.detectChanges();
    expect(hasFirstLastButtons(fixture)).toBeTrue();
  }));
});
```

- [ ] **Step 1.3: Красный прогон** только нового спека:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless --include='**/ngx-aur-mat-table-paginator-buttons.spec.ts'
```

Ожидание — 2 FAIL и 1 PASS:
- PASS «по умолчанию кнопки показаны» (атрибут сейчас захардкожен → пин зелёный);
- FAIL «showFirstLastButtons: false скрывает» (хардкод игнорирует конфиг → кнопки есть);
- FAIL «смена ссылки переключает» (стартует с `false`, но кнопки есть → первый assert падает).

Иное распределение — остановиться и разобраться, не подгонять.

---

### Task 2: Зелёный — биндинг в шаблоне

**Files:**
- Modify: `projects/ngx-aur-mat-table/src/lib/ngx-aur-mat-table.component.html:516`

- [ ] **Step 2.1: Биндинг.** Найти:

```html
                   (page)="onPageChangeInternal($event)"
                   showFirstLastButtons>
```

заменить на:

```html
                   (page)="onPageChangeInternal($event)"
                   [showFirstLastButtons]="tableConfig.paginationCfg?.showFirstLastButtons !== false">
```

- [ ] **Step 2.2: Зелёный прогон** того же спека (команда из Step 1.3). Ожидание: 3 PASS, 0 FAIL.

- [ ] **Step 2.3: Полный прогон**:

```bash
npx ng test ngx-aur-mat-table --watch=false --browsers=ChromeHeadless
```

Ожидание: **158 of 158 SUCCESS** (155 + 3 новых), 0 FAILED. Любое падение — разбираться, не подгонять.

---

### Task 3: README + коммит пункта

**Files:**
- Modify: `README.md` (~строка 111, после абзаца **Page data for the host:**)

- [ ] **Step 3.1: README.** Найти абзац:

```md
**Page data for the host:** `(pageLoaded)` emits `{ content, totalElements, pageIndex }` after each successfully applied page — handy for header counters and charts. `loadingChange` and `pageError` cover the rest of the load lifecycle.
```

и добавить ПОСЛЕ него отдельный абзац (пустая строка до и после):

```md
**First/last buttons:** `paginationCfg.showFirstLastButtons: false` hides the built-in paginator's jump-to-first/last buttons (default shown). Bound straight to the config, so swapping the `tableConfig` reference at runtime (e.g. on a breakpoint) toggles them without rebuilding data.
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
feat(pagination): paginationCfg.showFirstLastButtons

The built-in paginator's first/last buttons were hardcoded on; now
paginationCfg.showFirstLastButtons (default true) controls them. Bound
directly to tableConfig.paginationCfg rather than via PaginationProvider,
so swapping the config reference at runtime (e.g. a breakpoint observer)
toggles the buttons without a data rebuild. externalPaginator is owned by
the host and unaffected.
'@
```

После коммита `git show --stat HEAD`: ровно 4 файла — `model/ColumnConfig.ts`, `ngx-aur-mat-table.component.html`, `ngx-aur-mat-table-paginator-buttons.spec.ts`, `README.md`.

Changelog-запись — при бампе 19.7.0, не в этом коммите.
