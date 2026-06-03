import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface Row { name: string; bold?: boolean; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    clickCfg: { pointer: true, highlightClicked: { background: 'yellow' } },
    rowStyleCfg: {
      style: r => r.rowSrc.bold ? { fontWeight: 'bold', color: 'black' } : {},
      class: r => r.rowSrc.bold ? 'total not-hover' : null,
    },
  };
  data: Row[] = [{ name: 'a', bold: true }, { name: 'b' }];
}

describe('NgxAurMatTable rowStyleCfg', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('applies the style hook to the bold row only', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgStyle(boldRow)['font-weight']).toBe('bold');
    expect(host.table.rowNgStyle(boldRow)['color']).toBe('black');
    expect(host.table.rowNgStyle(plainRow)['font-weight']).toBeUndefined();
  });

  it('applies the class hook to the bold row, alongside pointer', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgClass(boldRow)['total not-hover']).toBeTrue();
    expect(host.table.rowNgClass(boldRow)['pointer']).toBeTrue();
    expect(host.table.rowNgClass(plainRow)['total not-hover']).toBeUndefined();
    expect(host.table.rowNgClass(plainRow)['pointer']).toBeTrue();
  });

  it('lets highlightClicked override the base style per-property on the highlighted row', () => {
    const [boldRow] = host.table.tableDataSource.data;
    host.table.highlighted = boldRow.rowSrc;
    const style = host.table.rowNgStyle(boldRow);
    expect(style['background-color']).toBe('yellow'); // from highlightClicked
    expect(style['font-weight']).toBe('bold');         // base preserved (highlight didn't set it)
  });

  it('renders the inline font-weight on the bold row <tr>', () => {
    const rowEls = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLElement>;
    expect(rowEls.length).toBe(2);
    expect(rowEls[0].style.fontWeight).toBe('bold');
    expect(rowEls[1].style.fontWeight).toBe('');
  });
});

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PlainHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<Row>;
  cfg: TableConfig<Row> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: Row[] = [{ name: 'a' }];
}

describe('NgxAurMatTable rowStyleCfg absent (back-compat)', () => {
  let fixture: ComponentFixture<PlainHostComponent>;
  let host: PlainHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [PlainHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PlainHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('produces empty inline style and only the default classes', () => {
    const [row] = host.table.tableDataSource.data;
    expect(host.table.rowNgStyle(row)).toEqual({});
    expect(host.table.rowNgClass(row)).toEqual({ 'pointer': false, 'new-color': false });
  });
});
