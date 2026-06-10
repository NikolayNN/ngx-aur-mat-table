import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxAurMatTableComponent } from './ngx-aur-mat-table.component';
import { NgxAurMatTableModule } from './ngx-aur-mat-table.module';
import { TableConfig } from './model/ColumnConfig';

interface R { name: string; age: number; }

@Component({
  standalone: false,
  template: `<aur-mat-table #t [tableConfig]="cfg" [tableData]="data"></aur-mat-table>`,
})
class AlignHostComponent {
  @ViewChild('t') table!: NgxAurMatTableComponent<R>;
  cfg: TableConfig<R> = {
    columnsCfg: [
      { key: 'name', name: 'Name', valueConverter: v => v.name, align: 'left' },        // явный left = как без align
      { key: 'age', name: 'Age', valueConverter: v => v.age, align: 'right',
        sort: {}, totalConverter: rows => rows.length },                            // right + sortable + total
      { key: 'mid', name: 'Mid', valueConverter: v => v.name, align: 'center' },
    ],
    indexCfg: { enable: true, align: 'center' },
  };
  data: R[] = [{ name: 'a', age: 1 }];
}

describe('NgxAurMatTable column align', () => {
  let fixture: ComponentFixture<AlignHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAurMatTableModule, NoopAnimationsModule],
      declarations: [AlignHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AlignHostComponent);
    fixture.detectChanges();
  });

  // порядок колонок: [0]=tbl_index, [1]=name, [2]=age, [3]=mid
  function headerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('th.mat-mdc-header-cell'));
  }
  function bodyCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row] td'));
  }
  function footerCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tr[mat-footer-row] td'));
  }

  it('right-колонка: th/td/footer-td несут aur-align-right (th — сортируемый)', () => {
    expect(headerCells()[2].classList.contains('aur-align-right')).toBeTrue();
    expect(bodyCells()[2].classList.contains('aur-align-right')).toBeTrue();
    expect(footerCells()[2].classList.contains('aur-align-right')).toBeTrue();
  });

  it('center-колонка: th/td/footer-td несут aur-align-center', () => {
    expect(headerCells()[3].classList.contains('aur-align-center')).toBeTrue();
    expect(bodyCells()[3].classList.contains('aur-align-center')).toBeTrue();
    expect(footerCells()[3].classList.contains('aur-align-center')).toBeTrue();
  });

  it('left/не задан — классов выравнивания нет', () => {
    expect(headerCells()[1].classList.contains('aur-align-center')).toBeFalse();
    expect(headerCells()[1].classList.contains('aur-align-right')).toBeFalse();
    expect(bodyCells()[1].classList.contains('aur-align-center')).toBeFalse();
    expect(bodyCells()[1].classList.contains('aur-align-right')).toBeFalse();
  });

  it('индексная колонка выравнивается из indexCfg.align', () => {
    expect(headerCells()[0].classList.contains('aur-align-center')).toBeTrue();
    expect(bodyCells()[0].classList.contains('aur-align-center')).toBeTrue();
    expect(footerCells()[0].classList.contains('aur-align-center')).toBeTrue();
  });
});
