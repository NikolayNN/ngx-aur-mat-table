import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';
import { StyleBuilder } from './style-builder/style-builder';
import Row = StyleBuilder.Row;
import FontWeight = StyleBuilder.FontWeight;

interface R { name: string; bold?: boolean; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: {
      highlightCfg: { styleCfg: { style: Row.builder().background('yellow'), class: 'row-selected' }, cancelable: true },
      hoverCfg: { pointer: true, styleCfg: { style: Row.builder().background('#eee'), class: 'hovering' } },
      styleCfg: {
        style: r => r.rowSrc.bold ? Row.builder().fontWeight(FontWeight.BOLD).color('black') : '',
        class: r => r.rowSrc.bold ? 'total not-hover' : null,
      },
    },
  };
  data: R[] = [{ name: 'a', bold: true }, { name: 'b' }];
}

describe('NgxAurMatTable bodyRowCfg', () => {
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

  it('applies the style hook to the bold row only (as a CSS string)', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowStyle(boldRow)).toContain('font-weight: bold;');
    expect(host.table.rowStyle(boldRow)).toContain('color: black;');
    expect(host.table.rowStyle(plainRow)).toBe('');
  });

  it('applies the class hook to the bold row, alongside pointer (from hoverCfg)', () => {
    const [boldRow, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowNgClass(boldRow)['total not-hover']).toBeTrue();
    expect(host.table.rowNgClass(boldRow)['pointer']).toBeTrue();
    expect(host.table.rowNgClass(plainRow)['total not-hover']).toBeUndefined();
    expect(host.table.rowNgClass(plainRow)['pointer']).toBeTrue();
  });

  it('layers the highlight overlay over the base per-property on the highlighted row', () => {
    const [boldRow] = host.table.tableDataSource.data;
    host.table.highlighted = boldRow.rowSrc;
    const style = host.table.rowStyle(boldRow)!;
    expect(style).toContain('background: yellow;'); // from highlightCfg.styleCfg.style
    expect(style).toContain('font-weight: bold;');  // base preserved
  });

  it('applies the hover overlay (style + class) only while the row is hovered', () => {
    const [, plainRow] = host.table.tableDataSource.data;
    expect(host.table.rowStyle(plainRow)).toBe('');
    expect(host.table.rowNgClass(plainRow)['hovering']).toBeUndefined();

    host.table.onRowEnter(plainRow);
    expect(host.table.rowStyle(plainRow)).toContain('background: #eee;');
    expect(host.table.rowNgClass(plainRow)['hovering']).toBeTrue();

    host.table.onRowLeave(plainRow);
    expect(host.table.rowStyle(plainRow)).toBe('');
    expect(host.table.rowNgClass(plainRow)['hovering']).toBeUndefined();
  });

  it('renders the inline font-weight on the bold row <tr>', () => {
    const rowEls = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLElement>;
    expect(rowEls.length).toBe(2);
    expect(rowEls[0].style.fontWeight).toBe('bold');
    expect(rowEls[1].style.fontWeight).toBe('');
  });

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
});

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class HeaderTotalHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name, totalConverter: rows => rows.length }],
    headerRowCfg: { styleCfg: { style: Row.builder().background('#ddd'), class: 'hdr' } },
    totalRowCfg: {
      enable: true,
      styleCfg: {
        style: totals => totals.get('name') >= 2 ? Row.builder().color('green') : Row.builder().color('red'),
        class: totals => totals.get('name') >= 2 ? 'many' : 'few',
      },
    },
  };
  data: R[] = [{ name: 'a' }, { name: 'b' }];
}

describe('NgxAurMatTable headerRowCfg / totalRowCfg', () => {
  let fixture: ComponentFixture<HeaderTotalHostComponent>;
  let host: HeaderTotalHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [HeaderTotalHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderTotalHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('resolves the static header style/class', () => {
    expect(host.table._headerStyle).toContain('background: #ddd;');
    expect(host.table._headerClass).toBe('hdr');
  });

  it('resolves the value-driven total style/class from the totals map', () => {
    expect(host.table._totalStyle).toContain('color: green;'); // 2 rows -> 'many'
    expect(host.table._totalClass).toBe('many');
  });
});

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class PlainHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable no row cfg (back-compat)', () => {
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

  it('produces null inline style and only the default classes', () => {
    const [row] = host.table.tableDataSource.data;
    expect(host.table.rowStyle(row)).toBeNull();
    expect(host.table.rowNgClass(row)).toEqual({ 'pointer': false, 'new-color': false });
    expect(host.table._headerStyle).toBeNull();
    expect(host.table._totalStyle).toBeNull();
  });
});

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class ClassOnlyHighlightHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [{ key: 'name', name: 'Name', valueConverter: v => v.name }],
    bodyRowCfg: { highlightCfg: { styleCfg: { class: 'row-selected' } } },
  };
  data: R[] = [{ name: 'a' }];
}

describe('NgxAurMatTable highlightCfg class-only (без style)', () => {
  let fixture: ComponentFixture<ClassOnlyHighlightHostComponent>;
  let host: ClassOnlyHighlightHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [ClassOnlyHighlightHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClassOnlyHighlightHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('класс ставится, new-color — нет (new-color привязан только к style)', () => {
    const [row] = host.table.tableDataSource.data;
    host.table.handleRowClick(row);
    const cls = host.table.rowNgClass(row);
    expect(cls['row-selected']).toBeTrue();
    expect(cls['new-color']).toBeFalse();
    expect(host.table.rowStyle(row)).toBeNull();
  });
});
