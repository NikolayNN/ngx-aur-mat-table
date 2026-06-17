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
