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
      { key: 'name', name: 'Name', valueConverter: v => v.name },
      { key: 'age', name: 'Age', valueConverter: v => v.age, align: 'left' },
      { key: 'city', name: 'City', valueConverter: v => v.city, align: 'right',
        totalConverter: rows => rows.length },
    ],
    indexCfg: { enable: true },
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
