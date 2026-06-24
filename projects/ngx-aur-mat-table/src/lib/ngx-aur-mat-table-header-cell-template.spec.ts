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
